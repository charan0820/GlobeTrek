import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../.cache/relief/", import.meta.url);
await mkdir(root, { recursive: true });
const sources = [
  [
    "countries-10m.geojson",
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson",
  ],
  [
    "terrain-attribution.md",
    "https://raw.githubusercontent.com/tilezen/joerd/master/docs/attribution.md",
  ],
  [
    "terrain-formats.md",
    "https://raw.githubusercontent.com/tilezen/joerd/master/docs/formats.md",
  ],
];
const records = [];
for (const [file, url] of sources) {
  const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(new URL(file, root), bytes);
  records.push({
    file,
    url,
    retrievedAt: new Date().toISOString(),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await writeFile(
  new URL("sources.json", root),
  JSON.stringify(records, null, 2),
);
console.log(
  records.map(({ file, bytes, sha256 }) => ({ file, bytes, sha256 })),
);
