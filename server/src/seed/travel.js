import { Hotel, Inventory } from "../models/index.js";
import {
  Country,
  City,
  Attraction,
  Tour,
  TourDeparture,
  Template,
  Package,
  PackageDeparture,
} from "../models/travel.js";
import {
  countries,
  cities,
  attractions,
  hotelRecords,
  tourRecords,
  templates,
  packageRecords,
  stableId,
} from "./world.js";
import { seed } from "./seed.js";
import { addDays, dateKey } from "../../../shared/travel.js";
import { localInstant, localToday } from "../services/travel-policy.js";

async function upsertAll(Model, records, key, immutable = false) {
  for (const record of records) {
    const { _id, ...fields } = record;
    if (Number.isFinite(record.lat) && Number.isFinite(record.lng))
      fields.location = {
        type: "Point",
        coordinates: [record.lng, record.lat],
      };
    await Model.updateOne(
      { [key]: record[key] },
      immutable
        ? { $setOnInsert: { ...fields, ...(_id && { _id }) } }
        : { $set: fields, ...(_id && { $setOnInsert: { _id } }) },
      { upsert: true },
    );
  }
}
export async function seedTravel({ days = 365, now = new Date() } = {}) {
  await seed({ days: 0 });
  await upsertAll(Country, countries, "code");
  await upsertAll(City, cities, "id");
  await upsertAll(Attraction, attractions, "id");
  await upsertAll(Tour, tourRecords, "slug");
  await upsertAll(Template, templates, "id", true);
  await upsertAll(Package, packageRecords, "slug", true);
  for (const record of hotelRecords) {
    // Room IDs are versioned stable IDs. Never replace an existing room array.
    await Hotel.updateOne(
      { slug: record.slug },
      {
        $setOnInsert: {
          ...record,
          minPrice: Math.min(...record.roomTypes.map((r) => r.basePrice)),
        },
      },
      { upsert: true },
    );
  }
  await extendTravelInventory({ days, now });
  return {
    countries: countries.length,
    cities: cities.length,
    attractions: attractions.length,
    hotels: await Hotel.countDocuments(),
    tours: tourRecords.length,
    templates: templates.length,
    packages: packageRecords.length,
  };
}
export async function extendTravelInventory({
  days = 365,
  now = new Date(),
} = {}) {
  const hotels = await Hotel.find();
  for (const hotel of hotels) {
    const city = cities.find((c) => c.name === hotel.city);
    hotel.set({
      country: city.country,
      cityId: city.id,
      timezone: city.timezone,
      lat: hotel.lat ?? city.lat,
      lng: hotel.lng ?? city.lng,
      currency: countries.find((c) => c.code === city.country).currency,
      demo: true,
      location: {
        type: "Point",
        coordinates: [hotel.lng ?? city.lng, hotel.lat ?? city.lat],
      },
    });
    const today = localToday(city.timezone, now);
    const through = addDays(today, days - 1);
    const latest = await Inventory.findOne({ hotel: hotel._id })
      .sort({ date: -1 })
      .lean();
    const previous = hotel.inventoryThrough || (latest && dateKey(latest.date));
    const begin = previous && previous >= today ? addDays(previous, 1) : today;
    if (begin <= through) {
      const dates = [];
      for (let d = begin; d <= through; d = addDays(d, 1)) dates.push(d);
      await Inventory.bulkWrite(
        hotel.roomTypes.flatMap((room) =>
          dates.map((date) => ({
            updateOne: {
              filter: { roomTypeId: room._id, date: new Date(date) },
              update: {
                $setOnInsert: {
                  hotel: hotel._id,
                  total: room.totalInventory,
                  booked: 0,
                  held: 0,
                },
              },
              upsert: true,
            },
          })),
        ),
      );
    }
    // Missing historical rows remain missing (fail closed), not recreated as empty stock.
    hotel.inventoryThrough =
      previous && previous > through ? previous : through;
    await hotel.save();
  }
  await Inventory.updateMany(
    { held: { $exists: false } },
    { $set: { held: 0 } },
  );
  for (const tour of await Tour.find()) {
    const today = localToday(tour.timezone, now);
    const through = addDays(today, days - 1);
    const latest = await TourDeparture.findOne({ tour: tour._id })
      .sort({ date: -1 })
      .lean();
    const previous = tour.inventoryThrough || latest?.date;
    const dates = [];
    for (
      let date = previous && previous >= today ? addDays(previous, 1) : today;
      date <= through;
      date = addDays(date, 1)
    )
      dates.push(date);
    const rows = dates.map((date) => {
      const startAt = localInstant(date, tour.localStart, tour.timezone);
      return {
        updateOne: {
          filter: { tour: tour._id, date },
          update: {
            $setOnInsert: {
              _id: stableId(`departure-${tour.slug}-${date}`),
              country: tour.country,
              startAt,
              endAt: new Date(+startAt + tour.durationMinutes * 60000),
              timezone: tour.timezone,
              total: tour.total,
              booked: 0,
              held: 0,
            },
          },
          upsert: true,
        },
      };
    });
    if (rows.length) await TourDeparture.bulkWrite(rows);
    tour.inventoryThrough = previous && previous > through ? previous : through;
    await tour.save();
  }
  for (const pkg of await Package.find()) {
    const firstCity = cities.find((c) => c.id === pkg.days[0].cityId);
    const today = localToday(firstCity.timezone, now);
    for (let offset = 1; offset + pkg.durationDays < days; offset++) {
      const date = addDays(today, offset);
      if (new Date(date).getUTCDay() !== 1) continue; // Fixed Monday departures, independent of seed-run date.
      if (pkg.inventoryThrough && date <= pkg.inventoryThrough) continue;
      const stays = [];
      for (const [i, nights] of [
        [0, 2],
        [2, 1],
      ]) {
        const hotel = hotels.find((h) => h.cityId === pkg.days[i].cityId);
        stays.push({
          hotelId: hotel.id,
          roomTypeId: hotel.roomTypes[0].id,
          checkIn: addDays(date, i),
          checkOut: addDays(date, i + nights),
        });
      }
      const departures = [];
      for (const i of [0, 3]) {
        const tour = await Tour.findOne({ cityId: pkg.days[i].cityId }).sort({
          slug: 1,
        });
        const departure = await TourDeparture.findOne({
          tour: tour._id,
          date: addDays(date, i),
        });
        if (!departure)
          throw Error(
            "Package refers to missing tour inventory; repair is required, not regeneration.",
          );
        departures.push(departure._id);
      }
      const first = await TourDeparture.findById(departures[0]);
      await PackageDeparture.updateOne(
        { package: pkg._id, date },
        {
          $setOnInsert: {
            _id: stableId(`package-${pkg.slug}-${date}`),
            country: pkg.country,
            startAt: first.startAt,
            total: 12,
            booked: 0,
            held: 0,
            stays,
            tours: departures,
          },
        },
        { upsert: true },
      );
    }
    const through = addDays(today, days - pkg.durationDays - 1);
    pkg.inventoryThrough =
      pkg.inventoryThrough && pkg.inventoryThrough > through
        ? pkg.inventoryThrough
        : through;
    await pkg.save();
  }
  return {
    countries: countries.length,
    cities: cities.length,
    attractions: attractions.length,
    hotels: hotels.length,
    tours: tourRecords.length,
    templates: templates.length,
    packages: packageRecords.length,
  };
}
