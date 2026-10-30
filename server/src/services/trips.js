import { Trip, Reservation } from "../models/travel.js";
import mongoose from "mongoose";
import { countries, attractions, tourRecords } from "../seed/world.js";
import { range } from "./travel-policy.js";
import { AppError, missing } from "../utils/errors.js";
export function validateTrip(input) {
  if (!countries.some((c) => c.code === input.country))
    throw missing("Country");
  const keys = range(input.startDate, input.endDate, { inclusive: true });
  if (
    input.days.length !== keys.length ||
    input.days.some((d, i) => d.date !== keys[i])
  )
    throw new AppError(
      400,
      "INVALID_DAYS",
      "Every trip date must appear once, in order.",
    );
  const ids = new Set();
  for (const day of input.days)
    for (const stop of day.stops) {
      if (ids.has(stop.id))
        throw new AppError(
          400,
          "DUPLICATE_STOP",
          "Each stop needs a distinct identifier.",
        );
      ids.add(stop.id);
      const record =
        stop.kind === "attraction"
          ? attractions.find((a) => a.id === stop.refId)
          : tourRecords.find((t) => t._id === stop.refId);
      if (!record || record.country !== input.country)
        throw new AppError(
          400,
          "INVALID_STOP",
          "Choose stops in the trip country.",
        );
    }
  return input;
}
export async function ownTrip(user, id, session) {
  const trip = await Trip.findOne({ _id: id, user }).session(session || null);
  if (!trip) throw missing("Trip");
  return trip;
}
export async function saveTrip(user, id, input) {
  const { expectedRevision, ...draft } = input;
  validateTrip(draft);
  await ownTrip(user, id);
  const trip = await Trip.findOneAndUpdate(
    { _id: id, user, revision: expectedRevision },
    { $set: draft, $inc: { revision: 1 } },
    { new: true, runValidators: true },
  );
  if (!trip)
    throw new AppError(
      409,
      "REVISION_CONFLICT",
      "This trip changed in another tab. Reload it or save your edits as a copy.",
    );
  return trip;
}
export async function deleteTrip(user, id) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(
      async () => {
        await ownTrip(user, id, session);
        if (
          await Reservation.exists({
            trip: id,
            status: { $in: ["pending", "confirmed"] },
          }).session(session)
        )
          throw new AppError(
            409,
            "ACTIVE_RESERVATION",
            "Keep this trip while its reservation is active.",
          );
        await Trip.deleteOne({ _id: id, user }, { session });
      },
      { writeConcern: { w: "majority" } },
    );
  } finally {
    await session.endSession();
  }
}
