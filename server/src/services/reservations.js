import mongoose from "mongoose";
import { createHash } from "node:crypto";
import { Hotel, Inventory } from "../models/index.js";
import {
  Tour,
  TourDeparture,
  Package,
  PackageDeparture,
  Quote,
  Reservation,
  ExchangeRateSnapshot,
} from "../models/travel.js";
import { ownTrip } from "./trips.js";
import {
  POLICY,
  range,
  localInstant,
  priceTotal,
  estimateINR,
  stayAmount,
  tourAmount,
} from "./travel-policy.js";
import { AppError, missing } from "../utils/errors.js";

const resources = {
  room: Inventory,
  tour: TourDeparture,
  package: PackageDeparture,
};
const transactionOptions = {
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
  maxCommitTimeMS: 10000,
};
export const fingerprint = (input) =>
  createHash("sha256").update(JSON.stringify(input)).digest("hex");
export function retryKey(req) {
  const key = req.get("Idempotency-Key");
  if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key))
    throw new AppError(
      400,
      "INVALID_RETRY_KEY",
      "Provide an Idempotency-Key of 16–100 letters, numbers, hyphens or underscores.",
    );
  return key;
}
function conflict(code, message) {
  return new AppError(409, code, message);
}

export async function createQuote(user, source, now = new Date()) {
  await reconcileExpired({ now });
  let stays = [],
    tours = [],
    trip,
    pkgDeparture,
    country,
    travelers = source.travelers;
  if (source.kind === "trip") {
    trip = await ownTrip(user, source.tripId);
    if (trip.revision !== source.revision)
      throw conflict(
        "REVISION_CONFLICT",
        "Reload the latest trip before reviewing.",
      );
    stays = trip.stays;
    country = trip.country;
    travelers = trip.travelers;
    for (const day of trip.days)
      for (const stop of day.stops.filter((s) => s.kind === "tour")) {
        if (!stop.departureId)
          throw conflict(
            "UNRESOLVED_TOUR",
            "Choose a departure for every selected tour.",
          );
        const departure = await TourDeparture.findOne({
          _id: stop.departureId,
          tour: stop.refId,
          date: day.date,
        });
        if (!departure)
          throw conflict(
            "INVALID_DEPARTURE",
            "A tour departure does not match its planned day.",
          );
        tours.push(departure.id);
      }
    for (const stay of stays)
      if (stay.checkIn < trip.startDate || stay.checkOut > trip.endDate)
        throw conflict(
          "STAY_OUTSIDE_TRIP",
          "Stay nights must fit within the trip dates.",
        );
  } else if (source.kind === "stay") stays = [source];
  else if (source.kind === "tour") tours = [source.departureId];
  else {
    pkgDeparture = await PackageDeparture.findById(source.departureId);
    if (!pkgDeparture) throw missing("Package departure");
    stays = pkgDeparture.stays;
    tours = pkgDeparture.tours.map(String);
    country = pkgDeparture.country;
  }
  const items = [],
    demands = [],
    staySpans = [],
    tourSpans = [];
  let currency;
  function match(record) {
    country ||= record.country;
    currency ||= record.currency;
    if (country !== record.country || currency !== record.currency)
      throw new AppError(
        400,
        "MIXED_COUNTRY",
        "Every item must use the same destination country and currency.",
      );
  }
  for (const selection of stays) {
    const hotel = await Hotel.findById(selection.hotelId);
    if (!hotel) throw missing("Stay");
    const room = hotel.roomTypes.id(selection.roomTypeId);
    if (!room) throw missing("Room type");
    match(hotel);
    const dates = range(selection.checkIn, selection.checkOut, {
      timezone: hotel.timezone,
      now,
    });
    const quantity = Math.ceil(travelers / room.capacity);
    if (
      staySpans.some(
        ([a, b]) => selection.checkIn < b && selection.checkOut > a,
      )
    )
      throw conflict(
        "STAY_OVERLAP",
        "Selected stays overlap. Choose one stay for each night.",
      );
    staySpans.push([selection.checkIn, selection.checkOut]);
    const startAt = localInstant(selection.checkIn, "15:00", hotel.timezone);
    const endAt = localInstant(selection.checkOut, "11:00", hotel.timezone);
    items.push({
      kind: "stay",
      refId: hotel.id,
      name: hotel.name,
      city: hotel.city,
      roomName: room.name,
      roomTypeId: room.id,
      quantity,
      checkIn: selection.checkIn,
      checkOut: selection.checkOut,
      startAt,
      endAt,
      timezone: hotel.timezone,
      amount: stayAmount(
        room.basePrice,
        dates.length,
        travelers,
        room.capacity,
      ),
      unitPrice: room.basePrice,
      nights: dates.length,
    });
    const rows = await Inventory.find({
      roomTypeId: room._id,
      date: { $in: dates.map((d) => new Date(d)) },
    });
    if (rows.length !== dates.length)
      throw conflict(
        "SOLD_OUT",
        `${hotel.name} has no inventory for one of these nights.`,
      );
    for (const row of rows)
      demands.push({ type: "room", id: row.id, quantity, name: hotel.name });
  }
  for (const id of tours) {
    const departure = await TourDeparture.findById(id);
    if (!departure) throw missing("Tour departure");
    const tour = await Tour.findById(departure.tour);
    if (!tour) throw missing("Tour");
    match(tour);
    if (departure.startAt <= now)
      throw conflict("DEPARTURE_STARTED", "Choose a future tour departure.");
    if (
      tourSpans.some(([a, b]) => departure.startAt < b && departure.endAt > a)
    )
      throw conflict(
        "TOUR_OVERLAP",
        "Selected tour times overlap. Choose another departure.",
      );
    tourSpans.push([departure.startAt, departure.endAt]);
    items.push({
      kind: "tour",
      refId: tour.id,
      departureId: departure.id,
      name: tour.name,
      city: tour.city,
      quantity: travelers,
      startAt: departure.startAt,
      endAt: departure.endAt,
      timezone: departure.timezone,
      amount: tourAmount(tour.price, travelers),
      unitPrice: tour.price,
    });
    demands.push({
      type: "tour",
      id: departure.id,
      quantity: travelers,
      name: tour.name,
    });
  }
  if (!items.length)
    throw new AppError(
      400,
      "NO_BOOKABLES",
      "Add a stay or scheduled tour before reserving. Attractions are informational.",
    );
  if (pkgDeparture) {
    const pkg = await Package.findById(pkgDeparture.package);
    demands.push({
      type: "package",
      id: pkgDeparture.id,
      quantity: travelers,
      name: pkg.name,
    });
  }
  const aggregate = new Map();
  for (const demand of demands) {
    const key = `${demand.type}:${demand.id}`;
    if (aggregate.has(key)) aggregate.get(key).quantity += demand.quantity;
    else aggregate.set(key, { ...demand });
  }
  const price = priceTotal(items, currency);
  price.inrEstimate = estimateINR(
    price.total,
    currency,
    await ExchangeRateSnapshot.findOne().sort({ date: -1 }).lean(),
    now,
  );
  const firstStart = new Date(
    Math.min(...items.map((i) => +new Date(i.startAt))),
  );
  if (firstStart <= now)
    throw conflict(
      "DEPARTURE_STARTED",
      "One of these items has already started.",
    );
  return Quote.create({
    user,
    source,
    ...(trip && { trip: trip._id, revision: trip.revision }),
    country,
    travelers,
    items,
    demands: [...aggregate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, d]) => d),
    price,
    firstStart,
    expiresAt: new Date(
      Math.min(+now + POLICY.quoteMinutes * 60000, +firstStart),
    ),
    cleanupAt: new Date(+now + 86400000),
  });
}

async function adjust(demands, from, to, session) {
  for (const demand of demands) {
    const query = { _id: demand.id };
    const increments = {};
    if (from) {
      query[from] = { $gte: demand.quantity };
      increments[from] = -demand.quantity;
    }
    if (to) increments[to] = demand.quantity;
    if (!from)
      query.$expr = {
        $lte: [
          { $add: ["$booked", { $ifNull: ["$held", 0] }, demand.quantity] },
          "$total",
        ],
      };
    const result = await resources[demand.type].updateOne(
      query,
      { $inc: increments },
      { session },
    );
    if (result.modifiedCount !== 1)
      throw new AppError(
        from ? 500 : 409,
        from ? "INVENTORY_INCONSISTENT" : "SOLD_OUT",
        from
          ? "Inventory could not be reconciled."
          : `${demand.name} is no longer available. Your draft is preserved.`,
      );
  }
}
function checkRetry(existing, hash) {
  if (existing.requestHash !== hash)
    throw conflict(
      "IDEMPOTENCY_CONFLICT",
      "This key was used with a different quote.",
    );
  return { reservation: existing, replayed: true };
}
export async function hold(user, quoteId, key, testNow) {
  const now = testNow || new Date();
  const hash = fingerprint({ quoteId });
  const identity = { user, idempotencyKey: key };
  await reconcileExpired({ now });
  let existing = await Reservation.findOne(identity);
  if (existing) return checkRetry(existing, hash);
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const retry = await Reservation.findOne(identity).session(session);
      if (retry) {
        result = checkRetry(retry, hash);
        return;
      }
      const quote = await Quote.findOne({ _id: quoteId, user }).session(
        session,
      );
      const now = testNow || new Date(); // Re-evaluate on every driver transaction retry.
      if (!quote) throw missing("Quote");
      if (quote.expiresAt <= now)
        throw conflict(
          "QUOTE_EXPIRED",
          "This quote expired. Review current availability and prices.",
        );
      if (quote.trip) {
        const trip = await ownTrip(user, quote.trip, session);
        if (trip.revision !== quote.revision)
          throw conflict(
            "REVISION_CONFLICT",
            "Your trip changed. Review a fresh quote.",
          );
        // A write fences concurrent autosave/deletion against this snapshot read.
        trip.reservationEpoch = (trip.reservationEpoch || 0) + 1;
        await trip.save({ session });
      }
      if (
        await Reservation.exists({ user, status: "pending" }).session(session)
      )
        throw conflict(
          "ACTIVE_HOLD",
          "Finish or release your existing hold first.",
        );
      await adjust(quote.demands, null, "held", session);
      const [reservation] = await Reservation.create(
        [
          {
            ...identity,
            quote: quote._id,
            ...(quote.trip && { trip: quote.trip }),
            source: quote.source,
            country: quote.country,
            travelers: quote.travelers,
            items: quote.items,
            demands: quote.demands,
            price: quote.price,
            firstStart: quote.firstStart,
            expiresAt: new Date(
              Math.min(+now + POLICY.holdMinutes * 60000, +quote.firstStart),
            ),
            status: "pending",
            requestHash: hash,
          },
        ],
        { session },
      );
      result = { reservation, replayed: false };
    }, transactionOptions);
    return result;
  } catch (err) {
    if (err.code === 11000) {
      existing = await Reservation.findOne(identity);
      if (existing) return checkRetry(existing, hash);
      throw conflict(
        "ACTIVE_RESERVATION",
        "An active hold or reservation already exists. Open your reservations to continue.",
      );
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

export async function transition(user, id, action, testNow) {
  const session = await mongoose.startSession();
  let result,
    expiredConfirmation = false;
  try {
    await session.withTransaction(async () => {
      expiredConfirmation = false;
      const reservation = await Reservation.findOne({
        _id: id,
        ...(user && { user }),
      }).session(session);
      const now = testNow || new Date();
      if (!reservation) throw missing("Reservation");
      if (reservation.status === "pending" && reservation.expiresAt <= now) {
        await adjust(reservation.demands, "held", null, session);
        reservation.status = "expired";
        expiredConfirmation = action === "confirm";
      } else if (action === "confirm") {
        if (reservation.status === "confirmed") {
          result = reservation;
          return;
        }
        if (reservation.status !== "pending")
          throw conflict(
            "HOLD_EXPIRED",
            "This hold is no longer active. Review a fresh quote.",
          );
        await adjust(reservation.demands, "held", "booked", session);
        reservation.status = "confirmed";
        reservation.confirmedAt = now;
      } else if (
        action === "cancel" &&
        ["pending", "confirmed"].includes(reservation.status)
      ) {
        if (reservation.status === "confirmed" && reservation.firstStart <= now)
          throw conflict(
            "CANCELLATION_CLOSED",
            "This reservation has started and can no longer be cancelled.",
          );
        await adjust(
          reservation.demands,
          reservation.status === "pending" ? "held" : "booked",
          null,
          session,
        );
        reservation.status = "cancelled";
        reservation.cancelledAt = now;
      }
      result = await reservation.save({ session });
    }, transactionOptions);
  } finally {
    await session.endSession();
  }
  if (expiredConfirmation)
    throw conflict(
      "HOLD_EXPIRED",
      "This hold expired. Your inventory was released; review a fresh quote.",
    );
  return result;
}
export async function reconcileExpired({
  now = new Date(),
  user,
  limit = 100,
} = {}) {
  const due = await Reservation.find({
    status: "pending",
    expiresAt: { $lte: now },
    ...(user && { user }),
  })
    .sort({ expiresAt: 1 })
    .limit(limit)
    .select("_id");
  for (const row of due) await transition(null, row._id, "expire", now);
  return due.length;
}
