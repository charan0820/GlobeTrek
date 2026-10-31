import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
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
try {
  await page.route("**/api/estimates", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: { message: "Estimates temporarily unavailable." },
      }),
    }),
  );
  await page.goto(`${base}/countries/JP?kind=tours&view=list`);
  await page
    .getByRole("button", { name: "Retry estimates", exact: true })
    .waitFor();
  assert(await page.locator(".product-price strong").first().isVisible());
  assert(
    (await page
      .getByText("Selection estimate unavailable.", { exact: false })
      .count()) > 0,
  );
  await page.screenshot({ path: `${out}/price-error.png`, fullPage: true });
  await page.unroute("**/api/estimates");
  await page
    .getByRole("button", { name: "Retry estimates", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry estimates", exact: true })
    .waitFor({ state: "hidden" });
  checks.push(
    "Published tour unit rates remain visible alongside failed estimates and retry recovers",
  );
  await page.goto(`${base}/planner/new?country=JP`);
  await page
    .getByRole("button", { name: "Create my trip", exact: true })
    .click();
  await page.getByLabel("Trip name", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Stays", exact: true }).click();
  await page
    .getByRole("button", { name: "Add Tokyo House", exact: true })
    .click();
  await page.route("**/api/estimates/trip", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: { message: "Trip estimate temporarily unavailable." },
      }),
    }),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add stay", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry trip estimate", exact: true })
    .waitFor();
  assert.equal(await page.locator(".stay-edit").count(), 1);
  await page.screenshot({
    path: `${out}/planner-estimate-error.png`,
    fullPage: true,
  });
  await page.unroute("**/api/estimates/trip");
  await page
    .getByRole("button", { name: "Retry trip estimate", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry trip estimate", exact: true })
    .waitFor({ state: "hidden" });
  checks.push(
    "Trip estimate failure preserves selections, remains explicit without a total and recovers",
  );
  let intercepted = false;
  await page.route("**/api/estimates/trip", async (route) => {
    const body = route.request().postDataJSON();
    if (body.travelers === 3 && !intercepted) {
      intercepted = true;
      await new Promise((r) => setTimeout(r, 800));
    }
    await route.continue();
  });
  await page.getByLabel("Travelers", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Update dates and party" }).click();
  await page.getByLabel("Travelers", { exact: true }).fill("4");
  const latest = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/estimates/trip") &&
      r.request().postDataJSON().travelers === 4,
  );
  await page.getByRole("button", { name: "Update dates and party" }).click();
  const response = await latest,
    body = await response.json();
  const expected = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: body.data.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(body.data.total);
  await page.waitForTimeout(1000);
  assert(
    (
      await page
        .getByRole("region", { name: "Planning estimate" })
        .textContent()
    ).includes(expected),
  );
  checks.push(
    "A delayed superseded party estimate cannot overwrite the latest total",
  );
  await page.unroute("**/api/estimates/trip");
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    `${out}/estimates.json`,
    JSON.stringify({ checks, errors }, null, 2),
  );
  await browser.close();
}
console.log(
  "Estimate failure, retry, preserved selection and stale-response checks passed.",
);
