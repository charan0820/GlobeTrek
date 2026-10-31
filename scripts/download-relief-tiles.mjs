import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { countries, tileZoom, tileXY } from "./relief-config.mjs";
const root = new URL("../.cache/relief/", import.meta.url);
const source = JSON.parse(
  await readFile(new URL("countries-10m.geojson", root)),
);
await mkdir(new URL("tiles/", root), { recursive: true });
const keys = new Set();
// Only tiles intersecting a polygon bounding box, rather than global terrain.
for (const feature of source.features.filter(
  (f) => countries[f.properties.ISO_A2_EH],
)) {
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  for (const polygon of polygons) {
    const points = polygon[0].map(([x, y]) => tileXY(x, y));
    const xs = points.map((p) => p[0]),
      ys = points.map((p) => p[1]);
    for (
      let x = Math.floor(Math.min(...xs));
      x <= Math.floor(Math.max(...xs));
      x++
    )
      for (
        let y = Math.floor(Math.min(...ys));
        y <= Math.floor(Math.max(...ys));
        y++
      )
        keys.add(`${tileZoom}/${x}/${y}`);
  }
}
if (keys.size > 600) throw Error(`Import exceeds 600-tile bound: ${keys.size}`);
const records = [];
for (const key of [...keys].sort()) {
  const file = key.replaceAll("/", "-") + ".png";
  const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${key}.png`;
  let bytes;
  try {
    bytes = await readFile(new URL(`tiles/${file}`, root));
  } catch {
    let last;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw Error(`${res.status} ${url}`);
        bytes = Buffer.from(await res.arrayBuffer());
        if (bytes.length > 1000000) throw Error("Unexpected tile size");
        await writeFile(new URL(`tiles/${file}`, root), bytes);
        break;
      } catch (error) {
        last = error;
      }
    }
    if (!bytes) throw last;
  }
  records.push({
    file,
    url,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  if (records.length % 20 === 0)
    console.log(`${records.length}/${keys.size} tiles`);
}
await writeFile(
  new URL("tiles.json", root),
  JSON.stringify(
    {
      retrievedAt: new Date().toISOString(),
      zoom: tileZoom,
      requests: records.length,
      bytes: records.reduce((s, r) => s + r.bytes, 0),
      records,
    },
    null,
    2,
  ),
);
console.log(
  `Complete: ${records.length} tiles, ${records.reduce((s, r) => s + r.bytes, 0)} bytes`,
);
