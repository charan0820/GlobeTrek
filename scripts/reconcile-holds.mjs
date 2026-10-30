import mongoose from "mongoose";
import { configuration } from "../server/src/config.js";
import { reconcileExpired } from "../server/src/services/reservations.js";
await mongoose.connect(configuration().mongoUri);
try {
  console.log(`Expired ${await reconcileExpired({ limit: 1000 })} due holds.`);
} finally {
  await mongoose.disconnect();
}
