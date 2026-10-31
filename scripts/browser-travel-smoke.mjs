import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(
  modulePath ? pathToFileURL(modulePath).href : "playwright"
);
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const base = process.env.BASE_URL || "http://localhost:3002";
const out = "artifacts/travel-browser";
await mkdir(out, { recursive: true });
const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage();
await context.addInitScript(() => {
  window.__globetrekPerformance = { lcpMs: null, cls: 0 };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      window.__globetrekPerformance.lcpMs = entry.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      if (!entry.hadRecentInput)
        window.__globetrekPerformance.cls += entry.value;
  }).observe({ type: "layout-shift", buffered: true });
});
const errors = [],
  failed = [];
const accessibility = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("requestfailed", (r) =>
  failed.push({ url: r.url(), reason: r.failure()?.errorText }),
);
async function capture(name) {
  if (name.startsWith("discovery"))
    await page.waitForFunction(
      () =>
        document.querySelector(".globe-host")?.dataset.globeState === "ready",
      {},
      { timeout: 15000 },
    );
  const maps = page.locator(".map-panel:visible");
  if (await maps.count())
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll(".map-panel")]
          .filter((el) => el.getBoundingClientRect().height > 0)
          .every((el) => el.dataset.mapState !== "loading"),
      {},
      { timeout: 22000 },
    );
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    `Overflow: ${name}`,
  );
  if (
    [
      "discovery-desktop",
      "planner-saved-desktop",
      "confirmed-desktop",
      "discovery-dark-mobile",
    ].includes(name)
  ) {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    accessibility.push({ name, violations: result.violations });
    await writeFile(
      `${out}/accessibility.json`,
      JSON.stringify(accessibility, null, 2),
    );
    assert.equal(
      result.violations.length,
      0,
      `Accessibility ${name}: ${result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(",")}`).join("; ")}`,
    );
  }
}
try {
  // Initial seeding may be slow on a fresh replica set; wait for a real health response.
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const r = await fetch(`${base}/api/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (r.ok) break;
      if (attempt === 119) throw Error("Demo did not become healthy.");
    } catch (e) {
      if (attempt === 119) throw e;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await page.goto(base);
  await page.getByRole("heading", { name: /A world to explore/ }).waitFor();
  await page.waitForTimeout(2500);
  await capture("discovery-desktop");
  await writeFile(
    `${out}/client-performance.json`,
    JSON.stringify(
      await page.evaluate(() => ({
        ...window.__globetrekPerformance,
        navigationMs: performance.getEntriesByType("navigation")[0]?.duration,
      })),
      null,
      2,
    ),
  );
  await page.getByRole("link", { name: "Explore Japan", exact: true }).click();
  await page.getByRole("heading", { name: "Japan", exact: true }).waitFor();
  await page.getByRole("button", { name: "Senso-ji", exact: true }).waitFor();
  await page.waitForTimeout(1500);
  await capture("country-desktop");
  await page
    .getByRole("button", { name: "Build your trip", exact: true })
    .click();
  await page.getByRole("button", { name: "Create my trip" }).click();
  await page.getByRole("heading", { name: "Your day, in order." }).waitFor();
  await page.getByRole("button", { name: "Add Senso-ji", exact: true }).click();
  await page
    .getByRole("button", { name: "Add Meiji Jingu", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move earlier", exact: true })
    .last()
    .click();
  await capture("planner-guest-desktop");
  await page.reload();
  await page
    .getByRole("button", { name: /Meiji Jingu.*min suggested/ })
    .waitFor();
  await page.getByRole("button", { name: "Stays", exact: true }).click();
  await page
    .getByRole("button", { name: "Add Tokyo House", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add stay", exact: true })
    .click();
  await page.getByRole("link", { name: "Log in to save" }).click();
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Travel Smoke");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(`smoke-${Date.now()}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("TravelSmokePassword123!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save trip to account", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review selected bookings", exact: true })
    .waitFor();
  await capture("planner-saved-desktop");
  await page
    .getByRole("button", { name: "Review selected bookings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Hold selected items", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm demo reservation", exact: true })
    .waitFor();
  await capture("hold-desktop");
  await page
    .getByRole("button", { name: "Confirm demo reservation", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "A journey to look forward to." })
    .waitFor();
  await capture("confirmed-desktop");
  await page
    .getByRole("button", { name: "Cancel whole reservation", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Release all items", exact: true })
    .click();
  await page.getByText("cancelled", { exact: true }).waitFor();
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    await page.getByRole("heading", { name: /A world to explore/ }).waitFor();
    await capture(`discovery-${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Use dark theme/ }).click();
  await capture("discovery-dark-mobile");
  await page.goto(`${base}/countries/JP`);
  await page.getByRole("button", { name: "Senso-ji", exact: true }).waitFor();
  await capture("country-mobile");
  await page.getByRole("button", { name: "Detailed map", exact: true }).click();
  await page.waitForTimeout(1200);
  await capture("country-mobile-map");
  assert.equal(errors.length, 0, `Browser exceptions: ${errors.join("; ")}`);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify({ passed: true, errors, failedRequests: failed }, null, 2),
  );
  console.log("Travel browser journey passed. Screenshots and result saved.");
} catch (e) {
  await capture("failure");
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      {
        passed: false,
        error: e.message,
        errors,
        failedRequests: failed,
        url: page.url(),
      },
      null,
      2,
    ),
  );
  throw e;
} finally {
  await browser.close();
}
