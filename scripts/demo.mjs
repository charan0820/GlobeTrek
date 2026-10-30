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
const port = Number(process.env.PORT || 3000);
process.env.APP_ORIGIN = `http://localhost:${port}`;
const { createApp } = await import("../server/src/app.js");
const { configuration } = await import("../server/src/config.js");
const { ensureIndexes } = await import("../server/src/models/index.js");
const { seedTravel: seed } = await import("../server/src/seed/travel.js");
await mongoose.connect(process.env.MONGODB_URI);
await ensureIndexes();
await seed();
const { startMaintenance } = await import('../server/src/services/maintenance.js');
const stopMaintenance = startMaintenance();
const server = createApp(configuration()).listen(port, "127.0.0.1", () =>
  console.log(
    `Ephemeral demo: http://localhost:${port} — all data disappears when stopped.`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      stopMaintenance();
      await mongoose.disconnect();
      await replica.stop();
      process.exit(0);
    }),
  );
