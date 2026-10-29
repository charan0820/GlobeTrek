import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
dotenv.config({ path: path.join(root, ".env"), quiet: true });
export function configuration() {
  const production = process.env.NODE_ENV === "production";
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith("replace-with"))
    throw new Error(
      "Set JWT_SECRET to a random secret of at least 32 characters.",
    );
  if (!process.env.MONGODB_URI)
    throw new Error("MONGODB_URI is required (MongoDB replica set).");
  const origin = process.env.APP_ORIGIN || "http://localhost:5173";
  if (production && !origin.startsWith("https://"))
    throw new Error("Production APP_ORIGIN must use HTTPS.");
  return {
    production,
    secret,
    origin,
    mongoUri: process.env.MONGODB_URI,
    port: Number(process.env.PORT || 3000),
    cacheEnabled: process.env.CACHE_ENABLED !== "false",
  };
}
