// Explicit local demo: ephemeral replica set, no Atlas account or permanent database.
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
const replica = await MongoMemoryReplSet.create({
  binary: { version: "7.0.14" },
  replSet: { count: 1, storageEngine: "wiredTiger" },
});
process.env.JWT_SECRET = randomBytes(48).toString("hex");
process.env.MONGODB_URI = replica.getUri("globetrek_demo");
process.env.APP_ORIGIN = "http://localhost:3000";
const { createApp } = await import("../server/src/app.js");
const { configuration } = await import("../server/src/config.js");
const { ensureIndexes } = await import("../server/src/models/index.js");
const { seed } = await import("../server/src/seed/seed.js");
await mongoose.connect(process.env.MONGODB_URI);
await ensureIndexes();
await seed();
const server = createApp(configuration()).listen(3000, "127.0.0.1", () =>
  console.log(
    "Ephemeral demo: http://localhost:3000 — all data disappears when stopped.",
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await mongoose.disconnect();
      await replica.stop();
      process.exit(0);
    }),
  );
