import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const out = "artifacts/scrolling";
await mkdir(out, { recursive: true });
try {
  await page.goto("http://localhost:3002/countries/US?view=list");
  await page
    .getByRole("button", { name: "Waikiki Beach", exact: true })
    .waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.mouse.move(10, 400);
  await page.evaluate(() => {
    window.__scrollFrames = [];
    const sample = (t) => {
      window.__scrollFrames.push({ t, y: scrollY });
      window.__scrollRaf = requestAnimationFrame(sample);
    };
    window.__scrollRaf = requestAnimationFrame(sample);
  });
  await page.mouse.wheel(0, 360);
  await page.waitForTimeout(750);
  const frames = await page.evaluate(() => {
    cancelAnimationFrame(window.__scrollRaf);
    return window.__scrollFrames;
  });
  const moving = frames.filter((f) => f.y > 0);
  assert(moving.length > 5);
  assert(moving[0].y < 300);
  assert(Math.abs(moving.at(-1).y - 360) < 3);
  const at = (ms) => moving.find((f) => f.t - moving[0].t >= ms)?.y;
  assert(at(240) > at(64));
  assert(at(128) - at(32) > at(320) - at(224), "Wheel motion must decelerate");
  await page.mouse.wheel(0, 360);
  await page.waitForTimeout(50);
  const beforeReverse = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(200);
  assert(
    (await page.evaluate(() => scrollY)) < beforeReverse,
    "Direction reversal must discard queued travel",
  );
  await page.waitForTimeout(400);
  const list = page.locator(".place-list");
  await list.hover();
  await page.waitForTimeout(350);
  await list.evaluate((el) => el.scrollTo({ top: 0, behavior: "instant" }));
  const rootBefore = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(650);
  assert((await list.evaluate((el) => el.scrollTop)) >= 235);
  assert(
    Math.abs((await page.evaluate(() => scrollY)) - rootBefore) < 3,
    "Nested wheel must not move the page",
  );
  await list.evaluate((el) =>
    el.scrollTo({ top: el.scrollHeight, behavior: "instant" }),
  );
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(300);
  assert(
    Math.abs((await page.evaluate(() => scrollY)) - rootBefore) < 3,
    "Contained lists must not chain at their end",
  );
  const passThrough = await page.evaluate(() => {
    const target = document.getElementById("main");
    return [
      new WheelEvent("wheel", { deltaY: 5, bubbles: true, cancelable: true }),
      new WheelEvent("wheel", {
        deltaY: 120,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
      new WheelEvent("wheel", {
        deltaX: 120,
        deltaY: 1,
        bubbles: true,
        cancelable: true,
      }),
    ].map((e) => {
      target.dispatchEvent(e);
      return !e.defaultPrevented;
    });
  });
  assert(passThrough.every(Boolean));
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await page.evaluate(() => {
    const e = new WheelEvent("wheel", {
      deltaY: 120,
      bubbles: true,
      cancelable: true,
    });
    document.getElementById("main").dispatchEvent(e);
    return !e.defaultPrevented;
  });
  assert(reduced, "Reduced motion must use native scrolling");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto("http://localhost:3002/countries/US?view=list");
  await page
    .getByRole("button", { name: "Waikiki Beach", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.hover();
  const behind = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 180);
  await page.waitForTimeout(650);
  assert.equal(
    await page.evaluate(() => scrollY),
    behind,
    "Modal wheel must not move background",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    out + "/result.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "wheel has a measurable decelerating tail",
          "direction reversal discards queued travel",
          "nested lists scroll without moving page",
          "nested list boundaries remain contained",
          "fine trackpad, browser zoom and horizontal input pass through",
          "reduced motion uses native scrolling",
          "modal background stays locked",
        ],
        frames,
        errors,
      },
      null,
      2,
    ),
  );
  console.log("Momentum scrolling checks passed");
} finally {
  await browser.close();
}
