// Creates an isolated ephemeral DB, invokes k6, then verifies actual committed state.
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createApp } from "../server/src/app.js";
import {
  ensureIndexes,
  User,
  Inventory,
  Booking,
} from "../server/src/models/index.js";
import { seed } from "../server/src/seed/seed.js";
import { DAY, utcToday } from "../server/src/utils/dates.js";
const out = "artifacts/loadtests";
await mkdir(out, { recursive: true });
const replica = await MongoMemoryReplSet.create({
  binary: { version: "7.0.14" },
  replSet: { count: 1, storageEngine: "wiredTiger" },
});
let server;
const cpuStart = process.cpuUsage(),
  memorySamples = [],
  start = performance.now();
const sample = setInterval(
  () =>
    memorySamples.push({
      elapsedMs: Math.round(performance.now() - start),
      ...process.memoryUsage(),
    }),
  500,
);
const config = {
  secret: "load-test-only-secret-at-least-32-characters",
  origin: "http://localhost:3001",
  production: false,
  cacheEnabled: false,
};
async function run(name, extra = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.env.K6_BIN || "k6",
      [
        "run",
        "--summary-export",
        `${out}/${name}.json`,
        `server/loadtests/${name === "contention" ? "contention" : "browse"}.js`,
      ],
      {
        stdio: "inherit",
        env: { ...process.env, BASE_URL: "http://localhost:3001", ...extra },
      },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`k6 exited ${code}`)),
    );
  });
}
try {
  await mongoose.connect(replica.getUri("globetrek_loadtest"));
  await ensureIndexes();
  const [hotel] = await seed();
  server = createApp(config, { logLevel: "silent", apiLimit: 100000 }).listen(
    3001,
    "127.0.0.1",
  );
  await new Promise((resolve) => server.once("listening", resolve));
  await run("browse-baseline");
  await new Promise((resolve) => server.close(resolve));
  server = createApp(
    { ...config, cacheEnabled: true },
    { logLevel: "silent", apiLimit: 100000 },
  ).listen(3001, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  await run("browse-cached");
  await Inventory.updateMany(
    { roomTypeId: hotel.roomTypes[0]._id },
    { $set: { total: 1, booked: 0 } },
  );
  const user = await User.create({
    name: "Load Test",
    email: "load@example.test",
    passwordHash: "not-for-login",
  });
  const token = jwt.sign({ version: 0 }, config.secret, {
    subject: user.id,
    issuer: "globetrek",
    audience: "globetrek-web",
    expiresIn: "10m",
  });
  const checkIn = new Date(+utcToday() + DAY).toISOString().slice(0, 10),
    checkOut = new Date(+utcToday() + 3 * DAY).toISOString().slice(0, 10);
  await run("contention", {
    ORIGIN: config.origin,
    TEST_COOKIE: `session=${token}`,
    BOOKING_BODY: JSON.stringify({
      hotelId: hotel.id,
      roomTypeId: hotel.roomTypes[0].id,
      checkIn,
      checkOut,
      rooms: 1,
      guests: 2,
    }),
    RUN_ID: randomUUID(),
  });
  const bookings = await Booking.find({ status: "confirmed" }).lean();
  const inventory = await Inventory.find({
    roomTypeId: hotel.roomTypes[0]._id,
    date: { $gte: checkIn, $lt: checkOut },
  }).lean();
  const valid =
    bookings.length === 1 &&
    inventory.length === 2 &&
    inventory.every((i) => i.booked === 1 && i.booked <= i.total);
  const explain = await Inventory.find({
    roomTypeId: hotel.roomTypes[0]._id,
    date: new Date(checkIn),
  }).explain("executionStats");
  await writeFile(
    `${out}/database-verification.json`,
    JSON.stringify(
      {
        valid,
        committedBookings: bookings.length,
        nights: inventory.map((i) => ({
          date: i.date,
          total: i.total,
          booked: i.booked,
        })),
        inventoryExplain: explain,
      },
      null,
      2,
    ),
  );
  if (!valid) throw new Error("Database contention invariant failed");
} finally {
  clearInterval(sample);
  await writeFile(
    `${out}/process.json`,
    JSON.stringify(
      {
        note: "Node API and harness process only; excludes MongoDB and k6 child processes. Aggregate across all scenarios.",
        elapsedMs: performance.now() - start,
        cpuMicroseconds: process.cpuUsage(cpuStart),
        memorySamples,
      },
      null,
      2,
    ),
  );
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await replica.stop();
}
