import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { globePoint, selectGlobeCountry } from "./globe-browser-helpers.mjs";

const base = process.env.BASE_URL || "http://localhost:3002";
const out = "artifacts/atlas";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  colorScheme: "light",
});
const page = await context.newPage();
const errors = [],
  checks = [],
  layouts = [],
  accessibility = [];
page.on("pageerror", (e) => errors.push(e.message));
const country = (name) => page.getByRole("link", { name, exact: true });
const ready = () =>
  page.waitForFunction(
    () => document.querySelector(".globe-host")?.dataset.globeState === "ready",
    {},
    { timeout: 25000 },
  );
const noOverflow = async () =>
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Horizontal overflow",
  );
async function capture(name) {
  await noOverflow();
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
async function axe(name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  accessibility.push({ name, violations: result.violations });
  assert.equal(result.violations.length, 0, `Accessibility: ${name}`);
}
try {
  await page.goto(base);
  await ready();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await country("Japan").getAttribute("data-selected"), "true");
  assert.equal(
    await page
      .getByRole("group", { name: "Available countries" })
      .getByRole("link")
      .count(),
    10,
  );
  await page.getByRole("link", { name: "Login", exact: true }).waitFor();
  await page
    .getByRole("link", { name: "Build your trip", exact: true })
    .waitFor();
  // Country names are real links, including ordinary browser Back semantics.
  const names = await page.locator(".country-picks a").allTextContents();
  for (const name of names) {
    await country(name.trim()).click();
    await page.waitForURL("**/countries/*");
    assert(new URL(page.url()).pathname.startsWith("/countries/"));
    await page
      .getByRole("heading", { name: name.trim(), exact: true })
      .waitFor();
    await page.goBack();
    await ready();
  }
  checks.push(
    "All ten country links open their destination page; Back returns to Explore",
  );
  await country("Japan").focus();
  await page.keyboard.press("Enter");
  await page.waitForURL("**/countries/JP");
  await page.getByRole("heading", { name: "Japan", exact: true }).waitFor();
  await page.goBack();
  await ready();
  checks.push("Country links support keyboard Enter and browser Back");
  await page.getByLabel("Find your country", { exact: true }).fill("fra");
  assert.equal(await page.locator(".country-picks a").count(), 1);
  assert.equal(
    await page.locator(".country-dossier h2").textContent(),
    "Japan",
  );
  await page
    .getByLabel("Find your country", { exact: true })
    .fill("zznonexistent");
  await page
    .getByText("No match in our ten-country collection.", { exact: false })
    .waitFor();
  await page
    .getByRole("button", { name: "Clear find your country", exact: true })
    .click();
  assert.equal(await page.locator(".country-picks a").count(), 10);
  checks.push(
    "Filtering, no results and clearing preserve destination selection",
  );
  const login = page.getByRole("link", { name: "Login", exact: true });
  await page.mouse.move(0, 0);
  const before = await login.boundingBox();
  await login.hover();
  await page.waitForTimeout(240);
  const hover = await login.evaluate((el) => ({
    opacity: Number(getComputedStyle(el, "::before").opacity),
    transform: getComputedStyle(el, "::before").transform,
    underline: getComputedStyle(el).textDecorationLine,
  }));
  assert(hover.opacity > 0.7 && hover.underline === "none");
  assert.deepEqual(await login.boundingBox(), before, "Hover moved the text");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(240);
  assert.equal(
    await login.evaluate((el) =>
      Number(getComputedStyle(el, "::before").opacity),
    ),
    0,
  );
  checks.push(
    "Shared hover surface slides/fades without moving or underlining navigation text",
  );

  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.getByRole("button", { name: "Use dark theme" }).click();
    await page.waitForFunction(
      (t) => document.querySelector(".globe-host")?.dataset.globeTheme === t,
      theme,
    );
    for (const width of [320, 390, 768, 1024, 1100, 1440, 1920]) {
      await page.setViewportSize({ width, height: width < 550 ? 844 : 1000 });
      await page.waitForTimeout(150);
      await noOverflow();
      const geometry = await page.evaluate(() => {
        const rect = document
          .querySelector(".globe-host")
          .getBoundingClientRect();
        const canvas = document
          .querySelector(".globe-host canvas")
          .getBoundingClientRect();
        const toggle = document
          .querySelector(".theme-header-slot .theme-toggle")
          .getBoundingClientRect();
        const search = document
          .querySelector(".atlas-countries .field")
          .getBoundingClientRect();
        const labels = [
          ...document.querySelectorAll(".globe-country-label:not([hidden])"),
        ].map((el) => el.getBoundingClientRect());
        for (let i = 0; i < labels.length; i++)
          for (let j = i + 1; j < labels.length; j++) {
            const a = labels[i],
              b = labels[j];
            if (
              a.left < b.right &&
              a.right > b.left &&
              a.top < b.bottom &&
              a.bottom > b.top
            )
              throw Error("Overlapping globe labels");
          }
        return {
          width: innerWidth,
          midpoint: rect.x + rect.width / 2,
          canvasWidth: canvas.width,
          containerWidth: rect.width,
          height: rect.height,
          themeRight: innerWidth - toggle.right,
          themeTop: toggle.top,
          searchBelowToggle: search.top >= toggle.bottom,
        };
      });
      assert(Math.abs(geometry.canvasWidth - geometry.containerWidth) <= 1);
      assert(
        geometry.themeRight <= 32 &&
          geometry.themeTop <= 50 &&
          geometry.searchBelowToggle,
        "Theme control placement or overlap",
      );
      if (width >= 1100)
        assert(
          Math.abs(geometry.midpoint - width / 2) <= 1,
          "Globe not viewport-centred",
        );
      layouts.push({ theme, ...geometry });
      if ([390, 1440, 1920].includes(width)) await capture(`${theme}-${width}`);
      if ([390, 1440].includes(width)) await axe(`${theme}-${width}`);
    }
  }
  checks.push(
    "Both themes fit seven widths and desktop globe stays viewport-centred",
  );
  await page.setViewportSize({ width: 1440, height: 650 });
  await page.waitForTimeout(200);
  await capture("dark-short-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.locator(".atlas-secondary summary").click();
  await page
    .getByRole("navigation", { name: "Your journeys" })
    .getByRole("link", { name: "My trips" })
    .waitFor();
  await page.locator(".atlas-secondary summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page.locator(".atlas-secondary").getAttribute("open"),
    null,
  );
  await page.getByLabel("Find your country", { exact: true }).focus();
  assert.equal(
    await page
      .getByLabel("Find your country", { exact: true })
      .evaluate((el) => document.activeElement === el),
    true,
  );
  checks.push("Mobile navigation disclosure works by pointer and keyboard");

  await page.getByRole("link", { name: "Explore Japan", exact: true }).click();
  await page.waitForURL("**/countries/JP");
  await page.getByRole("heading", { name: "Japan", exact: true }).waitFor();
  await noOverflow();
  await capture("country-dark-mobile");
  await page.goBack();
  await ready();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const motion = await login.evaluate((el) =>
    parseFloat(getComputedStyle(el, "::before").transitionDuration),
  );
  assert(motion < 0.001, "Reduced motion retained animated hover");
  await selectGlobeCountry(page, "IN");
  assert.equal(
    await page.locator(".globe-host").getAttribute("data-selected-country"),
    "IN",
  );
  assert.equal(
    await page.locator(".globe-host").getAttribute("data-globe-theme"),
    "dark",
  );
  checks.push("Country navigation, Back and reduced-motion selection work");
  await page.getByRole("link", { name: "Login", exact: true }).click();
  await page
    .getByRole("heading", { name: "Pick up where you left off.", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .waitFor();
  await noOverflow();
  await page.goBack();
  await ready();
  checks.push("Login link opens the working authentication form");
  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const touchPage = await touchContext.newPage();
  await touchPage.goto(base);
  const touchPoint = await globePoint(touchPage, "IN");
  await touchPage.touchscreen.tap(touchPoint.x, touchPoint.y);
  await touchPage.waitForFunction(
    () =>
      document.querySelector(".globe-host")?.dataset.selectedCountry === "IN",
  );
  await touchContext.close();
  checks.push("Touch tapping a real polygon selects and previews the country");
  // Read-only session fixture: no accounts, drafts or reservations are changed.
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: "atlas-review",
          name: "Atlas Reviewer",
          email: "atlas@example.test",
        },
      },
    }),
  );
  await page.reload();
  await page.getByRole("link", { name: "Account", exact: true }).waitFor();
  await page.unroute("**/api/auth/me");
  checks.push("Signed-in navigation uses Account");

  await page.route("**/fonts/*.ttf", (route) => route.abort());
  await page.reload();
  await ready();
  await noOverflow();
  await page
    .getByRole("link", { name: "Build your trip", exact: true })
    .waitFor();
  await capture("font-fallback-mobile");
  checks.push("Font download failure retains readable navigation and layout");
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/browser.json`,
    JSON.stringify(
      { passed: true, checks, layouts, accessibility, errors },
      null,
      2,
    ),
  );
  console.log("Atlas layout, interactions, themes and accessibility passed");
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true });
  await writeFile(
    `${out}/browser.json`,
    JSON.stringify(
      {
        passed: false,
        error: error.message,
        checks,
        layouts,
        accessibility,
        errors,
        url: page.url(),
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
