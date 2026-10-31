import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { globePoint } from "./globe-browser-helpers.mjs";
const base = process.env.BASE_URL || "http://localhost:3003",
  out = "artifacts/country-workspace";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    headless: true,
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  }),
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage(),
  checks = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const ready = () =>
  page.waitForFunction(() =>
    document.querySelector('[data-globe-state="ready"]'),
  );
try {
  await page.goto(base);
  await ready();
  const p = await globePoint(page, "JP");
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(800);
  assert.equal(new URL(page.url()).pathname, "/");
  checks.push("Single click retains selection on Explore");
  const point = await globePoint(page, "JP"),
    started = Date.now();
  await page.mouse.dblclick(point.x, point.y, { delay: 80 });
  await page.waitForURL("**/countries/JP");
  assert(Date.now() - started >= 500);
  checks.push("Double click enters after connected approach");
  await page.goBack();
  await ready();
  await page.getByRole("link", { name: "Italy", exact: true }).click();
  await page.waitForTimeout(100);
  await page.getByRole("link", { name: "India", exact: true }).click();
  await page.waitForURL("**/countries/IN");
  checks.push("Newer country supersedes unfinished transition");
  await page.goBack();
  await ready();
  const popup = context.waitForEvent("page");
  await page
    .getByRole("link", { name: "France", exact: true })
    .click({ modifiers: ["Control"] });
  const tab = await popup;
  await tab.waitForURL("**/countries/FR");
  await tab.close();
  assert.equal(new URL(page.url()).pathname, "/");
  checks.push("Modified country link keeps native new-tab behavior");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("link", { name: "Japan", exact: true }).click();
  await page.waitForURL("**/countries/JP");
  checks.push("Reduced-motion country entry");
  await page.goto(`${base}/countries/IN?view=list`);
  assert.equal(
    await page.locator(".country-model canvas,.map-panel canvas").count(),
    0,
  );
  await page.getByRole("button", { name: "Model", exact: true }).click();
  await page.locator('[data-model-state="ready"]').waitFor();
  const frames = await page
    .locator(".country-model")
    .getAttribute("data-render-frames");
  await page.waitForTimeout(500);
  assert.equal(
    await page.locator(".country-model").getAttribute("data-render-frames"),
    frames,
  );
  checks.push(
    "List mounts no geographic engine; model stays idle without rendering frames",
  );
  await page.route("**/relief/*-desktop.glb", (route) => route.abort());
  await page.goto(`${base}/countries/JP`);
  await page.locator('[data-model-state="error"]').waitFor();
  assert((await page.locator(".country-collection .place-row").count()) > 0);
  await page.getByRole("button", { name: "List", exact: true }).click();
  checks.push("Failed relief preserves complete list journey");
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    `${out}/entry.json`,
    JSON.stringify({ checks, errors }, null, 2),
  );
  await browser.close();
}
console.log("Country entry and rendering recovery checks passed.");
