import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { globePoint, selectGlobeCountry } from "./globe-browser-helpers.mjs";
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
  const point = await globePoint(page, "IN");
  await page.mouse.move(point.x, point.y);
  await page.waitForFunction(
    () =>
      document.querySelector(".globe-host")?.dataset.hoveredCountry === "IN" &&
      document.querySelector('[data-country="IN"]')?.dataset.altitude ===
        "0.025",
  );
  assert.equal(
    await page.locator('[data-country="IN"]').getAttribute("data-altitude"),
    "0.025",
  );
  await page.waitForTimeout(350);
  await page.screenshot({
    path: "artifacts/globe/hover-raised.png",
    fullPage: true,
  });
  await page.mouse.move(0, 0);
  await page.waitForFunction(
    () =>
      document.querySelector(".globe-host")?.dataset.hoveredCountry === "" &&
      document.querySelector('[data-country="IN"]')?.dataset.altitude ===
        "0.001",
  );
  assert.equal(
    await page.locator('[data-country="IN"]').getAttribute("data-altitude"),
    "0.001",
  );
  await selectGlobeCountry(page, "IN");
  await page.mouse.move(0, 0);
  assert.equal(
    await page.locator('[data-country="IN"]').getAttribute("data-altitude"),
    "0.055",
  );
  await page
    .locator(".country-dossier h2")
    .filter({ hasText: "India" })
    .waitFor();
  await page.screenshot({
    path: "artifacts/globe/restored.png",
    fullPage: true,
  });
  const host = await page.locator(".globe-host").boundingBox();
  await page.mouse.move(host.x + host.width / 2, host.y + host.height / 2 + 70);
  await page.mouse.down();
  await page.mouse.move(
    host.x + host.width / 2 + 95,
    host.y + host.height / 2 + 70,
    { steps: 15 },
  );
  await page.mouse.up();
  await page.waitForTimeout(700);
  await page.screenshot({
    path: "artifacts/globe/oblique-raised.png",
    fullPage: true,
  });
  const camera = JSON.parse(
    await page.locator(".globe-host").getAttribute("data-camera"),
  );
  await page
    .getByRole("button", { name: "Use dark theme", exact: true })
    .click();
  await page.waitForTimeout(200);
  const themed = JSON.parse(
    await page.locator(".globe-host").getAttribute("data-camera"),
  );
  assert(
    Math.abs(camera.lat - themed.lat) < 0.01 &&
      Math.abs(camera.lng - themed.lng) < 0.01,
    "Theme reset camera",
  );
  assert.equal(
    await page.locator(".globe-host").getAttribute("data-selected-country"),
    "IN",
  );
  await page.screenshot({
    path: "artifacts/globe/dark-oblique-raised.png",
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
  assert.equal(
    await page
      .getByRole("link", { name: "France", exact: true })
      .getAttribute("href"),
    "/countries/FR",
  );
  blocked = false;
  await page.getByRole("button", { name: "Retry globe", exact: true }).click();
  await ready();
  await page.getByRole("link", { name: "France", exact: true }).click();
  await page.getByRole("heading", { name: "France", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/globe/result.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "Restored local boundary file renders the globe",
          "Country selection remains connected",
          "Real pointer hover raises and leaves; click keeps selection raised",
          "Oblique drag reveals raised geometry and theme preserves camera/selection",
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
