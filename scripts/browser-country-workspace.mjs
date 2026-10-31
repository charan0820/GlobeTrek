import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.BASE_URL || "http://localhost:3003",
  out = "artifacts/country-workspace";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage(),
  errors = [],
  checks = [],
  models = [],
  accessibility = [];
page.on("pageerror", (error) => errors.push(error.message));
const ready = async () => {
  await page.locator('[data-model-state="ready"]').waitFor({ timeout: 30000 });
  await page.waitForFunction(
    () =>
      Number(document.querySelector(".country-model")?.dataset.renderFrames) >
      0,
  );
};
async function shot(name) {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Horizontal overflow",
  );
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
try {
  await page.goto(`${base}/countries/IN`);
  await ready();
  await shot("india-desktop-light");
  const pin = page.locator(".relief-pin:visible").first();
  await pin.click();
  if (await page.locator(".relief-overlap").isVisible())
    await page.locator(".relief-overlap button").first().click();
  await page.getByRole("complementary", { name: /preview$/ }).waitFor();
  await page.getByRole("link", { name: "View full details" }).click();
  await page.locator(".workspace-product").waitFor();
  assert(new URL(page.url()).searchParams.has("item"));
  await page.goBack();
  await page.locator(".workspace-product").waitFor({ state: "hidden" });
  checks.push("Marker preview, detail panel and Back");
  await page.getByRole("button", { name: "Close place preview" }).click();
  await page
    .getByRole("button", { name: "Build your trip", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create my trip", exact: true })
    .click();
  await page.getByLabel("Trip name", { exact: true }).waitFor();
  await ready();
  await page.locator(".add-list .icon-button").first().click();
  assert.equal(await page.locator("[data-stop-id]").count(), 1);
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await ready();
  await page
    .getByRole("button", { name: "Build your trip", exact: true })
    .click();
  await ready();
  assert.equal(await page.locator("[data-stop-id]").count(), 1);
  await shot("india-plan-desktop");
  checks.push("Inline guest setup, add stop, mode switch preserves draft");
  for (const code of [
    "IN",
    "JP",
    "TH",
    "ID",
    "FR",
    "IT",
    "ES",
    "GR",
    "TR",
    "US",
  ]) {
    await page.goto(`${base}/countries/${code}`);
    const start = Date.now();
    await ready();
    models.push({ code, readyAfterNavigationMs: Date.now() - start });
    await shot(`model-${code}`);
    assert.equal(await page.locator(".country-model canvas").count(), 1);
    assert.equal(
      await page.locator(".globe-host canvas,.map-panel canvas").count(),
      0,
    );
  }
  await shot("us-desktop-light");
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await shot("us-desktop-dark");
  for (const width of [320, 390, 768, 1024, 1100, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/countries/IN`);
    await ready();
    await shot(`india-${width}-dark`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Use light theme" }).click();
  await shot("india-mobile-light");
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.getByRole("button", { name: "Use dark theme" }).click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    accessibility.push({
      theme,
      violations: result.violations.map((v) => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
    assert.equal(
      result.violations.length,
      0,
      JSON.stringify(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ),
    );
  }
  assert.equal(errors.length, 0, errors.join("\n"));
} finally {
  await writeFile(
    `${out}/browser.json`,
    JSON.stringify({ checks, models, accessibility, errors }, null, 2),
  );
  await browser.close();
}
console.log("Country workspace browser checks completed.");
