import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const base = process.env.BASE_URL || "http://localhost:3002";
const out = "artifacts/connected-maps";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage(),
  errors = [],
  checks = [],
  accessibility = [];
page.on("pageerror", (error) => errors.push(error.message));
const button = (name) => page.getByRole("button", { name, exact: true });
async function readyMap() {
  await page.waitForFunction(
    () => document.querySelector(".map-panel")?.dataset.mapState === "ready",
    {},
    { timeout: 30000 },
  );
}
async function firstMarker() {
  await button("Fit places").click();
  await page.waitForTimeout(350);
  await page.locator(".map-marker").first().click();
  const choices = page.locator(".overlap-picker");
  if (await choices.isVisible())
    await choices.getByRole("button").nth(1).click();
}
async function capture(name) {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    `Overflow: ${name}`,
  );
}
async function axe(name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  accessibility.push({ name, violations: result.violations });
  assert.equal(result.violations.length, 0, `Axe: ${name}`);
}
try {
  await page.goto(`${base}/countries/JP`);
  await button("Split").waitFor();
  await readyMap();
  assert.equal(await button("Split").getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator(".city-group").count(), 3);
  const cityNames = await page.locator(".city-group > h2").allTextContents();
  assert(
    cityNames[0].startsWith("Kyoto") &&
      cityNames[1].startsWith("Osaka") &&
      cityNames[2].startsWith("Tokyo"),
  );
  await button("List").click();
  assert.equal(await page.locator(".explorer-map").isVisible(), false);
  await button("Map").click();
  assert.equal(await page.locator(".place-list").isVisible(), false);
  await page.goBack();
  assert.equal(await button("List").getAttribute("aria-pressed"), "true");
  await button("Split").click();
  await firstMarker();
  await page.locator(".place-preview").waitFor();
  assert.equal(await page.locator(".place-row.is-selected").count(), 1);
  assert.equal(await page.locator(".map-marker.selected").count(), 1);
  await button("Close place preview").click();
  await button("Senso-ji").click();
  await page.locator(".place-preview").waitFor();
  await capture("country-light-desktop");
  await axe("country-preview-light");
  await button("Close place preview").click();
  await page.getByRole("button", { name: /Use dark theme/ }).click();
  await readyMap();
  await button("Senso-ji").click();
  await capture("country-dark-desktop");
  await axe("country-preview-dark");
  await page
    .locator(".place-list")
    .evaluate((element) => element.scrollTo(0, 0));
  await button("Show in list").click();
  await page.waitForFunction(() => {
    const list = document.querySelector(".place-list").getBoundingClientRect(),
      item = document
        .querySelector(".place-row.is-selected")
        .getBoundingClientRect();
    return item.top >= list.top - 1 && item.bottom <= list.bottom + 1;
  });
  await button("Senso-ji").click();
  checks.push(
    "Desktop List/Map/Split, URL Back, alphabetical city groups and bidirectional marker selection",
  );
  await button("Close place preview").click();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    if (width < 760) {
      await button("Split").waitFor({ state: "hidden" });
      await button("Map").click();
      await firstMarker();
      await page.getByRole("dialog").waitFor();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Show in list", exact: true })
        .click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert.equal(
        await page.locator(".place-row.is-selected").isVisible(),
        true,
      );
      await capture(`country-dark-${width}`);
    } else {
      await button("Split").click();
      await capture(`country-dark-${width}`);
    }
  }
  checks.push(
    "Responsive view controls and mobile photo sheet → Show in list at all five widths",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/planner/new?country=JP`);
  await button("Create my trip").click();
  await button("Add Senso-ji").click();
  await button("Add Meiji Jingu").click();
  await page
    .getByRole("button", { name: /^Day 2/ })
    .first()
    .click();
  await button("Add Senso-ji").click();
  await button("All days").click();
  await readyMap();
  await page.waitForFunction(
    () => document.querySelectorAll(".map-marker").length >= 2,
  );
  const overlap = page.getByRole("button", { name: /2 stops at Senso-ji/ });
  await overlap.click();
  await page
    .locator(".overlap-picker")
    .getByRole("button", { name: /Day 1.*Senso-ji/ })
    .click();
  await page.locator(".place-preview").waitFor();
  assert.equal(await page.locator(".stop-row.is-selected").count(), 1);
  assert.equal(await page.locator(".stop-row").count(), 2);
  await capture("planner-dark-overview");
  await axe("planner-overview");
  await page
    .locator(".day-panel")
    .evaluate((element) => element.scrollTo(0, element.scrollHeight));
  await button("Show in list").click();
  await page.waitForFunction(() => {
    const list = document.querySelector(".day-panel").getBoundingClientRect(),
      item = document
        .querySelector(".stop-row.is-selected")
        .getBoundingClientRect();
    return item.top >= list.top - 1 && item.bottom <= list.bottom + 1;
  });
  await page
    .locator(".add-place-preview")
    .filter({ hasText: "Kinkaku-ji" })
    .click();
  await page
    .locator(".place-preview")
    .getByRole("button", { name: "Add to Day 1", exact: true })
    .click();
  assert.equal(await page.locator(".stop-row").count(), 3);
  await page.reload();
  await page.waitForFunction(
    () => document.querySelectorAll(".stop-row").length === 3,
  );
  await button("Stays").click();
  await button("Add Tokyo House").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add stay", exact: true })
    .click();
  assert.equal(await page.locator(".stay-edit").count(), 1);
  await page.getByRole("button", { name: /Use light theme/ }).click();
  await readyMap();
  await capture("planner-light-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".add-place-preview")
    .filter({ hasText: "Tokyo House" })
    .click();
  await page.getByRole("dialog").waitFor();
  await axe("planner-mobile-sheet");
  await capture("planner-mobile-sheet");
  await page.keyboard.press("Escape");
  checks.push(
    "All-days routes, repeated-place occurrence selection, preview add, reload persistence and explicit stay picker",
  );
  await page.evaluate(() => {
    const key = "globetrek.draft.v1",
      saved = JSON.parse(localStorage.getItem(key));
    const start = new Date(`${saved.draft.startDate}T12:00:00Z`);
    const stops = saved.draft.days[0].stops;
    saved.draft.days = Array.from({ length: 30 }, (_, index) => {
      const day = new Date(start);
      day.setUTCDate(day.getUTCDate() + index);
      return {
        date: day.toISOString().slice(0, 10),
        stops: stops.map((stop) => ({ ...stop, id: crypto.randomUUID() })),
      };
    });
    saved.draft.endDate = saved.draft.days[29].date;
    saved.savedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload();
  await page.waitForFunction(
    () => document.querySelectorAll(".day-tabs button").length === 30,
  );
  await button("Map").click();
  await button("All days").click();
  await readyMap();
  assert.equal(await page.locator(".day-legend button").count(), 30);
  checks.push(
    "Thirty-day guest draft remains operable with all-days map and explicit day legend",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${base}/countries/JP?view=map`);
  await readyMap();
  await firstMarker();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.waitForFunction(() =>
    document.activeElement?.classList.contains("map-marker"),
  );
  checks.push(
    "Reduced-motion and Escape dismissal restore marker focus and preserve selection",
  );
  await context.route("**/destinations/places/*.webp", (route) =>
    route.abort(),
  );
  await page.goto(`${base}/countries/JP?view=list`);
  await page.locator(".photo-fallback").first().waitFor();
  await button("Senso-ji").click();
  await page.getByRole("dialog").waitFor();
  assert(
    await page
      .getByRole("dialog")
      .getByText("Photograph unavailable", { exact: true })
      .isVisible(),
  );
  await page.keyboard.press("Escape");
  checks.push(
    "Image failure preserves readable place details and preview actions",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify({ passed: true, checks, errors, accessibility }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, checks }));
} catch (error) {
  await capture("failure").catch(() => {});
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      { passed: false, error: error.stack, checks, errors, accessibility },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
