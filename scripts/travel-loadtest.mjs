import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import assert from "node:assert/strict";
import os from "node:os";
import { createApp } from "../server/src/app.js";
import {
  ensureIndexes,
  User,
  Hotel,
  Inventory,
} from "../server/src/models/index.js";
import {
  Reservation,
  TourDeparture,
  Package,
  PackageDeparture,
} from "../server/src/models/travel.js";
import { seedTravel } from "../server/src/seed/travel.js";
import {
  createQuote,
  hold,
  transition,
} from "../server/src/services/reservations.js";
import { addDays, dateKey } from "../shared/travel.js";
const out = "artifacts/travel-loadtests";
await mkdir(out, { recursive: true });
const replica = await MongoMemoryReplSet.create({
  binary: { version: "7.0.14" },
  replSet: { count: 1, storageEngine: "wiredTiger" },
});
const config = {
  secret: "isolated-travel-load-tests-secret-only",
  origin: "http://localhost:3020",
  production: false,
  cacheEnabled: false,
};
let server;
const results = [];
async function start(cacheEnabled) {
  if (server) await new Promise((r) => server.close(r));
  server = createApp(
    { ...config, cacheEnabled },
    { logLevel: "silent", apiLimit: 1000000, reservationLimit: 1000000 },
  ).listen(3020, "127.0.0.1");
  await once(server, "listening");
}
async function run(name, mode, fixture) {
  const samples = [],
    cpu = process.cpuUsage(),
    begin = performance.now();
  const timer = setInterval(() => samples.push(process.memoryUsage().rss), 250);
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(
        process.env.K6_BIN || "k6",
        [
          "run",
          "--summary-export",
          `${out}/${name}.json`,
          "server/loadtests/travel.js",
        ],
        {
          stdio: "inherit",
          env: {
            ...process.env,
            BASE_URL: config.origin,
            MODE: mode,
            FIXTURE: JSON.stringify({ ...fixture, name }),
          },
        },
      );
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0 ? resolve() : reject(Error(`k6 ${name} exited ${code}`)),
      );
    });
  } finally {
    clearInterval(timer);
    results.push({
      name,
      mode,
      elapsedMs: Math.round(performance.now() - begin),
      cpuMicroseconds: process.cpuUsage(cpu),
      maxRssBytes: Math.max(process.memoryUsage().rss, ...samples),
    });
  }
}
try {
  await mongoose.connect(replica.getUri("isolated_travel_load"));
  await ensureIndexes();
  const counts = await seedTravel({ days: 30 });
  const users = await User.create(
    Array.from({ length: 20 }, (_, i) => ({
      name: `Load ${i}`,
      email: `load${i}@example.test`,
      passwordHash: "unused",
    })),
  );
  const auth = users.map((u) => ({
    cookie: `session=${jwt.sign({ version: 0 }, config.secret, { subject: u.id, algorithm: "HS256", issuer: "globetrek", audience: "globetrek-web", expiresIn: "2h" })}`,
  }));
  const hotel = await Hotel.findOne({ country: "JP" }),
    date = addDays(dateKey(new Date()), 5),
    stay = {
      kind: "stay",
      hotelId: hotel.id,
      roomTypeId: hotel.roomTypes[0].id,
      checkIn: date,
      checkOut: addDays(date, 2),
      travelers: 1,
    };
  const tour = await TourDeparture.findOne({ country: "JP", date });
  await start(false);
  await run("catalog-uncached", "browse", { users: auth });
  await start(true);
  await run("catalog-cached", "browse", { users: auth });
  await run("quotes", "quote", { users: auth, quoteSource: stay });
  for (const name of ["room", "tour", "package-shared"]) {
    await Inventory.updateMany({}, { $set: { booked: 0, held: 0, total: 4 } });
    await TourDeparture.updateMany(
      {},
      { $set: { booked: 0, held: 0, total: 24 } },
    );
    let sources;
    if (name === "room") {
      await Inventory.updateMany(
        { roomTypeId: hotel.roomTypes[0]._id },
        { $set: { total: 1 } },
      );
      sources = users.map(() => stay);
    }
    if (name === "tour") {
      await TourDeparture.updateOne({ _id: tour._id }, { $set: { total: 1 } });
      sources = users.map(() => ({
        kind: "tour",
        departureId: tour.id,
        travelers: 1,
      }));
    }
    if (name === "package-shared") {
      const pkg = await Package.findOne({ country: "JP" }),
        dep = await PackageDeparture.findOne({
          package: pkg._id,
          startAt: { $gt: new Date() },
        });
      await TourDeparture.updateOne(
        { _id: dep.tours[0] },
        { $set: { total: 1 } },
      );
      sources = users.map((_, i) =>
        i % 2
          ? { kind: "tour", departureId: String(dep.tours[0]), travelers: 1 }
          : { kind: "package", departureId: dep.id, travelers: 1 },
      );
    }
    const quotes = await Promise.all(
      users.map((u, i) => createQuote(u._id, sources[i])),
    );
    await run(name, "contention", {
      users: auth.map((a, i) => ({ ...a, quote: quotes[i].id })),
    });
    const active = await Reservation.find({ status: "pending" });
    assert.equal(active.length, 1, `${name} exactly one winner`);
    for (const demand of active[0].demands) {
      const Model =
        demand.type === "room"
          ? Inventory
          : demand.type === "tour"
            ? TourDeparture
            : PackageDeparture;
      const row = await Model.findById(demand.id);
      assert(row.held + row.booked <= row.total);
    }
    for (const r of active) await transition(r.user, r.id, "cancel");
  }
  await Inventory.updateMany({}, { $set: { booked: 0, held: 0, total: 24 } });
  const past = new Date(Date.now() - 11 * 60000);
  for (let i = 0; i < 10; i++) {
    const q = await createQuote(users[i]._id, stay, past);
    await hold(users[i]._id, q.id, `expired-load-${i}-000000`, past);
  }
  const recoveryPath = `/api/catalog/tours/${tour.tour}/departures?from=${date}&to=${date}`;
  await run("expired-recovery", "recovery", { users: auth, recoveryPath });
  assert.equal(await Reservation.countDocuments({ status: "pending" }), 0);
  assert.equal(await Inventory.countDocuments({ held: { $gt: 0 } }), 0);
  await writeFile(
    `${out}/environment.json`,
    JSON.stringify(
      {
        date: new Date(),
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        machine: {
          cpu: os.cpus()[0]?.model,
          logicalCpus: os.cpus().length,
          totalMemoryBytes: os.totalmem(),
        },
        counts,
        profiles: results,
        databaseAssertionsPassed: true,
      },
      null,
      2,
    ),
  );
  console.log("Travel load profiles and direct database assertions passed.");
} finally {
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  await replica.stop();
}
