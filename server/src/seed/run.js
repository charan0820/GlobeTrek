import mongoose from "mongoose";
import { configuration } from "../config.js";
import { ensureIndexes } from "../models/index.js";
import { seedTravel as seed } from "./travel.js";
try {
  await mongoose.connect(configuration().mongoUri);
  await ensureIndexes();
  const counts = await seed();
  console.log(
    `Seeded GlobeTrek catalog: ${JSON.stringify(counts)}. 365 days of inventory; reservations preserved.`,
  );
} finally {
  await mongoose.disconnect();
}
