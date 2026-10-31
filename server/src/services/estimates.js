import { Hotel } from "../models/index.js";
import {
  Attraction,
  Tour,
  Template,
  Package,
  PackageDeparture,
  TourDeparture,
  ExchangeRateSnapshot,
} from "../models/travel.js";
import {
  range,
  priceTotal,
  estimateINR,
  stayAmount,
  tourAmount,
} from "./travel-policy.js";
const models = {
  stays: Hotel,
  tours: Tour,
  packages: Package,
  attractions: Attraction,
  templates: Template,
};
const incomplete = (selection, reason) => ({
  ...selection,
  estimated: true,
  missing: reason,
  total: null,
});

// Read-only: no quote documents, expiry reconciliation, or inventory writes.
export async function estimateSelections(
  { selections, travelers = 2 },
  now = new Date(),
) {
  const snapshot = await ExchangeRateSnapshot.findOne()
    .sort({ date: -1 })
    .lean();
  const output = [];
  const catalogs = new Map();
  for (const kind of new Set(selections.map((s) => s.kind))) {
    const key = ["attractions", "templates"].includes(kind) ? "id" : "_id";
    const records = await models[kind]
      .find({
        [key]: {
          $in: [
            ...new Set(
              selections.filter((s) => s.kind === kind).map((s) => s.id),
            ),
          ],
        },
      })
      .lean();
    catalogs.set(kind, new Map(records.map((r) => [String(r[key]), r])));
  }
  const selectedDepartures = await TourDeparture.find({
    _id: {
      $in: [
        ...new Set(
          selections
            .filter((s) => s.kind === "tours" && s.departureId)
            .map((s) => s.departureId),
        ),
      ],
    },
  }).lean();
  for (const selection of selections) {
    const { kind, id } = selection;
    const record = catalogs.get(kind).get(id);
    if (!record) {
      output.push(
        incomplete(selection, "This product is no longer available."),
      );
      continue;
    }
    if (kind === "attractions" || kind === "templates") {
      output.push({
        ...selection,
        informational:
          kind === "attractions"
            ? "Tickets not sold here"
            : "Free to copy · bookings extra",
      });
      continue;
    }
    let currency = record.currency,
      items = [],
      unitPrice,
      basis,
      assumptions,
      missing;
    if (kind === "stays") {
      const room = selection.roomTypeId
        ? record.roomTypes.find((r) => String(r._id) === selection.roomTypeId)
        : [...record.roomTypes].sort((a, b) => a.basePrice - b.basePrice)[0];
      if (!room) {
        output.push(incomplete(selection, "Choose an available room type."));
        continue;
      }
      unitPrice = room.basePrice;
      basis = "room / night";
      assumptions = {
        roomTypeId: String(room._id),
        roomName: room.name,
        rooms: Math.ceil(travelers / room.capacity),
        travelers,
      };
      if (selection.checkIn && selection.checkOut) {
        const nights = range(selection.checkIn, selection.checkOut, {
          timezone: record.timezone,
          now,
        }).length;
        items = [
          { amount: stayAmount(unitPrice, nights, travelers, room.capacity) },
        ];
        assumptions = {
          ...assumptions,
          nights,
          checkIn: selection.checkIn,
          checkOut: selection.checkOut,
        };
      } else
        missing = "Choose check-in and checkout dates for a stay estimate.";
    } else if (kind === "tours") {
      unitPrice = record.price;
      basis = "traveler";
      items = [{ amount: tourAmount(unitPrice, travelers) }];
      assumptions = {
        travelers,
        departureSelected: Boolean(selection.departureId),
      };
      if (selection.departureId) {
        const departure = selectedDepartures.find(
          (d) => String(d._id) === selection.departureId,
        );
        if (
          !departure ||
          String(departure.tour) !== id ||
          departure.startAt <= now ||
          (selection.expectedDate && departure.date !== selection.expectedDate)
        )
          missing =
            "Choose a future departure matching this tour and planned day.";
        else assumptions.date = departure.date;
      }
    } else {
      const departure = await PackageDeparture.findOne({
        package: record._id,
        startAt: { $gt: now },
        ...(selection.departureId && { _id: selection.departureId }),
      })
        .sort({ date: 1 })
        .lean();
      if (!departure) {
        output.push(
          incomplete(selection, "No future package departure is published."),
        );
        continue;
      }
      assumptions = {
        travelers,
        departureId: String(departure._id),
        date: departure.date,
        from: !selection.departureId,
        components: [],
      };
      for (const stay of departure.stays) {
        const hotel = await Hotel.findById(stay.hotelId).lean();
        const room = hotel?.roomTypes.find(
          (r) => String(r._id) === String(stay.roomTypeId),
        );
        if (!room) {
          missing = "A package component is unavailable.";
          break;
        }
        currency ||= hotel.currency;
        if (currency !== hotel.currency) {
          missing = "Package currencies do not match.";
          break;
        }
        const nights = range(stay.checkIn, stay.checkOut, {
          timezone: hotel.timezone,
          now,
        }).length;
        items.push({
          amount: stayAmount(room.basePrice, nights, travelers, room.capacity),
        });
        assumptions.components.push({
          name: hotel.name,
          nights,
          rooms: Math.ceil(travelers / room.capacity),
        });
      }
      const departures = await TourDeparture.find({
        _id: { $in: departure.tours },
      }).lean();
      if (departures.length !== departure.tours.length)
        missing = "A package tour is unavailable.";
      for (const dep of departures) {
        const tour = await Tour.findById(dep.tour).lean();
        if (!tour || tour.currency !== currency) {
          missing = "A package tour is unavailable.";
          break;
        }
        items.push({ amount: tourAmount(tour.price, travelers) });
        assumptions.components.push({ name: tour.name, travelers });
      }
      basis = "package";
    }
    const price = !missing && items.length ? priceTotal(items, currency) : null;
    output.push({
      ...selection,
      estimated: true,
      country: record.country,
      currency,
      unitPrice,
      basis,
      assumptions,
      ...(price || { total: null }),
      missing: missing || null,
      inrEstimate: price
        ? estimateINR(price.total, currency, snapshot, now)
        : null,
      availabilityGuaranteed: false,
    });
  }
  return output;
}

export async function tripEstimate(trip) {
  const selections = trip.stays.map((s) => ({
    kind: "stays",
    id: String(s.hotelId),
    roomTypeId: String(s.roomTypeId),
    checkIn: s.checkIn,
    checkOut: s.checkOut,
  }));
  for (const day of trip.days)
    for (const stop of day.stops)
      if (stop.kind === "tour")
        selections.push({
          kind: "tours",
          id: stop.refId,
          departureId: stop.departureId && String(stop.departureId),
          expectedDate: day.date,
        });
  if (!selections.length)
    return {
      total: null,
      missing: "No bookable stays or tours selected.",
      incomplete: true,
    };
  try {
    const rows = await estimateSelections({
      selections,
      travelers: trip.travelers,
    });
    const currencies = new Set(rows.map((r) => r.currency).filter(Boolean));
    if (
      currencies.size !== 1 ||
      rows.some((row) => row.country && row.country !== trip.country)
    )
      return {
        total: null,
        missing: "Some destination prices are unavailable.",
        incomplete: true,
      };
    const price = priceTotal(
      rows.filter((r) => r.total !== null).map((r) => ({ amount: r.subtotal })),
      [...currencies][0],
    );
    return {
      ...price,
      inrEstimate: estimateINR(
        price.total,
        price.currency,
        await ExchangeRateSnapshot.findOne().sort({ date: -1 }).lean(),
      ),
      estimated: true,
      incomplete: rows.some(
        (r) => r.missing || (r.kind === "tours" && !r.departureId),
      ),
      missing: rows
        .filter((r) => r.missing)
        .map((r) => r.missing)
        .join(" "),
      availabilityGuaranteed: false,
    };
  } catch {
    return {
      total: null,
      incomplete: true,
      missing: "Update the dates or product selections to estimate this trip.",
    };
  }
}
