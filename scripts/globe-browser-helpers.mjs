import assert from "node:assert/strict";
export async function globePoint(page, code) {
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".globe-stage").scrollIntoViewIfNeeded();
  const label = page.locator(`.globe-country-label[data-country="${code}"]`);
  await page.waitForFunction((c) => {
    const el = document.querySelector(
      `.globe-country-label[data-country="${c}"]`,
    );
    return (
      el?.dataset.front === "true" && Number.isFinite(Number(el.dataset.pointX))
    );
  }, code);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const point = await label.evaluate((el) => {
    const rect = el.closest(".globe-host").getBoundingClientRect();
    return {
      x: rect.x + Number(el.dataset.pointX),
      y: rect.y + Number(el.dataset.pointY),
    };
  });
  assert(point.x > 0 && point.y > 0, `Country ${code} is outside viewport`);
  return point;
}
export async function selectGlobeCountry(page, code) {
  const point = await globePoint(page, code);
  await page.mouse.move(point.x, point.y);
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(
    (c) => document.querySelector(".globe-host")?.dataset.selectedCountry === c,
    code,
  );
  await page.waitForTimeout(500);
}
