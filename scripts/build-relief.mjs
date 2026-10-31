import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import clipping from "polygon-clipping";
import earcut, { flatten } from "earcut";
import { PNG } from "pngjs";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { countries, tileXY, unwrap } from "./relief-config.mjs";
const root = new URL("../.cache/relief/", import.meta.url),
  output = new URL("../client/public/relief/", import.meta.url);
await mkdir(output, { recursive: true });
const source = JSON.parse(
  await readFile(new URL("countries-10m.geojson", root)),
);
const sourceRecords = JSON.parse(await readFile(new URL("sources.json", root)));
const tileRecords = JSON.parse(await readFile(new URL("tiles.json", root)));
const tiles = new Map();
for (const record of tileRecords.records)
  tiles.set(
    record.file,
    PNG.sync.read(await readFile(new URL(`tiles/${record.file}`, root))),
  );
function elevation(lng, lat, ocean = false) {
  const [x, y] = tileXY(lng, lat),
    key = `5-${Math.floor(x)}-${Math.floor(y)}.png`,
    tile = tiles.get(key);
  if (!tile) {
    if (ocean) return 0;
    throw Error(`Missing elevation source ${key} (${lng},${lat})`);
  }
  const i =
    (Math.min(255, Math.floor((y % 1) * 256)) * 256 +
      Math.min(255, Math.floor((x % 1) * 256))) *
    4;
  return Math.max(
    0,
    tile.data[i] * 256 + tile.data[i + 1] + tile.data[i + 2] / 256 - 32768,
  );
}
const extent = (points) => [
  Math.min(...points.map((p) => p[0])),
  Math.min(...points.map((p) => p[1])),
  Math.max(...points.map((p) => p[0])),
  Math.max(...points.map((p) => p[1])),
];
function intersection(a, b) {
  const round = (value, p) =>
    typeof value === "number"
      ? Math.round(value * p) / p
      : value.map((v) => round(v, p));
  for (const precision of [1e6, 1e4, 1e2]) {
    try {
      return clipping.intersection(round(a, precision), round(b, precision));
    } catch (error) {
      if (precision === 1e2) throw error;
    }
  }
}
function simplify(ring, tolerance) {
  // Keep every island; simplify only redundant vertices within each ring.
  const result = [ring[0]];
  for (let i = 1; i < ring.length - 1; i++)
    if (
      Math.hypot(ring[i][0] - result.at(-1)[0], ring[i][1] - result.at(-1)[1]) >
      tolerance
    )
      result.push(ring[i]);
  if (result.length < 3) return ring;
  result.push(result[0]);
  return result;
}
function glb(positions, indices, colors) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const arrays = [
    new Float32Array(positions),
    geometry.attributes.normal.array,
    new Float32Array(colors),
    new Uint32Array(indices),
  ];
  const offsets = [];
  let length = 0;
  for (const a of arrays) {
    offsets.push(length);
    length += a.byteLength;
  }
  const bin = Buffer.concat(
    arrays.map((a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength)),
  );
  const box = geometry.boundingBox;
  const json = {
    asset: { version: "2.0", generator: "GlobeTrek relief pipeline v1" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: "Atlas relief",
        pbrMetallicRoughness: {
          baseColorFactor: [1, 1, 1, 1],
          metallicFactor: 0,
          roughnessFactor: 1,
        },
        doubleSided: true,
      },
    ],
    buffers: [{ byteLength: length }],
    bufferViews: arrays.map((a, i) => ({
      buffer: 0,
      byteOffset: offsets[i],
      byteLength: a.byteLength,
      target: i === 3 ? 34963 : 34962,
    })),
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: positions.length / 3,
        type: "VEC3",
        min: box.min.toArray(),
        max: box.max.toArray(),
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: positions.length / 3,
        type: "VEC3",
      },
      {
        bufferView: 2,
        componentType: 5126,
        count: positions.length / 3,
        type: "VEC3",
      },
      {
        bufferView: 3,
        componentType: 5125,
        count: indices.length,
        type: "SCALAR",
      },
    ],
  };
  let js = Buffer.from(JSON.stringify(json));
  js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 32)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(js.length);
  jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length);
  bh.writeUInt32LE(0x004e4942, 4);
  geometry.dispose();
  return Buffer.concat([header, jh, js, bh, bin]);
}
const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  projection:
    "Regional equirectangular (central-latitude cosine); kilometres; explicit inset transforms",
  heightExaggeration: 8,
  sourceRecords,
  elevation: { ...tileRecords, records: tileRecords.records },
  budgets: {
    desktopTriangles: 100000,
    mobileTriangles: 25000,
    desktopBytes: 3000000,
    mobileBytes: 1000000,
  },
  countries: [],
};
for (const [code, config] of Object.entries(countries)) {
  const feature = source.features.find((f) => f.properties.ISO_A2_EH === code);
  if (!feature) throw Error(`Missing boundary ${code}`);
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  const groups = config.regions.map(([label, lng, lat], index) => ({
    id: `${code}-${index}`,
    label,
    center: [lng, lat],
    polygons: [],
    inset: index > 0,
  }));
  for (const polygon of polygons)
    groups[config.classify(polygon[0][0])].polygons.push(polygon);
  const regions = groups
    .filter((g) => g.polygons.length)
    .map((g, index) => {
      const [cx, cy] = g.center,
        cos = Math.cos((cy * Math.PI) / 180);
      const project = ([x, y]) => [
        (unwrap(x, cx) - cx) * 111.195 * cos,
        -(y - cy) * 111.195,
      ];
      const shape = g.polygons.map((poly) =>
        poly.map((ring) => ring.map(project)),
      );
      const bounds = extent(shape.flat(2));
      const scale =
        (index === 0 ? 100 : 28) /
        Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]);
      return {
        ...g,
        shape,
        bounds,
        scale,
        offset: index === 0 ? [0, 0] : [65, (index - 1) * 35 - 35],
        cos,
      };
    });
  const metadata = {
    version: 1,
    code,
    name: config.name,
    heightExaggeration: 8,
    insetNotice: "Inset spacing does not represent geographic distance.",
    regions: [],
  };
  // Compact height metadata also places offshore pins without moving coordinates.
  for (const region of regions) {
    const [x0, z0, x1, z1] = region.bounds,
      n = 96,
      heights = [];
    for (let j = 0; j <= n; j++)
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n,
          z = z0 + ((z1 - z0) * j) / n;
        heights.push(
          Math.round(
            elevation(
              region.center[0] + x / (111.195 * region.cos),
              region.center[1] - z / 111.195,
              true,
            ) / 2,
          ),
        );
      }
    const bytes = Buffer.from(new Uint16Array(heights).buffer);
    metadata.regions.push({
      id: region.id,
      label: region.label,
      center: region.center,
      bounds: region.bounds,
      scale: region.scale,
      offset: region.offset,
      inset: region.inset,
      grid: n,
      heightUnitMeters: 2,
      heights: bytes.toString("base64"),
      polygonCount: region.polygons.length,
    });
  }
  const variants = {};
  for (const [lod, resolution] of [
    ["desktop", 130],
    ["mobile", 44],
  ]) {
    const positions = [],
      colors = [],
      indices = [],
      vertices = new Map();
    function vertex(x, y, z, meters = 0) {
      const key = [x, y, z].map((v) => v.toFixed(5)).join(",");
      if (vertices.has(key)) return vertices.get(key);
      const id = positions.length / 3;
      positions.push(x, y, z);
      vertices.set(key, id);
      const h = meters;
      colors.push(
        ...(y < 0
          ? [0.58, 0.52, 0.41]
          : h > 4000
            ? [0.79, 0.77, 0.7]
            : h > 1500
              ? [0.64, 0.61, 0.49]
              : h > 300
                ? [0.6, 0.66, 0.47]
                : [0.82, 0.79, 0.64]),
      );
      return id;
    }
    for (const region of regions) {
      const [x0, z0, x1, z1] = region.bounds,
        size = Math.max(x1 - x0, z1 - z0) / resolution;
      const shape = region.shape.map((poly) =>
        poly.map((ring) => simplify(ring, size * 0.14)),
      );
      const ox = (x0 + x1) / 2,
        oz = (z0 + z1) / 2;
      const point = (x, z, base = false) => {
        const meters = base
          ? 0
          : elevation(
              region.center[0] + x / (111.195 * region.cos),
              region.center[1] - z / 111.195,
            );
        return vertex(
          (x - ox) * region.scale + region.offset[0],
          base ? -1.1 : (meters / 1000) * region.scale * 8,
          (z - oz) * region.scale + region.offset[1],
          meters,
        );
      };
      for (let z = z0; z < z1; z += size) {
        const strip = intersection(shape, [
          [
            [x0 - 1, z],
            [x1 + 1, z],
            [x1 + 1, z + size],
            [x0 - 1, z + size],
            [x0 - 1, z],
          ],
        ]);
        if (!strip.length) continue;
        for (let x = x0; x < x1; x += size) {
          const cells = intersection(strip, [
            [
              [x, z],
              [x + size, z],
              [x + size, z + size],
              [x, z + size],
              [x, z],
            ],
          ]);
          for (const polygon of cells) {
            const flat = flatten(polygon),
              triangulated = earcut(flat.vertices, flat.holes, 2);
            const ids = [];
            for (let k = 0; k < flat.vertices.length; k += 2)
              ids.push(point(flat.vertices[k], flat.vertices[k + 1]));
            // Flip winding because geographic north maps to negative Z.
            for (let k = 0; k < triangulated.length; k += 3)
              indices.push(
                ids[triangulated[k]],
                ids[triangulated[k + 2]],
                ids[triangulated[k + 1]],
              );
          }
        }
      }
      for (const polygon of shape)
        for (const ring of polygon)
          for (let i = 1; i < ring.length; i++) {
            const [x, z] = ring[i - 1],
              [a, b] = ring[i],
              top = point(x, z),
              next = point(a, b),
              bottom = point(x, z, true),
              bottomNext = point(a, b, true);
            indices.push(top, bottom, next, next, bottom, bottomNext);
          }
    }
    const bytes = glb(positions, indices, colors),
      file = `${code.toLowerCase()}-${lod}.glb`;
    await writeFile(new URL(file, output), bytes);
    variants[lod] = {
      file: `/relief/${file}`,
      bytes: bytes.length,
      triangles: indices.length / 3,
      vertices: positions.length / 3,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    console.log(code, lod, variants[lod].triangles, bytes.length);
  }
  const metaBytes = Buffer.from(JSON.stringify(metadata)),
    metaFile = `${code.toLowerCase()}.json`;
  await writeFile(new URL(metaFile, output), metaBytes);
  manifest.countries.push({
    code,
    name: config.name,
    polygonCount: polygons.length,
    regions: regions.map((r) => ({ id: r.id, label: r.label, inset: r.inset })),
    metadata: {
      file: `/relief/${metaFile}`,
      bytes: metaBytes.length,
      sha256: createHash("sha256").update(metaBytes).digest("hex"),
    },
    ...variants,
  });
}
await writeFile(
  new URL("manifest.json", output),
  JSON.stringify(manifest, null, 2),
);
await copyFile(
  new URL("terrain-attribution.md", root),
  new URL("TERRAIN-ATTRIBUTION.md", output),
);
console.log("All ten country models generated.");
