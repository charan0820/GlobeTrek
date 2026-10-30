import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
for (const file of [
  "countries.geojson",
  "countries.meta.json",
  "destinations/places.json",
  "destinations/attribution.json",
]) {
  const original = await readFile(resolve(root, "client/public", file));
  const built = await readFile(resolve(root, "client/dist", file));
  if (
    createHash("sha256").update(original).digest("hex") !==
    createHash("sha256").update(built).digest("hex")
  )
    throw Error(`Build asset missing or incomplete: ${file}`);
}
const index = await readFile(resolve(root, "client/dist/index.html"), "utf8");
for (const [, file] of index.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g))
  await readFile(resolve(root, "client/dist", file.slice(1)));
console.log("Built globe/media manifests and entry assets verified.");
