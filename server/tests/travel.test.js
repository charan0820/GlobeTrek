import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { ensureIndexes, User, Hotel, Inventory } from "../src/models/index.js";
import {
  Country,
  City,
  Attraction,
  Tour,
  TourDeparture,
  Template,
  Package,
  PackageDeparture,
  Trip,
  Quote,
  Reservation,
  ExchangeRateSnapshot,
} from "../src/models/travel.js";
import { seedTravel } from "../src/seed/travel.js";
import {
  createQuote,
  hold,
  transition,
  reconcileExpired,
} from "../src/services/reservations.js";
import {
  estimateINR,
  localInstant,
  priceTotal,
} from "../src/services/travel-policy.js";
import { addDays, dateKey, dayKeys } from "../../shared/travel.js";
import { deleteTrip, saveTrip } from "../src/services/trips.js";
import { estimateSelections, tripEstimate } from "../src/services/estimates.js";
import { parseRates, refreshRates } from "../src/services/exchange-rates.js";
const config = {
  secret: "travel-tests-only-secret-over-32-characters",
  origin: "http://localhost:5173",
  production: false,
  cacheEnabled: true,
};
let replica, app, users, hotel, start;
const cookie = (user) =>
  `session=${jwt.sign({ version: 0 }, config.secret, { subject: user.id, algorithm: "HS256", issuer: "globetrek", audience: "globetrek-web", expiresIn: "2h" })}`;
const write = (path, user = users[0], method = "post") => {
  const agent = request(app);
  return agent[method](path)
    .set("Origin", config.origin)
    .set("Cookie", cookie(user));
};
const source = (extra = {}) => ({
  kind: "stay",
  hotelId: hotel.id,
  roomTypeId: hotel.roomTypes[0].id,
  checkIn: start,
  checkOut: addDays(start, 2),
  travelers: 2,
  ...extra,
});
const draft = () => ({
  name: "My Japan trip",
  country: "JP",
  startDate: start,
  endDate: addDays(start, 3),
  travelers: 2,
  days: dayKeys(start, addDays(start, 3), true).map((date) => ({
    date,
    stops: [],
  })),
  stays: [],
});
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    binary: { version: "7.0.14" },
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replica.getUri("globetrek_travel_tests"));
  await ensureIndexes();
  await seedTravel({ days: 20 });
  users = await User.create(
    Array.from({ length: 8 }, (_, i) => ({
      name: `Traveler ${i}`,
      email: `travel${i}@example.test`,
      passwordHash: "unused",
    })),
  );
  hotel = await Hotel.findOne({ country: "JP" }).sort({ slug: 1 });
  start = addDays(dateKey(new Date()), 3);
  app = createApp(config, { logLevel: "silent", apiLimit: 10000 });
});
beforeEach(async () => {
  await Reservation.deleteMany({});
  await Quote.deleteMany({});
  await Trip.deleteMany({});
  await Inventory.updateMany({}, { $set: { booked: 0, held: 0, total: 4 } });
  await TourDeparture.updateMany(
    {},
    { $set: { booked: 0, held: 0, total: 8 } },
  );
  await PackageDeparture.updateMany(
    {},
    { $set: { booked: 0, held: 0, total: 12 } },
  );
});
afterAll(async () => {
  await mongoose.disconnect();
  if (replica) await replica.stop();
});
describe("read-only planning estimates", () => {
  it("excludes informational attraction tickets from draft totals", async () => {
    const input = draft(),
      attraction = await Attraction.findOne({ country: "JP" });
    input.days[0].stops = [
      { id: "planned-place", kind: "attraction", refId: attraction.id },
    ];
    expect((await tripEstimate(input)).total).toBeNull();
    input.stays = [
      {
        hotelId: hotel.id,
        roomTypeId: hotel.roomTypes[0].id,
        checkIn: start,
        checkOut: addDays(start, 2),
      },
    ];
    const withAttraction = await tripEstimate(input);
    input.days[0].stops = [];
    expect((await tripEstimate(input)).total).toBe(withAttraction.total);
  });
  it("rejects mismatched tour departures without claiming a total", async () => {
    const tour = await Tour.findOne({ country: "JP" }),
      other = await Tour.findOne({ country: "JP", _id: { $ne: tour._id } }),
      departure = await TourDeparture.findOne({
        tour: other._id,
        startAt: { $gt: new Date() },
      });
    const [estimate] = await estimateSelections({
      travelers: 2,
      selections: [{ kind: "tours", id: tour.id, departureId: departure.id }],
    });
    expect(estimate.total).toBeNull();
    expect(estimate.missing).toMatch(/matching/);
  });
  it("matches the authoritative stay quote for capacity, nights and fees without changing inventory", async () => {
    const selection = {
      kind: "stays",
      id: hotel.id,
      roomTypeId: hotel.roomTypes[0].id,
      checkIn: start,
      checkOut: addDays(start, 3),
    };
    const before = await Inventory.find({ roomTypeId: hotel.roomTypes[0]._id })
      .sort({ date: 1 })
      .lean();
    const response = await write("/api/estimates")
      .send({ travelers: 5, selections: [selection] })
      .expect(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const estimate = response.body.data[0];
    expect(estimate.assumptions.rooms).toBe(
      Math.ceil(5 / hotel.roomTypes[0].capacity),
    );
    expect(estimate.total).toBe(
      priceTotal(
        [
          {
            amount:
              hotel.roomTypes[0].basePrice *
              3 *
              Math.ceil(5 / hotel.roomTypes[0].capacity),
          },
        ],
        hotel.currency,
      ).total,
    );
    expect(estimate.availabilityGuaranteed).toBe(false);
    expect(await Quote.countDocuments()).toBe(0);
    expect(await Reservation.countDocuments()).toBe(0);
    expect(
      await Inventory.find({ roomTypeId: hotel.roomTypes[0]._id })
        .sort({ date: 1 })
        .lean(),
    ).toEqual(before);
    const quote = await createQuote(
      users[0].id,
      source({ travelers: 5, checkOut: addDays(start, 3) }),
    );
    expect(estimate.total).toBe(quote.price.total);
  });
  it("estimates package components using the same prices and fee as checkout", async () => {
    const departure = await PackageDeparture.findOne({
      country: "JP",
      startAt: { $gt: new Date() },
    }).sort({ date: 1 });
    const [estimate] = await estimateSelections({
      travelers: 3,
      selections: [
        {
          kind: "packages",
          id: String(departure.package),
          departureId: departure.id,
        },
      ],
    });
    const quote = await createQuote(users[0].id, {
      kind: "package",
      departureId: departure.id,
      travelers: 3,
    });
    expect(estimate.total).toBe(quote.price.total);
    expect(estimate.assumptions.components.length).toBe(4);
    expect(estimate.assumptions.date).toBe(departure.date);
  });
  it("keeps zero-decimal and legitimate zero-price tours visible", async () => {
    const tour = await Tour.findOne({ country: "JP" }),
      original = tour.price;
    try {
      await Tour.updateOne({ _id: tour._id }, { $set: { price: 0 } });
      const [estimate] = await estimateSelections({
        travelers: 12,
        selections: [{ kind: "tours", id: tour.id }],
      });
      expect(estimate.currency).toBe("JPY");
      expect(estimate.unitPrice).toBe(0);
      expect(estimate.total).toBe(0);
      expect(estimate.fee).toBe(0);
    } finally {
      await Tour.updateOne({ _id: tour._id }, { $set: { price: original } });
    }
  });
  it("explains missing dates, absent products and empty trips instead of inventing zero totals", async () => {
    const rows = await estimateSelections({
      selections: [
        { kind: "stays", id: hotel.id },
        { kind: "stays", id: "000000000000000000000000" },
      ],
    });
    expect(rows[0].unitPrice).toBeGreaterThanOrEqual(0);
    expect(rows[0].total).toBeNull();
    expect(rows[0].missing).toMatch(/dates/);
    expect(rows[1].total).toBeNull();
    expect((await tripEstimate(draft())).total).toBeNull();
  });
  it("bounds and validates public estimate input", async () => {
    const selection = { kind: "stays", id: hotel.id };
    await write("/api/estimates")
      .send({ travelers: 2, selections: Array(21).fill(selection) })
      .expect(400);
    await write("/api/estimates")
      .send({ travelers: 0, selections: [selection] })
      .expect(400);
    await write("/api/estimates")
      .send({ selections: [{ ...selection, id: "bad" }] })
      .expect(400);
    await write("/api/estimates")
      .send({ selections: [{ ...selection, checkIn: start }] })
      .expect(400);
    await write("/api/estimates")
      .send({
        selections: [
          { ...selection, checkIn: addDays(start, 1), checkOut: start },
        ],
      })
      .expect(400);
  });
  it("includes owned saved-trip summaries and preserves cross-user isolation", async () => {
    const input = draft();
    input.stays = [
      {
        hotelId: hotel.id,
        roomTypeId: hotel.roomTypes[0].id,
        checkIn: start,
        checkOut: addDays(start, 2),
      },
    ];
    const created = await write("/api/trips").send(input).expect(201);
    const own = await write("/api/trips", users[0], "get").expect(200),
      other = await write("/api/trips", users[1], "get").expect(200);
    expect(
      own.body.data.find((t) => t._id === created.body.data._id).pricingSummary
        .total,
    ).toBeGreaterThan(0);
    expect(other.body.data).toEqual([]);
    const guest = await request(app)
      .post("/api/estimates/trip")
      .set("Origin", config.origin)
      .send(input)
      .expect(200);
    expect(guest.body.data.total).toBe(own.body.data[0].pricingSummary.total);
  });
});
describe("travel catalog and domain", () => {
  it("seeds all ten countries and exact content counts", async () => {
    expect(await Country.countDocuments()).toBe(10);
    expect(await City.countDocuments()).toBe(30);
    expect(await Attraction.countDocuments()).toBe(120);
    expect(await Hotel.countDocuments()).toBe(60);
    expect(await Tour.countDocuments()).toBe(60);
    expect(await Template.countDocuments()).toBe(20);
    expect(await Package.countDocuments()).toBe(20);
    for (const country of await Country.find())
      expect(await Hotel.countDocuments({ country: country.code })).toBe(6);
  });
  it("preserves booked quantities and stable room IDs on seed reruns and does not recreate historical holes", async () => {
    const row = await Inventory.findOne({
      roomTypeId: hotel.roomTypes[0]._id,
      date: new Date(start),
    });
    row.booked = 1;
    await row.save();
    const missing = await Inventory.findOne({
      roomTypeId: hotel.roomTypes[1]._id,
      date: new Date(start),
    });
    await Inventory.deleteOne({ _id: missing._id });
    await seedTravel({ days: 20 });
    expect((await Inventory.findById(row._id)).booked).toBe(1);
    expect(await Inventory.findById(missing._id)).toBeNull();
    expect((await Hotel.findById(hotel._id)).roomTypes[0].id).toBe(
      hotel.roomTypes[0].id,
    );
  });
  it("uses explicit minor units and converts EUR-based rates in the correct direction", () => {
    expect(priceTotal([{ amount: 1000 }], "JPY")).toMatchObject({
      subtotal: 1000,
      fee: 120,
      total: 1120,
    });
    const snapshot = {
      date: "2026-10-28",
      rates: { INR: "90", JPY: "150", USD: "1.1" },
      source: "ECB",
    };
    expect(
      estimateINR(1500, "JPY", snapshot, new Date("2026-10-29")).amount,
    ).toBe(90000);
    expect(
      estimateINR(10000, "EUR", snapshot, new Date("2026-10-29")).amount,
    ).toBe(900000);
    expect(estimateINR(1, "THB", snapshot)).toBeNull();
    expect(() =>
      priceTotal([{ amount: Number.MAX_SAFE_INTEGER }], "INR"),
    ).toThrow();
  });
  it("rejects ambiguous DST schedules and respects destination timezones", () => {
    expect(
      localInstant("2027-01-01", "09:00", "Asia/Tokyo").toISOString(),
    ).toBe("2027-01-01T00:00:00.000Z");
    expect(() =>
      localInstant("2027-03-14", "02:30", "America/New_York"),
    ).toThrow();
    expect(() =>
      localInstant("2027-11-07", "01:30", "America/New_York"),
    ).toThrow();
  });
  it("provides cache metadata and validates bounded geographic filtering", async () => {
    const path = "/api/catalog?country=JP&kind=attractions";
    expect((await request(app).get(path)).body.data).toHaveLength(12);
    expect((await request(app).get(path)).headers["x-cache"]).toBe("HIT");
    expect((await request(app).get(`${path}&lat=35`)).status).toBe(400);
  });
});
describe("owned revisioned drafts", () => {
  it("requires authentication and rejects stale autosaves or another owner", async () => {
    expect(
      (
        await request(app)
          .post("/api/trips")
          .set("Origin", config.origin)
          .send(draft())
      ).status,
    ).toBe(401);
    const created = await write("/api/trips").send(draft());
    expect(created.status).toBe(201);
    const id = created.body.data._id;
    expect(
      (
        await request(app)
          .get(`/api/trips/${id}`)
          .set("Cookie", cookie(users[1]))
      ).status,
    ).toBe(404);
    expect(
      (
        await write(`/api/trips/${id}`, users[0], "patch").send({
          ...draft(),
          expectedRevision: 1,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await write(`/api/trips/${id}`, users[0], "patch").send({
          ...draft(),
          expectedRevision: 1,
        })
      ).body.error.code,
    ).toBe("REVISION_CONFLICT");
  });
});
describe("shared transactional holds", () => {
  it("rejects an expired quote without changing stock", async () => {
    const q = await createQuote(users[0]._id, source());
    await expect(
      hold(users[0]._id, q.id, "expired-quote-key-001", new Date(+q.expiresAt)),
    ).rejects.toMatchObject({ code: "QUOTE_EXPIRED" });
    expect(await Inventory.countDocuments({ held: { $gt: 0 } })).toBe(0);
    expect(await Reservation.countDocuments()).toBe(0);
  });
  it("closes cancellation at the earliest item start", async () => {
    const q = await createQuote(users[0]._id, source());
    const { reservation: r } = await hold(
      users[0]._id,
      q.id,
      "cancel-cutoff-key-001",
    );
    await transition(users[0]._id, r.id, "confirm");
    await expect(
      transition(users[0]._id, r.id, "cancel", r.firstStart),
    ).rejects.toMatchObject({ code: "CANCELLATION_CLOSED" });
    expect((await Reservation.findById(r.id)).status).toBe("confirmed");
    expect((await Inventory.findById(r.demands[0].id)).booked).toBe(1);
  });
  it("rejects a stale trip quote and a second active reservation", async () => {
    const selection = source();
    const value = {
      ...draft(),
      stays: [
        {
          hotelId: selection.hotelId,
          roomTypeId: selection.roomTypeId,
          checkIn: selection.checkIn,
          checkOut: selection.checkOut,
        },
      ],
    };
    const trip = await Trip.create({ ...value, user: users[0]._id });
    const stale = await createQuote(users[0]._id, {
      kind: "trip",
      tripId: trip.id,
      revision: 1,
    });
    await saveTrip(users[0]._id, trip.id, {
      ...value,
      name: "Changed name",
      expectedRevision: 1,
    });
    await expect(
      hold(users[0]._id, stale.id, "stale-trip-key-00001"),
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    const fresh = await createQuote(users[0]._id, {
      kind: "trip",
      tripId: trip.id,
      revision: 2,
    });
    const { reservation: r } = await hold(
      users[0]._id,
      fresh.id,
      "first-trip-key-00001",
    );
    await transition(users[0]._id, r.id, "confirm");
    await expect(
      hold(users[0]._id, fresh.id, "second-trip-key-0001"),
    ).rejects.toMatchObject({ code: "ACTIVE_RESERVATION" });
    expect(await Reservation.countDocuments()).toBe(1);
    expect((await Inventory.findById(r.demands[0].id)).held).toBe(0);
  });
  it("fences trip deletion racing a hold", async () => {
    const s = source(),
      trip = await Trip.create({
        ...draft(),
        user: users[0]._id,
        stays: [
          {
            hotelId: s.hotelId,
            roomTypeId: s.roomTypeId,
            checkIn: s.checkIn,
            checkOut: s.checkOut,
          },
        ],
      });
    const q = await createQuote(users[0]._id, {
      kind: "trip",
      tripId: trip.id,
      revision: 1,
    });
    const [held, deleted] = await Promise.allSettled([
      hold(users[0]._id, q.id, "delete-race-key-0001"),
      deleteTrip(users[0]._id, trip.id),
    ]);
    expect(
      [held, deleted].filter((r) => r.status === "fulfilled"),
    ).toHaveLength(1);
    if (held.status === "fulfilled") {
      expect(await Trip.exists({ _id: trip.id })).toBeTruthy();
      expect(await Reservation.countDocuments({ trip: trip.id })).toBe(1);
    } else {
      expect(await Trip.findById(trip.id)).toBeNull();
      expect(await Reservation.countDocuments({ trip: trip.id })).toBe(0);
      expect(await Inventory.countDocuments({ held: { $gt: 0 } })).toBe(0);
    }
  });
  it("holds then confirms and releases every night exactly once", async () => {
    const q = await createQuote(users[0]._id, source());
    const { reservation: r } = await hold(
      users[0]._id,
      q.id,
      "travel-retry-000001",
    );
    const rows = await Inventory.find({
      _id: { $in: r.demands.map((d) => d.id) },
    });
    expect(rows.every((r) => r.held === 1 && r.booked === 0)).toBe(true);
    await transition(users[0]._id, r.id, "confirm");
    await transition(users[0]._id, r.id, "confirm");
    expect((await Inventory.findById(rows[0]._id)).booked).toBe(1);
    await transition(users[0]._id, r.id, "cancel");
    await transition(users[0]._id, r.id, "cancel");
    expect((await Inventory.findById(rows[0]._id)).booked).toBe(0);
  });
  it("replays the same key and rejects changed quote payload", async () => {
    const q = await createQuote(users[0]._id, source()),
      q2 = await createQuote(users[0]._id, source());
    const a = await hold(users[0]._id, q.id, "travel-retry-000002");
    const b = await hold(users[0]._id, q.id, "travel-retry-000002");
    expect(a.reservation.id).toBe(b.reservation.id);
    expect(b.replayed).toBe(true);
    await expect(
      hold(users[0]._id, q2.id, "travel-retry-000002"),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("rolls back earlier nights when the last night is unavailable", async () => {
    const q = await createQuote(users[0]._id, source());
    const last = q.demands.at(-1);
    await Inventory.updateOne({ _id: last.id }, { $set: { booked: 4 } });
    await expect(
      hold(users[0]._id, q.id, "travel-retry-000003"),
    ).rejects.toMatchObject({ code: "SOLD_OUT" });
    expect(await Reservation.countDocuments()).toBe(0);
    expect(await Inventory.countDocuments({ held: { $gt: 0 } })).toBe(0);
  });
  it("allows exactly one concurrent last-room winner and verifies DB capacity", async () => {
    await Inventory.updateMany(
      { roomTypeId: hotel.roomTypes[0]._id },
      { $set: { total: 1 } },
    );
    const quotes = await Promise.all(
      users.map((u) => createQuote(u._id, source())),
    );
    const results = await Promise.allSettled(
      quotes.map((q, i) => hold(users[i]._id, q.id, `last-room-key-00000${i}`)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await Reservation.countDocuments({ status: "pending" })).toBe(1);
    const rows = await Inventory.find({
      roomTypeId: hotel.roomTypes[0]._id,
      date: { $gte: start, $lt: addDays(start, 2) },
    });
    expect(rows.every((r) => r.held + r.booked === 1)).toBe(true);
  });
  it("late confirmation releases inventory even without a cleanup timer", async () => {
    const q = await createQuote(users[0]._id, source());
    const { reservation: r } = await hold(
      users[0]._id,
      q.id,
      "travel-retry-000004",
    );
    await expect(
      transition(users[0]._id, r.id, "confirm", new Date(+r.expiresAt + 1)),
    ).rejects.toMatchObject({ code: "HOLD_EXPIRED" });
    expect((await Reservation.findById(r._id)).status).toBe("expired");
    expect(await Inventory.countDocuments({ held: { $gt: 0 } })).toBe(0);
    await reconcileExpired({ now: new Date(+r.expiresAt + 1) });
    expect(await Inventory.countDocuments({ held: { $lt: 0 } })).toBe(0);
  });
  it("duplicate sweepers racing confirmation never double-release", async () => {
    const q = await createQuote(users[0]._id, source());
    const { reservation: r } = await hold(
      users[0]._id,
      q.id,
      "travel-retry-000005",
    );
    const now = new Date(+r.expiresAt + 1);
    await Promise.allSettled([
      reconcileExpired({ now }),
      reconcileExpired({ now }),
      transition(users[0]._id, r.id, "confirm", now),
    ]);
    expect((await Reservation.findById(r._id)).status).toBe("expired");
    expect(await Inventory.countDocuments({ held: { $ne: 0 } })).toBe(0);
  });
  it("packages consume the same tour seats as standalone bookings and roll back mixed resources", async () => {
    const pkg = await Package.findOne({ country: "JP" });
    const dep = await PackageDeparture.findOne({
      package: pkg._id,
      startAt: { $gt: new Date() },
    });
    const q = await createQuote(users[0]._id, {
      kind: "package",
      departureId: dep.id,
      travelers: 2,
    });
    await TourDeparture.updateOne(
      { _id: dep.tours[1] },
      { $set: { total: 1 } },
    );
    await expect(
      hold(users[0]._id, q.id, "package-retry-000001"),
    ).rejects.toMatchObject({ code: "SOLD_OUT" });
    expect(await Inventory.countDocuments({ held: { $gt: 0 } })).toBe(0);
    await TourDeparture.updateOne(
      { _id: dep.tours[1] },
      { $set: { total: 8 } },
    );
    const { reservation: r } = await hold(
      users[0]._id,
      q.id,
      "package-retry-000001",
    );
    expect((await TourDeparture.findById(dep.tours[0])).held).toBe(2);
    expect((await PackageDeparture.findById(dep.id)).held).toBe(2);
    await transition(users[0]._id, r.id, "cancel");
    expect((await TourDeparture.findById(dep.tours[0])).held).toBe(0);
  });
  it("enforces ownership at quote and reservation endpoints", async () => {
    const q = await createQuote(users[0]._id, source());
    expect(
      (
        await request(app)
          .get(`/api/quotes/${q.id}`)
          .set("Cookie", cookie(users[1]))
      ).status,
    ).toBe(404);
    const { reservation: r } = await hold(
      users[0]._id,
      q.id,
      "travel-retry-000006",
    );
    expect(
      (await write(`/api/reservations/${r.id}/confirm`, users[1]).send({}))
        .status,
    ).toBe(404);
  });
  it("one account cannot accumulate simultaneous holds", async () => {
    const a = await createQuote(users[0]._id, source()),
      b = await createQuote(users[0]._id, source());
    await hold(users[0]._id, a.id, "travel-retry-000007");
    await expect(
      hold(users[0]._id, b.id, "travel-retry-000008"),
    ).rejects.toMatchObject({ code: "ACTIVE_HOLD" });
  });
});
describe("content and policy boundaries", () => {
  it("backs off provider failures and keeps native checkout available", async () => {
    await ExchangeRateSnapshot.deleteMany({});
    const provider = vi
      .fn()
      .mockRejectedValue(new Error("Provider unavailable"));
    vi.stubGlobal("fetch", provider);
    try {
      await expect(refreshRates()).rejects.toThrow("Provider unavailable");
      expect(await refreshRates()).toBeNull();
      expect(provider).toHaveBeenCalledTimes(1);
      const quote = await createQuote(users[0]._id, source());
      expect(quote.price.currency).toBe("JPY");
      expect(quote.price.inrEstimate).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("keeps template copies independent and enforces the 30-day boundary", async () => {
    const template = await Template.findOne({ country: "JP" }).lean();
    const original = JSON.stringify(template.days);
    const copy = structuredClone(template.days);
    copy[0].attractionIds.reverse();
    expect(
      JSON.stringify((await Template.findById(template._id).lean()).days),
    ).toBe(original);
    expect(dayKeys(start, addDays(start, 29), true)).toHaveLength(30);
    expect(() => dayKeys(start, addDays(start, 30), true)).toThrow();
  });
  it("keeps tour and package inventory holes closed on extension", async () => {
    const tour = await TourDeparture.findOne({
      country: "GR",
      date: start,
    }).lean();
    const pkg = await PackageDeparture.findOne({ country: "GR" }).lean();
    await TourDeparture.deleteOne({ _id: tour._id });
    await PackageDeparture.deleteOne({ _id: pkg._id });
    try {
      await seedTravel({ days: 21 });
      expect(await TourDeparture.findById(tour._id)).toBeNull();
      expect(await PackageDeparture.findById(pkg._id)).toBeNull();
    } finally {
      await TourDeparture.create(tour);
      await PackageDeparture.create(pkg);
    }
  });
  it("uses the geographic index to return only nearby attractions", async () => {
    const response = await request(app).get(
      "/api/catalog?country=JP&kind=attractions&lat=35.7148&lng=139.7967&radius=2",
    );
    expect(response.status).toBe(200);
    expect(response.body.data.map((r) => r.name)).toContain("Senso-ji");
    expect(response.body.data.some((r) => r.city === "Kyoto")).toBe(false);
  });
  it("parses complete reference rates and rejects partial or malformed provider responses", () => {
    const xml = `<Cube time='2026-10-28'>${Object.entries({
      INR: "90",
      JPY: "150",
      THB: "35",
      IDR: "17000",
      TRY: "40",
      USD: "1.1",
    })
      .map(
        ([currency, rate]) => `<Cube currency='${currency}' rate='${rate}'/>`,
      )
      .join("")}</Cube>`;
    expect(parseRates(xml)).toMatchObject({
      date: "2026-10-28",
      rates: { EUR: "1", JPY: "150" },
    });
    expect(() => parseRates("<Cube time='2026-10-28'/>")).toThrow();
    expect(() => parseRates("<html>Service unavailable</html>")).toThrow();
  });
});
