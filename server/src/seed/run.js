import mongoose from "mongoose";
import { configuration } from "../config.js";
import { ensureIndexes } from "../models/index.js";
import { seed } from "./seed.js";
try {
  await mongoose.connect(configuration().mongoUri);
  await ensureIndexes();
  const hotels = await seed();
  console.log(
    `Seeded ${hotels.length} demo hotels and 90 days of inventory. Existing reservations preserved.`,
  );
} finally {
  await mongoose.disconnect();
}
