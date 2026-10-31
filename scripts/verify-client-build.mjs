import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
for (const file of [
  "countries.geojson",
  "countries.meta.json",
  "destinations/places.json",
  "destinations/attribution.json",
  "fonts.css",
  "fonts/Allura-Regular.ttf",
  "fonts/CormorantGaramond-Variable.ttf",
  "fonts/LICENSE-allura.txt",
  "fonts/LICENSE-cormorant-garamond.txt",
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
const relief = JSON.parse(
  await readFile(resolve(root, "client/public/relief/manifest.json"), "utf8"),
);
for (const file of [
  "relief/manifest.json",
  "relief/TERRAIN-ATTRIBUTION.md",
  ...relief.countries.flatMap((c) =>
    ["desktop", "mobile", "metadata"].map((key) => c[key].file.slice(1)),
  ),
]) {
  const original = await readFile(resolve(root, "client/public", file)),
    built = await readFile(resolve(root, "client/dist", file));
  if (
    createHash("sha256").update(original).digest("hex") !==
    createHash("sha256").update(built).digest("hex")
  )
    throw Error(`Built relief asset is stale: ${file}`);
}
for (const [, file] of index.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g))
  await readFile(resolve(root, "client/dist", file.slice(1)));
console.log("Built globe/media manifests and entry assets verified.");
