import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 650 } });
const results = [];
try {
  await page.goto("http://localhost:3003");
  await page.locator('[data-globe-state="ready"]').waitFor();
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.getByRole("button", { name: "Use dark theme" }).click();
    const geometry = await page.locator(".globe-stage").boundingBox();
    assert(Math.abs(geometry.x + geometry.width / 2 - 720) < 2);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: `artifacts/fluid-atlas/short-desktop-${theme}.png`,
      fullPage: true,
    });
  }
  const panel = page.locator('[data-panel="discovery-right"]');
  await panel.evaluate((e) => (e.scrollTop = 220));
  const before = await panel.evaluate((e) => e.scrollTop);
  await panel
    .getByRole("button", { name: "Destinations", exact: true })
    .click();
  await page.waitForTimeout(300);
  await panel
    .getByRole("button", { name: "Destinations", exact: true })
    .click();
  await page.waitForTimeout(400);
  const after = await panel.evaluate((e) => e.scrollTop);
  assert(Math.abs(after - before) < 2, `scroll ${before} -> ${after}`);
  results.push({
    shortDesktop: true,
    globeCentred: true,
    scrollBefore: before,
    scrollAfter: after,
  });
  await page.locator(".island-trigger").click();
  await page.locator(".island-content").waitFor();
  await page.screenshot({
    path: "artifacts/fluid-atlas/island-expanded.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .locator(".island-trigger")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Destinations", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({
    path: "artifacts/fluid-atlas/mobile-destinations-sheet.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  results.push({ islandFocusRestored: true, mobileSheet: true });
} finally {
  await writeFile(
    "artifacts/fluid-atlas/detail-checks.json",
    JSON.stringify(results, null, 2),
  );
  await browser.close();
}
console.log("Short desktop, panel scroll and focus checks passed", results);
