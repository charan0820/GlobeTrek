import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { attractions } from "../server/src/seed/world.js";
import { terrainPoint, locateRegion } from "../client/src/geo/relief-layout.js";
const root = new URL("../client/public/", import.meta.url),
  manifest = JSON.parse(await readFile(new URL("relief/manifest.json", root)));
assert.equal(manifest.countries.length, 10);
const evidence = [];
for (const entry of manifest.countries) {
  const metadata = JSON.parse(
    await readFile(new URL(entry.metadata.file.slice(1), root)),
  );
  for (const key of ["desktop", "mobile", "metadata"]) {
    const item = entry[key],
      bytes = await readFile(new URL(item.file.slice(1), root));
    assert.equal(bytes.length, item.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256);
    if (key === "metadata") continue;
    assert(
      item.bytes <= manifest.budgets[`${key}Bytes`],
      `${entry.code} ${key} size budget`,
    );
    assert(
      item.triangles <= manifest.budgets[`${key}Triangles`],
      `${entry.code} ${key} triangle budget`,
    );
    assert.equal(bytes.readUInt32LE(0), 0x46546c67);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12))),
      accessor = json.accessors[0];
    assert(accessor.max[1] > 0, "Actual sampled elevation must be present");
    assert.equal(json.accessors[3].count, item.triangles * 3);
  }
  for (const region of metadata.regions) {
    assert(region.polygonCount > 0);
    assert(region.bounds.every(Number.isFinite));
    const samples = Buffer.from(region.heights, "base64");
    assert.equal(samples.length, 2 * (region.grid + 1) ** 2);
  }
  const points = attractions
    .filter((a) => a.country === entry.code)
    .map((place) => {
      const point = terrainPoint(metadata, place.lng, place.lat);
      assert([point.x, point.y, point.z].every(Number.isFinite), place.id);
      assert.equal(
        point.region,
        locateRegion(metadata.regions, place.lng, place.lat).id,
      );
      return { id: place.id, region: point.region };
    });
  assert.equal(points.length, 12);
  evidence.push({
    code: entry.code,
    desktop: entry.desktop,
    mobile: entry.mobile,
    regions: entry.regions,
    attractionAnchors: points,
  });
}
await mkdir(new URL("../artifacts/country-workspace/", import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL("../artifacts/country-workspace/models.json", import.meta.url),
  JSON.stringify(
    { heightExaggeration: manifest.heightExaggeration, evidence },
    null,
    2,
  ),
);
console.log(
  "Ten models, twenty GLBs, hashes, budgets, elevation metadata and 120 attraction anchors validated.",
);
