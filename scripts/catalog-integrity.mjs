import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, access } from "node:fs/promises";
import {
  countries,
  cities,
  attractions,
  hotelRecords,
  tourRecords,
  templates,
  packageRecords,
} from "../server/src/seed/world.js";
import { CURRENCIES } from "../shared/travel.js";
assert.equal(countries.length, 10);
assert.equal(cities.length, 30);
assert.equal(attractions.length, 120);
assert.equal(hotelRecords.length + 6, 60);
assert.equal(tourRecords.length, 60);
assert.equal(templates.length, 20);
assert.equal(packageRecords.length, 20);
for (const country of countries) {
  assert(country.currency in CURRENCIES);
  assert.equal(cities.filter((c) => c.country === country.code).length, 3);
  assert.equal(
    attractions.filter((a) => a.country === country.code).length,
    12,
  );
  assert.equal(tourRecords.filter((a) => a.country === country.code).length, 6);
  assert.equal(templates.filter((a) => a.country === country.code).length, 2);
}
for (const row of [
  ...cities,
  ...attractions,
  ...tourRecords,
  ...hotelRecords,
]) {
  assert(Number.isFinite(row.lat) && Math.abs(row.lat) <= 90);
  assert(Number.isFinite(row.lng) && Math.abs(row.lng) <= 180);
  if (row.timezone) new Intl.DateTimeFormat("en", { timeZone: row.timezone });
}
for (const row of [...countries, ...attractions])
  assert.equal(new URL(row.source).protocol, "https:");
for (const template of templates)
  for (const day of template.days)
    for (const id of day.attractionIds)
      assert(
        attractions.some((a) => a.id === id && a.country === template.country),
      );
const manifest = JSON.parse(
  await readFile("client/public/destinations/attribution.json", "utf8"),
);
assert.equal(manifest.length, 10);
for (const image of manifest) {
  assert(image.creator && image.source && image.licenseUrl);
  assert(/^(CC BY|CC0|Public domain)/.test(image.license));
  await access(`client/public${image.file}`);
}
const boundaries = JSON.parse(
  await readFile("client/public/countries.geojson", "utf8"),
);
const placeMedia = JSON.parse(
  await readFile("client/public/destinations/places.json", "utf8"),
);
assert.equal(placeMedia.version, 1);
assert.equal(placeMedia.images.length, 120);
assert.equal(new Set(placeMedia.images.map((image) => image.id)).size, 120);
for (const attraction of attractions) {
  const image = placeMedia.images.find(
    (candidate) => candidate.id === attraction.id,
  );
  assert(image, `Missing photograph: ${attraction.id}`);
  assert.equal(image.reviewed, true, `Unreviewed photograph: ${attraction.id}`);
  assert.equal(image.cityId, attraction.cityId);
  assert(
    image.alt &&
      image.title &&
      image.creator &&
      image.source &&
      image.licenseUrl &&
      image.modifications,
  );
  assert(
    image.width > 0 && image.height > 0 && /^[a-f0-9]{64}$/.test(image.sha256),
  );
  assert(
    /^(CC BY(?:-SA)? \d|CC0|Public domain)$/.test(image.license) ||
      /^CC BY(?:-SA)? \d\.\d$/.test(image.license) ||
      (image.id === "gr-nea-chora-beach" &&
        image.license === "CC BY-NC-SA 2.0"),
  );
  for (const file of [image.file, image.thumbnail]) {
    assert(file.startsWith("/destinations/places/") && !file.includes(".."));
    await access(`client/public${file}`);
  }
  assert.equal(
    createHash("sha256")
      .update(await readFile(`client/public${image.file}`))
      .digest("hex"),
    image.sha256,
  );
}
for (const c of countries)
  assert(boundaries.features.some((f) => f.properties.ADM0_A3 === c.iso3));
console.log(
  "Catalog counts, cross-references, coordinates, timezones, image provenance and supported boundaries passed.",
);
