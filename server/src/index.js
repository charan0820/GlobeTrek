import mongoose from "mongoose";
import { configuration } from "./config.js";
import { createApp } from "./app.js";
import { ensureIndexes } from "./models/index.js";
const config = configuration();
await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
const hello = await mongoose.connection.db.admin().command({ hello: 1 });
if (!hello.setName)
  throw new Error(
    "MongoDB must run as a replica set; transactions are required.",
  );
await ensureIndexes();
const server = createApp(config).listen(config.port, "0.0.0.0", () =>
  console.log(`GlobeTrek listening on port ${config.port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
