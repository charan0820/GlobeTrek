import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [],
  base = process.env.BASE_URL || "http://localhost:3002";
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("artifacts/globe", { recursive: true });
const ready = () =>
  page.waitForFunction(
    () => document.querySelector(".globe-host")?.dataset.globeState === "ready",
    {},
    { timeout: 20000 },
  );
try {
  await page.goto(base);
  await ready();
  await page.getByRole("button", { name: "India", exact: true }).click();
  await page
    .locator(".country-dossier h2")
    .filter({ hasText: "India" })
    .waitFor();
  await page.screenshot({
    path: "artifacts/globe/restored.png",
    fullPage: true,
  });
  let calls = 0;
  await page.route("**/countries.geojson", (route) => {
    calls++;
    if (calls === 1)
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><title>Incomplete build</title>",
      });
    if (calls === 2)
      return route.fulfill({ status: 503, body: "temporarily unavailable" });
    return route.continue();
  });
  await page.reload();
  await ready();
  assert.equal(calls, 3);
  await page.unroute("**/countries.geojson");
  let blocked = true,
    failedRequests = 0;
  await page.route("**/countries.geojson", (route) => {
    if (blocked) {
      failedRequests++;
      return route.fulfill({ status: 503, body: "temporarily unavailable" });
    }
    return route.continue();
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Retry globe", exact: true })
    .waitFor();
  assert.equal(failedRequests, 3);
  await page.getByRole("button", { name: "France", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "France", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  blocked = false;
  await page.getByRole("button", { name: "Retry globe", exact: true }).click();
  await ready();
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/globe/result.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "Restored local boundary file renders the globe",
          "Country selection remains connected",
          "Invalid JSON and temporary failure recover with bounded retries",
          "Persistent failure preserves country list and explicit retry recovers",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log("Globe rendering and recovery checks passed");
} finally {
  await browser.close();
}
