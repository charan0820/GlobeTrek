import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.BASE_URL || "http://localhost:3003",
  out = "artifacts/fluid-atlas";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const results = [],
  errors = [];
try {
  for (const width of [320, 390, 768, 1024, 1100, 1440, 1920]) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
      }),
      page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator(".island-trigger").waitFor();
    await page.locator(".island-trigger").click();
    if (width < 1100) {
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
    } else {
      await page.locator(".island-content").waitFor();
      await page.keyboard.press("Escape");
    }
    assert.equal(
      await page.locator(".island-trigger").getAttribute("aria-expanded"),
      "false",
    );
    if (width >= 1100) {
      const before = await page.locator(".globe-stage").boundingBox();
      await page
        .getByRole("button", { name: "Destinations", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Destinations", exact: true })
          .getAttribute("aria-expanded"),
        "false",
      );
      const after = await page.locator(".globe-stage").boundingBox();
      assert(Math.abs(before.x - after.x) < 1);
      await page
        .getByRole("button", { name: "Destinations", exact: true })
        .click();
    } else {
      await page
        .getByRole("button", { name: "Destinations", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
    }
    const japan = page.getByRole("link", { name: "Japan", exact: true });
    await japan.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL("**/countries/JP");
    await page.locator('[data-country-workspace="JP"]').waitFor();
    if (width < 1100) {
      await page
        .getByRole("button", { name: "Places and experiences", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Senso-ji", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Senso-ji", exact: true })
        .waitFor();
      await page.waitForFunction(
        () =>
          document.querySelectorAll('[role="dialog"][data-state="open"]')
            .length === 1,
      );
      await page.keyboard.press("Escape");
    }
    await page.getByRole("button", { name: "List", exact: true }).click();
    await page.locator(".country-collection .place-row").first().waitFor();
    assert.equal(
      await page.locator(".country-model canvas,.map-panel canvas").count(),
      0,
    );
    for (const theme of ["light", "dark"]) {
      if (theme === "dark")
        await page.getByRole("button", { name: "Use dark theme" }).click();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width} overflow`,
      );
      if ([390, 1440].includes(width)) {
        await page.screenshot({
          path: `${out}/japan-${width}-${theme}.png`,
          fullPage: true,
        });
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();
        assert.deepEqual(
          axe.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
        );
      }
    }
    await page
      .getByRole("button", { name: "Build your trip", exact: true })
      .click();
    if (width < 1100) {
      await page
        .getByRole("button", { name: "Dates and travelers", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
    }
    results.push({
      width,
      keyboard: true,
      island: true,
      panels: true,
      noOverflow: true,
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    `${out}/checks.json`,
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser.close();
}
console.log("Fluid atlas checks passed", results);
