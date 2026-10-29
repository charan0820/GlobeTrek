import { readFile } from "node:fs/promises";
import { Hotel, Inventory } from "../models/index.js";
import { DAY, utcToday } from "../utils/dates.js";
export async function seed({ days = 90, today = utcToday() } = {}) {
  const records = JSON.parse(
    await readFile(new URL("./hotels.json", import.meta.url), "utf8"),
  );
  const hotels = [];
  for (const record of records) {
    // Existing room IDs, prices and capacity stay stable; seeding never resets bookings.
    let hotel = await Hotel.findOne({ slug: record.slug });
    if (!hotel)
      hotel = await Hotel.create({
        ...record,
        minPrice: Math.min(...record.roomTypes.map((r) => r.basePrice)),
      });
    const operations = hotel.roomTypes.flatMap((room) =>
      Array.from({ length: days }, (_, day) => ({
        updateOne: {
          filter: { roomTypeId: room._id, date: new Date(+today + day * DAY) },
          update: {
            $setOnInsert: {
              hotel: hotel._id,
              total: room.totalInventory,
              booked: 0,
            },
          },
          upsert: true,
        },
      })),
    );
    await Inventory.bulkWrite(operations, { ordered: true });
    hotels.push(hotel);
  }
  const orphan = await Inventory.findOne({
    hotel: { $nin: hotels.map((h) => h._id) },
  });
  if (orphan)
    throw new Error(
      "Seed integrity failed: unexpected inventory hotel reference.",
    );
  return hotels;
}
