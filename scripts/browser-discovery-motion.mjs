import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.BASE_URL || "http://localhost:3003";
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const out = "artifacts/discovery-motion";
await mkdir(out, { recursive: true });
const results = [];
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    const japan = page.getByRole("link", { name: "Japan", exact: true });
    await japan.waitFor();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    const list = page.locator(".country-picks");
    await list.evaluate((e) => {
      e.scrollTop = e.scrollHeight;
      e.dispatchEvent(new Event("scroll"));
    });
    await page.waitForTimeout(100);
    const progress = page.getByRole("progressbar", {
      name: "Country list scroll position",
    });
    if (await progress.count())
      assert.equal(await progress.getAttribute("aria-valuenow"), "100");
    else await page.getByText("All matching countries visible").waitFor();
    await japan.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL("**/countries/JP");
    await page.locator('[data-country-workspace="JP"]').waitFor();
    await page.getByRole("button", { name: "List", exact: true }).click();
    assert.equal(
      await page.locator(".country-model canvas,.map-panel canvas").count(),
      0,
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: `${out}/japan-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Use dark theme" }).click();
    await page.screenshot({
      path: `${out}/japan-dark-${width}.png`,
      fullPage: true,
    });
    await page.goBack();
    assert.deepEqual(errors, []);
    results.push({
      width,
      keyboardEntry: true,
      reducedMotion: true,
      noOverflow: true,
      errors,
    });
    await context.close();
  }
  const page = await browser.newPage();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/countries", async (route) => {
    await gate;
    await route.abort();
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.getByText(/Loading your journey/).waitFor();
  release();
  await page.getByRole("alert").first().waitFor();
  results.push({ countryReadFailure: "visible alert" });
} finally {
  await writeFile(`${out}/checks.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log("Discovery motion checks passed", results);
