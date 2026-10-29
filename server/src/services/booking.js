import mongoose from "mongoose";
import { createHash } from "node:crypto";
import { Hotel, Inventory, Booking } from "../models/index.js";
import { stayDates } from "../utils/dates.js";
import { AppError, missing } from "../utils/errors.js";
export function calculatePrice(basePrice, nights, rooms) {
  const subtotal = basePrice * nights * rooms;
  // Educational flat 12% fee; not a representation of applicable hotel tax law.
  const tax = Math.round((subtotal * 12) / 100);
  return { subtotal, tax, total: subtotal + tax, currency: "INR", nights };
}
async function selection(hotelId, input, session) {
  const hotel = await Hotel.findById(hotelId).session(session || null);
  if (!hotel) throw missing("Hotel");
  const room = hotel.roomTypes.id(input.roomTypeId);
  if (!room) throw missing("Room type");
  if (input.guests > room.capacity * input.rooms)
    throw new AppError(
      400,
      "CAPACITY_EXCEEDED",
      "Select more rooms or fewer guests.",
    );
  const dates = stayDates(input.checkIn, input.checkOut);
  return {
    hotel,
    room,
    dates,
    price: calculatePrice(room.basePrice, dates.length, input.rooms),
  };
}
export async function availability(hotelId, input) {
  const { dates, price } = await selection(hotelId, input);
  const inventory = await Inventory.find({
    roomTypeId: input.roomTypeId,
    date: { $in: dates },
  }).lean();
  const remaining =
    inventory.length === dates.length
      ? Math.min(...inventory.map((i) => i.total - i.booked))
      : 0;
  return {
    available: remaining >= input.rooms,
    remaining,
    price,
    paymentMode: "simulated",
  };
}
function checkRetry(existing, hash) {
  if (existing.requestHash !== hash)
    throw new AppError(
      409,
      "IDEMPOTENCY_CONFLICT",
      "This retry key was already used for different booking details.",
    );
  return { booking: existing, replayed: true };
}
export async function reserve(userId, input, key) {
  const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const identity = { user: userId, idempotencyKey: key };
  const existing = await Booking.findOne(identity);
  if (existing) return checkRetry(existing, hash);
  const session = await mongoose.startSession();
  let result;
  try {
    // Driver retries transient write conflicts and ambiguous commit results.
    await session.withTransaction(
      async () => {
        const retry = await Booking.findOne(identity).session(session);
        if (retry) {
          result = checkRetry(retry, hash);
          return;
        }
        const { hotel, room, dates, price } = await selection(
          input.hotelId,
          input,
          session,
        );
        // Sequential writes within a transaction: do not use Promise.all here.
        for (const date of dates) {
          const update = await Inventory.updateOne(
            {
              roomTypeId: room._id,
              date,
              $expr: { $lte: [{ $add: ["$booked", input.rooms] }, "$total"] },
            },
            { $inc: { booked: input.rooms } },
            { session },
          );
          if (update.modifiedCount !== 1)
            throw new AppError(
              409,
              "SOLD_OUT",
              "These rooms are no longer available. Choose another stay.",
            );
        }
        const [booking] = await Booking.create(
          [
            {
              ...identity,
              hotel: hotel._id,
              roomTypeId: room._id,
              hotelName: hotel.name,
              city: hotel.city,
              roomName: room.name,
              checkIn: dates[0],
              checkOut: new Date(input.checkOut),
              rooms: input.rooms,
              guests: input.guests,
              price,
              requestHash: hash,
            },
          ],
          { session },
        );
        result = { booking, replayed: false };
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        maxCommitTimeMS: 10000,
      },
    );
    return result;
  } catch (err) {
    // Concurrent identical requests can race on the unique index.
    if (err.code === 11000) {
      const winner = await Booking.findOne(identity);
      if (winner) return checkRetry(winner, hash);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}
export async function cancel(userId, bookingId) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(
      async () => {
        const booking = await Booking.findOne({
          _id: bookingId,
          user: userId,
        }).session(session);
        if (!booking) throw missing("Booking");
        if (booking.status === "cancelled") {
          result = booking;
          return;
        }
        // Use persisted dates: historical cancellations must still release inventory.
        for (
          let date = +booking.checkIn;
          date < +booking.checkOut;
          date += 86400000
        ) {
          const update = await Inventory.updateOne(
            {
              roomTypeId: booking.roomTypeId,
              date: new Date(date),
              booked: { $gte: booking.rooms },
            },
            { $inc: { booked: -booking.rooms } },
            { session },
          );
          if (update.modifiedCount !== 1)
            throw new AppError(
              500,
              "INVENTORY_INCONSISTENT",
              "Cancellation could not complete. Please contact support.",
            );
        }
        booking.status = "cancelled";
        booking.cancelledAt = new Date();
        result = await booking.save({ session });
      },
      { writeConcern: { w: "majority" } },
    );
    return result;
  } finally {
    await session.endSession();
  }
}
