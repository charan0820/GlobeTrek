import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import {
  ensureIndexes,
  User,
  Hotel,
  Inventory,
  Booking,
} from "../src/models/index.js";
import { seed } from "../src/seed/seed.js";
import { DAY, utcToday } from "../src/utils/dates.js";

const config = {
  secret: "integration-test-secret-only-32-characters-long",
  origin: "http://localhost:5173",
  production: false,
  cacheEnabled: true,
};
let replica, app, hotel, user, other, cookie, otherCookie;
const iso = (offset) =>
  new Date(+utcToday() + offset * DAY).toISOString().slice(0, 10);
const token = (u, overrides = {}) =>
  `session=${jwt.sign({ version: u.tokenVersion, ...overrides }, config.secret, { subject: u.id, algorithm: "HS256", issuer: "globetrek", audience: "globetrek-web", expiresIn: "2h" })}`;
const body = (extra = {}) => ({
  hotelId: hotel.id,
  roomTypeId: hotel.roomTypes[0].id,
  checkIn: iso(1),
  checkOut: iso(3),
  rooms: 1,
  guests: 2,
  ...extra,
});
const reserve = (
  key = "test-retry-key-000001",
  input = body(),
  auth = cookie,
) =>
  request(app)
    .post("/api/bookings")
    .set("Origin", config.origin)
    .set("Cookie", auth)
    .set("Idempotency-Key", key)
    .send(input);
const cancel = (id, auth = cookie) =>
  request(app)
    .delete(`/api/bookings/${id}`)
    .set("Origin", config.origin)
    .set("Cookie", auth);

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({
    binary: { version: "7.0.14" },
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replica.getUri("globetrek_test"));
  await ensureIndexes();
  app = createApp(config, { logLevel: "silent", authLimit: 1000 });
  [hotel] = await seed({ days: 15 });
  [user, other] = await User.create([
    {
      name: "Test Traveler",
      email: "traveler@example.test",
      passwordHash: "not-used-for-login",
    },
    {
      name: "Other Traveler",
      email: "other@example.test",
      passwordHash: "not-used-for-login",
    },
  ]);
  cookie = token(user);
  otherCookie = token(other);
});
beforeEach(async () => {
  await Booking.deleteMany({});
  await Inventory.updateMany({}, { $set: { booked: 0, total: 4 } });
});
afterAll(async () => {
  await mongoose.disconnect();
  if (replica) await replica.stop();
});

describe("booking invariants", () => {
  it("reserves all nights, computes price on server, and excludes checkout", async () => {
    const res = await reserve();
    expect(res.status).toBe(201);
    expect(res.body.data.price).toMatchObject({
      subtotal: 960000,
      tax: 115200,
      total: 1075200,
      currency: "INR",
      nights: 2,
    });
    const nights = await Inventory.find({
      roomTypeId: hotel.roomTypes[0]._id,
      date: { $gte: iso(1), $lte: iso(3) },
    }).sort({ date: 1 });
    expect(nights.map((n) => n.booked)).toEqual([1, 1, 0]);
  });
  it("rejects forged prices, bad IDs, unknown fields and capacity overflow", async () => {
    expect(
      (await reserve("test-forged-price-0001", body({ price: 1 }))).status,
    ).toBe(400);
    expect(
      (await reserve("test-bad-id-value-0001", body({ hotelId: "x" }))).status,
    ).toBe(400);
    expect(
      (await reserve("test-capacity-value-01", body({ guests: 3 }))).body.error
        .code,
    ).toBe("CAPACITY_EXCEEDED");
    expect(await Booking.countDocuments()).toBe(0);
  });
  it.each([
    { checkOut: iso(1) },
    { checkIn: iso(-1) },
    { checkOut: iso(20) },
    { checkIn: "2026-02-30" },
    { checkOut: iso(91) },
  ])("rejects invalid date range %j", async (extra) => {
    const res = await reserve("test-invalid-dates-01", body(extra));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_DATES");
  });
  it("rolls back earlier nights when a later night is full or missing", async () => {
    await Inventory.updateOne(
      { roomTypeId: hotel.roomTypes[0]._id, date: iso(2) },
      { $set: { booked: 4 } },
    );
    expect((await reserve()).status).toBe(409);
    expect(
      (
        await Inventory.findOne({
          roomTypeId: hotel.roomTypes[0]._id,
          date: iso(1),
        })
      ).booked,
    ).toBe(0);
    expect(await Booking.countDocuments()).toBe(0);
    await Inventory.deleteOne({
      roomTypeId: hotel.roomTypes[0]._id,
      date: iso(2),
    });
    expect((await reserve()).status).toBe(409);
    expect(
      (
        await Inventory.findOne({
          roomTypeId: hotel.roomTypes[0]._id,
          date: iso(1),
        })
      ).booked,
    ).toBe(0);
    await Inventory.create({
      hotel: hotel._id,
      roomTypeId: hotel.roomTypes[0]._id,
      date: iso(2),
      total: 4,
      booked: 0,
    });
  });
  it("allows adjacent stays and keeps inventory independent per date", async () => {
    expect((await reserve()).status).toBe(201);
    expect(
      (
        await reserve(
          "test-adjacent-key-0001",
          body({ checkIn: iso(3), checkOut: iso(4) }),
        )
      ).status,
    ).toBe(201);
    expect(await Booking.countDocuments()).toBe(2);
  });
  it("returns the original booking for retries and conflicts on changed payload", async () => {
    const first = await reserve();
    const retry = await reserve();
    expect(retry.status).toBe(200);
    expect(retry.body.meta.replayed).toBe(true);
    expect(retry.body.data._id).toBe(first.body.data._id);
    expect(
      (await reserve("test-retry-key-000001", body({ rooms: 2 }))).body.error
        .code,
    ).toBe("IDEMPOTENCY_CONFLICT");
    expect(await Booking.countDocuments()).toBe(1);
  });
  it("handles concurrent identical submissions once", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => reserve()),
    );
    expect(results.every((r) => [200, 201].includes(r.status))).toBe(true);
    expect(new Set(results.map((r) => r.body.data._id)).size).toBe(1);
    expect(await Booking.countDocuments()).toBe(1);
    expect(
      (
        await Inventory.findOne({
          roomTypeId: hotel.roomTypes[0]._id,
          date: iso(1),
        })
      ).booked,
    ).toBe(1);
  });
  it("never oversells the last room under 20 distinct concurrent requests", async () => {
    await Inventory.updateMany(
      { roomTypeId: hotel.roomTypes[0]._id },
      { $set: { total: 1 } },
    );
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        reserve(`contention-distinct-${String(i).padStart(3, "0")}`),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(
      results.filter(
        (r) => r.status === 409 && r.body.error.code === "SOLD_OUT",
      ),
    ).toHaveLength(19);
    const committed = await Booking.countDocuments({ status: "confirmed" });
    const inventory = await Inventory.find({
      roomTypeId: hotel.roomTypes[0]._id,
      date: { $in: [iso(1), iso(2)] },
    });
    expect(committed).toBe(1);
    expect(inventory.map((i) => i.booked)).toEqual([1, 1]);
    expect(inventory.every((i) => i.booked <= i.total)).toBe(true);
  });
  it("concurrent cancellation restores inventory exactly once and replay does not rebook", async () => {
    const first = await reserve();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => cancel(first.body.data._id)),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect((await Booking.findById(first.body.data._id)).status).toBe(
      "cancelled",
    );
    expect(await Inventory.countDocuments({ booked: { $ne: 0 } })).toBe(0);
    expect((await reserve()).body.data.status).toBe("cancelled");
  });
  it("hides and protects another user’s booking", async () => {
    const first = await reserve();
    expect(
      (
        await request(app)
          .get(`/api/bookings/${first.body.data._id}`)
          .set("Cookie", otherCookie)
      ).status,
    ).toBe(404);
    expect((await cancel(first.body.data._id, otherCookie)).status).toBe(404);
    expect(
      (
        await request(app)
          .get("/api/users/me/bookings")
          .set("Cookie", otherCookie)
      ).body.data,
    ).toEqual([]);
    expect((await Booking.findById(first.body.data._id)).status).toBe(
      "confirmed",
    );
  });
});

describe("hotel capacity filter", () => {
  it("matches any suitable room type, combines filters, and keeps pagination totals correct", async () => {
    const baseline = await request(app).get("/api/hotels");
    expect(baseline.status).toBe(200);
    expect(baseline.body.meta.total).toBe(6);

    const four = await request(app).get("/api/hotels?minCapacity=4");
    expect(four.status).toBe(200);
    expect(four.body.meta.total).toBe(5);
    expect(four.body.data.map((h) => h.name)).not.toContain("Lake & Light");
    expect(
      four.body.data.every((h) =>
        h.roomTypes.some((room) => room.capacity >= 4),
      ),
    ).toBe(true);

    const city = await request(app).get(
      "/api/hotels?city=Udaipur&minCapacity=4",
    );
    expect(city.body.meta.total).toBe(1);
    expect(city.body.data.map((h) => h.name)).toEqual(["Old Town Courtyard"]);

    const page = await request(app).get(
      "/api/hotels?minCapacity=4&limit=2&page=2",
    );
    expect(page.body.meta).toMatchObject({
      total: 5,
      page: 2,
      limit: 2,
      pages: 3,
    });
    expect(page.body.data).toHaveLength(2);

    const noMatch = await request(app).get("/api/hotels?minCapacity=5");
    expect(noMatch.status).toBe(200);
    expect(noMatch.body.data).toEqual([]);
    expect(noMatch.body.meta.total).toBe(0);

    const minimum = await request(app).get("/api/hotels?minCapacity=1");
    expect(minimum.body.meta.total).toBe(6);
    const maximum = await request(app).get("/api/hotels?minCapacity=12");
    expect(maximum.status).toBe(200);
    expect(maximum.body.meta.total).toBe(0);
  });

  it("keeps capacity-specific cache entries separate", async () => {
    const threeUrl = "/api/hotels?city=Udaipur&minCapacity=3&limit=2";
    const fourUrl = "/api/hotels?city=Udaipur&minCapacity=4&limit=2";
    const firstThree = await request(app).get(threeUrl);
    const firstFour = await request(app).get(fourUrl);
    expect(firstThree.headers["x-cache"]).toBe("MISS");
    expect(firstFour.headers["x-cache"]).toBe("MISS");
    expect(firstThree.body.meta.total).toBe(2);
    expect(firstFour.body.meta.total).toBe(1);

    const againThree = await request(app).get(threeUrl);
    const againFour = await request(app).get(fourUrl);
    expect(againThree.headers["x-cache"]).toBe("HIT");
    expect(againFour.headers["x-cache"]).toBe("HIT");
    expect(againThree.body.data).toEqual(firstThree.body.data);
    expect(againFour.body.data).toEqual(firstFour.body.data);
  });

  it.each(["0", "-1", "13", "2.5", "hello", ""])(
    "rejects invalid minCapacity %j at the API boundary",
    async (value) => {
      const result = await request(app).get(
        `/api/hotels?minCapacity=${encodeURIComponent(value)}`,
      );
      expect(result.status).toBe(400);
      expect(result.body.error.code).toBe("VALIDATION_ERROR");
      expect(
        result.body.error.details.some(
          (detail) => detail.field === "minCapacity",
        ),
      ).toBe(true);
    },
  );
});

describe("API boundary, data and auth", () => {
  it("quotes current availability without caching it", async () => {
    const { hotelId: _hotelId, ...stay } = body();
    const url = `/api/hotels/${hotel.id}/availability?${new URLSearchParams(stay)}`;
    const res = await request(app).get(url);
    expect(res.body.data).toMatchObject({
      available: true,
      remaining: 4,
      paymentMode: "simulated",
    });
    expect(res.headers["cache-control"]).toBe("no-store");
    await reserve();
    expect((await request(app).get(url)).body.data.remaining).toBe(3);
  });
  it("requires authentication, correct origin and idempotency header", async () => {
    expect(
      (
        await request(app)
          .post("/api/bookings")
          .set("Origin", config.origin)
          .send(body())
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .post("/api/bookings")
          .set("Origin", "https://evil.example")
          .set("Cookie", cookie)
          .send(body())
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post("/api/bookings")
          .set("Cookie", cookie)
          .send(body())
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post("/api/bookings")
          .set("Origin", config.origin)
          .set("Cookie", cookie)
          .send(body())
      ).body.error.code,
    ).toBe("INVALID_RETRY_KEY");
    expect(
      (
        await request(app)
          .get("/api/auth/me")
          .set("Cookie", token(user, { version: 99 }))
      ).status,
    ).toBe(401);
  });
  it("handles filters, sort, pagination, literal search and list caching", async () => {
    const url = "/api/hotels?city=Jaipur&sort=price_asc&limit=1";
    const first = await request(app).get(url),
      second = await request(app).get(url);
    expect(first.body.meta).toMatchObject({ total: 2, pages: 2, page: 1 });
    expect(first.body.data[0].name).toBe("Pink City Rooms");
    expect(first.headers["x-cache"]).toBe("MISS");
    expect(second.headers["x-cache"]).toBe("HIT");
    expect((await request(app).get("/api/hotels?q=.*")).body.data).toEqual([]);
    expect((await request(app).get("/api/hotels?sort=arbitrary")).status).toBe(
      400,
    );
    expect((await request(app).get("/api/hotels?limit=1000")).status).toBe(400);
  });
  it("seeding twice preserves room IDs and existing booked counts", async () => {
    await reserve();
    const count = await Inventory.countDocuments();
    const hotels = await seed({ days: 15 });
    expect(hotels[0].roomTypes[0].id).toBe(hotel.roomTypes[0].id);
    expect(await Inventory.countDocuments()).toBe(count);
    expect(
      (
        await Inventory.findOne({
          roomTypeId: hotel.roomTypes[0]._id,
          date: iso(1),
        })
      ).booked,
    ).toBe(1);
    expect(
      (await Inventory.collection.indexes()).some(
        (i) => i.unique && i.key.roomTypeId === 1 && i.key.date === 1,
      ),
    ).toBe(true);
    expect(
      (await Booking.collection.indexes()).some(
        (i) => i.unique && i.key.user === 1 && i.key.idempotencyKey === 1,
      ),
    ).toBe(true);
  });
  it("registers, hashes passwords, logs in, rejects duplicates, and invalidates logout tokens", async () => {
    const credentials = {
      name: "New User",
      email: "new@example.test",
      password: "unique-test-password-987",
    };
    const registered = await request(app)
      .post("/api/auth/register")
      .set("Origin", config.origin)
      .send(credentials);
    expect(registered.status).toBe(201);
    expect(registered.body.data).not.toHaveProperty("passwordHash");
    expect(registered.headers["set-cookie"][0]).toContain("HttpOnly");
    const account = await User.findOne({ email: credentials.email }).select(
      "+passwordHash",
    );
    expect(account.passwordHash).not.toBe(credentials.password);
    expect(
      (
        await request(app)
          .post("/api/auth/register")
          .set("Origin", config.origin)
          .send(credentials)
      ).status,
    ).toBe(409);
    const login = await request(app)
      .post("/api/auth/login")
      .set("Origin", config.origin)
      .send({ email: credentials.email, password: credentials.password });
    expect(login.status).toBe(200);
    const auth = login.headers["set-cookie"][0].split(";")[0];
    expect(
      (await request(app).get("/api/auth/me").set("Cookie", auth)).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .set("Origin", config.origin)
          .send({ email: credentials.email, password: "wrong-password-000" })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .post("/api/auth/logout")
          .set("Origin", config.origin)
          .set("Cookie", auth)
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get("/api/auth/me").set("Cookie", auth)).status,
    ).toBe(401);
    await User.deleteOne({ _id: account._id });
  });
  it("rate limits authentication and returns a consistent error envelope", async () => {
    const limited = createApp(config, { logLevel: "silent", authLimit: 1 });
    const attempt = () =>
      request(limited)
        .post("/api/auth/login")
        .set("Origin", config.origin)
        .send({ email: "nobody@example.test", password: "wrong-password-000" });
    expect((await attempt()).status).toBe(401);
    expect((await attempt()).body.error.code).toBe("AUTH_RATE_LIMITED");
    const bad = await request(app)
      .post("/api/auth/login")
      .set("Origin", config.origin)
      .set("Content-Type", "application/json")
      .send("{broken");
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("INVALID_JSON");
    expect((await request(app).get("/api/missing")).status).toBe(404);
    expect((await request(app).get("/api/health")).status).toBe(200);
  });
});
