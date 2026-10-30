// Build-time, bounded public Commons import. Never called by the application.
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { attractions } from "../server/src/seed/world.js";
const root = ".cache/place-photos";
await mkdir(`${root}/raw`, { recursive: true });
let records = [];
try {
  records = JSON.parse(await readFile(`${root}/records.json`, "utf8"));
} catch {
  /* First approved import. */
}
const overrides = JSON.parse(
  await readFile("scripts/place-image-overrides.json", "utf8"),
);
// Published selections are locked by reviewed title; removing an entry enables re-curation.
const reviewedTitles = JSON.parse(await readFile('scripts/place-image-review.json', 'utf8'));
for (const [id, title] of Object.entries(reviewedTitles)) if (typeof overrides[id] !== 'object') overrides[id] = title;
const usage = {
  startedAt: new Date().toISOString(),
  requests: 0,
  bytes: 0,
  failures: [],
  source: "Wikimedia Commons API and thumbnails",
};
const normalized = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
let lastApi = 0;
async function request(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (url.includes("/w/api.php")) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, 8000 - (Date.now() - lastApi))),
      );
      lastApi = Date.now();
    }
    usage.requests++;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000),
      headers: {
        "User-Agent":
          "GlobeTrekEducationalDemo/1.0 (attributed local destination assets)",
      },
    });
    await appendFile(
      `${root}/requests.jsonl`,
      JSON.stringify({
        at: new Date().toISOString(),
        url,
        status: response.status,
      }) + "\n",
    );
    if (response.status === 429 && attempt < 3) {
      const delay = Math.max(
        60,
        Number(response.headers.get("retry-after")) || 60,
      );
      console.log(`Provider requested a pause; retrying in ${delay}s`);
      await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      continue;
    }
    if (!response.ok) throw Error(`HTTP ${response.status}: ${url}`);
    return response;
  }
}
async function lookup(record) {
  const explicit = overrides[record.id];
  if (explicit && typeof explicit === "object")
    return {
      chosen: {
        title: explicit.title,
        imageinfo: [
          {
            thumburl: explicit.url,
            descriptionurl: explicit.source,
            extmetadata: {
              Artist: { value: explicit.creator },
              LicenseShortName: { value: explicit.license },
              LicenseUrl: { value: explicit.licenseUrl },
            },
          },
        ],
      },
      candidates: [],
    };
  for (const term of [
    explicit || `${record.name} ${record.city}`,
    record.name,
  ]) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "imageinfo",
      iiprop: "url|extmetadata|mime",
      iiurlwidth: "1100",
      ...(explicit?.startsWith("File:")
        ? { titles: explicit }
        : {
            generator: "search",
            gsrnamespace: "6",
            gsrlimit: "12",
            gsrsearch: term,
          }),
    });
    const response = await request(
      `https://commons.wikimedia.org/w/api.php?${params}`,
    );
    const json = await response.json();
    if (json.error) throw Error(`Commons API: ${json.error.code}`);
    const words = normalized(record.name)
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2);
    const candidates = Object.values(json.query?.pages || {}).filter(
      (page) =>
        /^image\/(jpeg|png|webp)$/.test(page.imageinfo?.[0]?.mime || "") &&
        /^(CC BY(?:-SA)? \d|CC0|Public domain)/.test(
          page.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value || "",
        ),
    );
    const score = (page) =>
      words.reduce(
        (total, word) =>
          total + (normalized(page.title).includes(word) ? 4 : 0),
        0,
      ) -
      (/map|drawing|painting|engraving|logo|plan of|portrait/i.test(page.title)
        ? 15
        : 0) -
      (page.index || 0) / 100;
    candidates.sort((a, b) => score(b) - score(a));
    if (candidates.length)
      return {
        chosen: candidates[0],
        candidates: candidates
          .slice(0, 5)
          .map((page) => ({
            title: page.title,
            source: page.imageinfo[0].descriptionurl,
          })),
      };
    if (explicit?.startsWith("File:")) break;
  }
  throw Error(`No licensed photograph for ${record.name}`);
}
const near = process.argv.find((arg) => arg.startsWith("--near="))?.slice(7);
const category = process.argv
  .find((arg) => arg.startsWith("--category="))
  ?.slice(11);
if (category) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "categorymembers",
    gcmtitle: `Category:${category}`,
    gcmnamespace: "6",
    gcmlimit: "100",
    prop: "coordinates|imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "400",
  });
  const response = await request(
    `https://commons.wikimedia.org/w/api.php?${params}`,
  );
  const json = await response.json();
  if (json.error) throw Error(`Commons API: ${json.error.code}`);
  await writeFile(`${root}/category.json`, JSON.stringify(json, null, 2));
  console.log(
    Object.values(json.query?.pages || {}).map((page) => ({
      title: page.title,
      coordinates: page.coordinates,
      gps: [
        page.imageinfo?.[0]?.extmetadata?.GPSLatitude,
        page.imageinfo?.[0]?.extmetadata?.GPSLongitude,
      ],
    })),
  );
}
if (near) {
  const record = attractions.find((item) => item.id === near);
  if (!record) throw Error("Unknown attraction");
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "geosearch",
    ggscoord: `${record.lat}|${record.lng}`,
    ggsradius: "700",
    ggslimit: "30",
    ggsnamespace: "6",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "400",
  });
  const response = await request(
    `https://commons.wikimedia.org/w/api.php?${params}`,
  );
  const json = await response.json();
  await writeFile(`${root}/near-${near}.json`, JSON.stringify(json, null, 2));
  console.log(Object.values(json.query?.pages || {}).map((page) => page.title));
  if (json.error) throw Error(`Commons API: ${json.error.code}`);
  await new Promise((resolve) => setTimeout(resolve, 50));
  process.exitCode = 0;
}
for (const record of near || category ? [] : attractions) {
  const existing = records.find((image) => image.id === record.id);
  if (
    existing &&
    (!overrides[record.id] ||
      existing.title === overrides[record.id] ||
      JSON.stringify(existing.override) ===
        JSON.stringify(overrides[record.id]))
  )
    continue;
  try {
    const { chosen, candidates } = await lookup(record),
      info = chosen.imageinfo[0],
      metadata = info.extmetadata;
    const response = await request(info.thumburl || info.url);
    if (Number(response.headers.get("content-length") || 0) > 2500000)
      throw Error("Image exceeds 2.5 MB import cap");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 2500000) throw Error("Image exceeds 2.5 MB import cap");
    usage.bytes += bytes.length;
    await writeFile(`${root}/raw/${record.id}`, bytes);
    records = records.filter((image) => image.id !== record.id);
    records.push({
      id: record.id,
      country: record.country,
      cityId: record.cityId,
      name: record.name,
      alt: record.name,
      title: chosen.title,
      source: info.descriptionurl,
      creator: (metadata.Artist?.value || "See source").replace(/<[^>]*>/g, ""),
      license: metadata.LicenseShortName.value,
      licenseUrl:
        metadata.LicenseUrl?.value ||
        "https://commons.wikimedia.org/wiki/Commons:Licensing",
      originalUrl: info.thumburl || info.url,
      candidates,
      override: overrides[record.id] || null,
      reviewed: false,
      importedAt: new Date().toISOString(),
    });
    await writeFile(`${root}/records.json`, JSON.stringify(records, null, 2));
    console.log(`${records.length}/120 ${record.name}: ${chosen.title}`);
  } catch (error) {
    usage.failures.push({ id: record.id, error: error.message });
    console.error(record.name, error.message);
  }
  await new Promise((resolve) => setTimeout(resolve, 350));
}
await writeFile(
  `${root}/usage-${Date.now()}.json`,
  JSON.stringify(usage, null, 2),
);
console.log(JSON.stringify({ downloaded: records.length, ...usage }));
if (records.length !== 120 || usage.failures.length) process.exitCode = 1;
