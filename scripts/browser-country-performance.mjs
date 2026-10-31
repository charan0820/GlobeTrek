import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import os from "node:os";

const base = process.env.BASE_URL || "http://localhost:3003";
const out = "artifacts/country-workspace";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const samples = [];
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    // A fresh context supplies a cold browser cache; the OS/server cache is not cleared.
    const context = await browser.newContext({
      viewport,
      hasTouch: viewport.width < 760,
    });
    const page = await context.newPage();
    await page.goto(`${base}/countries/IN`);
    await page.waitForFunction(
      () =>
        Number(document.querySelector(".country-model")?.dataset.renderFrames) >
        0,
    );
    const loaded = await page.evaluate(() => ({
      readyMs: performance.now(),
      pixelRatio: devicePixelRatio,
      resources: performance
        .getEntriesByType("resource")
        .filter((r) => /\.(js|glb)(\?|$)|\/relief\//.test(r.name))
        .map((r) => ({
          path: new URL(r.name).pathname,
          durationMs: r.duration,
          transferBytes: r.transferSize,
          encodedBytes: r.encodedBodySize,
        })),
    }));
    const framesBefore = await page
      .locator(".country-model")
      .getAttribute("data-render-frames");
    await page.waitForTimeout(500);
    const framesAfter = await page
      .locator(".country-model")
      .getAttribute("data-render-frames");
    assert.equal(
      framesBefore,
      framesAfter,
      "Idle model must not render continuously",
    );
    const interactionMs = [];
    for (let i = 0; i < 10; i++) {
      // Measure in-page activation to the next rendered frame, not Playwright transport time.
      interactionMs.push(
        await page.evaluate(
          () =>
            new Promise((resolve) => {
              const host = document.querySelector(".country-model");
              const initial = host.dataset.renderFrames;
              const observer = new MutationObserver(() => {
                if (host.dataset.renderFrames !== initial) {
                  observer.disconnect();
                  resolve(performance.now() - started);
                }
              });
              observer.observe(host, {
                attributes: true,
                attributeFilter: ["data-render-frames"],
              });
              const started = performance.now();
              [...document.querySelectorAll("button")]
                .find((b) => b.textContent === "Rotate right")
                .click();
            }),
        ),
      );
    }
    const control = page.getByRole("button", { name: "Zoom in", exact: true });
    const beforeKeyboard = await page
      .locator(".country-model")
      .getAttribute("data-render-frames");
    await control.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      (before) =>
        document.querySelector(".country-model").dataset.renderFrames !==
        before,
      beforeKeyboard,
    );
    if (viewport.width < 760) {
      const beforeTouch = await page
        .locator(".country-model")
        .getAttribute("data-render-frames");
      await page
        .getByRole("button", { name: "Rotate left", exact: true })
        .tap();
      await page.waitForFunction(
        (before) =>
          document.querySelector(".country-model").dataset.renderFrames !==
          before,
        beforeTouch,
      );
    }
    assert.equal(
      await page.locator(".globe-host canvas,.map-panel canvas").count(),
      0,
    );
    await page.getByRole("button", { name: "List", exact: true }).click();
    assert.equal(
      await page.locator(".country-model canvas,.map-panel canvas").count(),
      0,
    );
    samples.push({
      viewport,
      ...loaded,
      idleFramesAdded: Number(framesAfter) - Number(framesBefore),
      interactionMs,
    });
    await context.close();
  }
  const bundles = [];
  // Local rebuilds retain old chunks for already-open tabs. Measure only the
  // current entry's reachable graph rather than counting historical files.
  const pending = [
    ...(await readFile("client/dist/index.html", "utf8")).matchAll(
      /\/assets\/([\w-]+\.js)/g,
    ),
  ].map((m) => m[1]);
  const visited = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    const source = await readFile(`client/dist/assets/${file}`, "utf8");
    bundles.push({
      file,
      bytes: (await stat(`client/dist/assets/${file}`)).size,
    });
    for (const match of source.matchAll(/(?:assets\/|\.\/)([\w-]+\.js)/g))
      pending.push(match[1]);
  }
  await writeFile(
    `${out}/client-performance.json`,
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        machine: {
          platform: os.platform(),
          cpu: os.cpus()[0].model,
          logicalCpus: os.cpus().length,
          memoryGiB: os.totalmem() / 1024 ** 3,
          node: process.version,
        },
        limitations:
          "Headless Edge on one Windows developer machine, unthrottled localhost. Fresh browser contexts, warm OS/server cache. Mobile viewport is not mobile hardware. Timings cover button activation to next instrumented render, not continuous drag FPS or input-to-display latency. No hosted or scalability claim.",
        samples,
        bundles,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
console.log(
  "Country loading, bundle sizes, idle rendering and control-to-frame observations recorded.",
);
