// Explicit, reviewable download. No runtime image API or secret is needed.
import { mkdir, readFile, writeFile } from "node:fs/promises";
const terms = {
  IN: "Jaipur Hawa Mahal",
  JP: "Kiyomizu Kyoto",
  TH: "Wat Arun Bangkok",
  ID: "Ubud rice terraces",
  FR: "Paris Eiffel Tower",
  IT: "Rome Colosseum",
  ES: "Barcelona Sagrada Familia",
  GR: "Athens Acropolis",
  TR: "Istanbul Hagia Sophia",
  US: "San Francisco Golden Gate Bridge",
};
let manifest;
try {
  manifest = JSON.parse(
    await readFile("client/public/destinations/attribution.json", "utf8"),
  );
} catch {
  manifest = [];
}
await mkdir("client/public/destinations", { recursive: true });
for (const [country, term] of Object.entries(terms)) {
  if (manifest.some((m) => m.country === country)) continue;
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: term,
    gsrnamespace: "6",
    gsrlimit: "20",
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime",
    iiurlwidth: "1200",
    format: "json",
  });
  let json;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?${params}`,
      {
        headers: {
          "User-Agent":
            "GlobeTrekEducationalDemo/1.0 (local asset attribution importer)",
        },
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok)
      throw Error(`Commons search ${country}: ${response.status}`);
    json = await response.json();
    if (!json.error) break;
    await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
  }
  const candidates = Object.values(json.query?.pages || {}).filter(
    (p) =>
      p.imageinfo?.[0]?.mime === "image/jpeg" &&
      /^(CC BY|CC0|Public domain)/.test(
        p.imageinfo[0].extmetadata?.LicenseShortName?.value || "",
      ),
  );
  const page = candidates.sort((a, b) => a.index - b.index)[0];
  if (!page)
    throw Error(
      `No safely licensed JPEG for ${country}: ${JSON.stringify(json.error || Object.values(json.query?.pages || {}).map((p) => ({ name: p.title, license: p.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value })))}`,
    );
  const info = page.imageinfo[0],
    metadata = info.extmetadata;
  const image = await fetch(info.thumburl || info.url, {
    signal: AbortSignal.timeout(30000),
  });
  if (!image.ok) throw Error(`Image ${country}: ${image.status}`);
  await writeFile(
    `client/public/destinations/${country}.jpg`,
    Buffer.from(await image.arrayBuffer()),
  );
  manifest.push({
    country,
    file: `/destinations/${country}.jpg`,
    title: page.title,
    source: info.descriptionurl,
    creator: metadata.Artist?.value.replace(/<[^>]*>/g, "") || "See source",
    license: metadata.LicenseShortName.value,
    licenseUrl: metadata.LicenseUrl?.value,
    caption:
      "Representative destination photo; not a fictional property photograph.",
    importedAt: new Date().toISOString(),
  });
  await writeFile(
    "client/public/destinations/attribution.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(`${country}: ${page.title} (${metadata.LicenseShortName.value})`);
}
await writeFile(
  "client/public/destinations/attribution.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
