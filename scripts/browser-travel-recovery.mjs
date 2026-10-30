import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { addDays, dateKey } from "../shared/travel.js";
const base = process.env.BASE_URL || "http://localhost:3002",
  out = "artifacts/travel-recovery";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage();
const errors = [],
  checks = [],
  accessibility = [],
  usage = {};
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (response) => {
  const url = new URL(response.url());
  const key =
    url.origin === base
      ? url.pathname.startsWith("/api/")
        ? "application-api"
        : "local-assets"
      : url.host;
  usage[key] ||= { responses: 0, statuses: {} };
  usage[key].responses++;
  usage[key].statuses[response.status()] =
    (usage[key].statuses[response.status()] || 0) + 1;
});
const headers = { Origin: base };
async function request(path, method = "get", data) {
  const response = await context.request[method](`${base}/api${path}`, {
    headers,
    ...(data !== undefined && { data }),
  });
  const body = await response.json();
  assert(response.ok(), `${method} ${path}: ${body.error?.code}`);
  return body.data;
}
async function check(name, action) {
  await action();
  checks.push(name);
  console.log(`Passed: ${name}`);
}
async function a11y(name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  accessibility.push({ name, violations: result.violations });
  assert.equal(
    result.violations.length,
    0,
    `${name}: ${result.violations.map((v) => v.id).join(",")}`,
  );
}
try {
  await request("/auth/register", "post", {
    name: "Recovery Traveler",
    email: `recovery-${Date.now()}@example.test`,
    password: "RecoveryPassword123!",
  });
  const start = addDays(dateKey(new Date()), 7),
    end = addDays(start, 3);
  const hotels = await request("/catalog?country=JP&kind=stays"),
    hotel = hotels[0];
  const trip = await request("/trips", "post", {
    name: "Recovery journey",
    country: "JP",
    startDate: start,
    endDate: end,
    travelers: 2,
    days: Array.from({ length: 4 }, (_, i) => ({
      date: addDays(start, i),
      stops: [],
    })),
    stays: [
      {
        hotelId: hotel._id,
        roomTypeId: hotel.roomTypes[0]._id,
        checkIn: start,
        checkOut: addDays(start, 2),
      },
    ],
  });
  await check(
    "offline autosave survives reload and explicit recovery",
    async () => {
      await page.goto(`${base}/planner/${trip._id}`);
      await page.getByLabel("Trip name", { exact: true }).waitFor();
      await page.route(`**/api/trips/${trip._id}`, (route) =>
        route.request().method() === "PATCH"
          ? route.abort("failed")
          : route.continue(),
      );
      await page
        .getByLabel("Trip name", { exact: true })
        .fill("Offline browser edits");
      await page
        .getByText("Not saved — your edits remain here", { exact: true })
        .waitFor();
      await page.reload();
      await page
        .getByRole("button", { name: "Restore browser edits", exact: true })
        .waitFor();
      await page.unroute(`**/api/trips/${trip._id}`);
      await page
        .getByRole("button", { name: "Restore browser edits", exact: true })
        .click();
      await page
        .locator(".save-status")
        .filter({ hasText: /^Saved$/ })
        .waitFor();
      assert.equal(
        (await request(`/trips/${trip._id}`)).name,
        "Offline browser edits",
      );
    },
  );
  await check(
    "stale tab cannot overwrite another tab and can save a copy",
    async () => {
      const current = await request(`/trips/${trip._id}`);
      const {
        user: _u,
        _id: _id,
        revision,
        __v: _v,
        createdAt: _c,
        updatedAt: _t,
        reservationEpoch: _e,
        ...draft
      } = current;
      await request(`/trips/${trip._id}`, "patch", {
        ...draft,
        name: "Other tab version",
        expectedRevision: revision,
      });
      await page
        .getByLabel("Trip name", { exact: true })
        .fill("My conflicted edits");
      await page
        .getByRole("button", { name: "Save my edits as a copy", exact: true })
        .waitFor();
      assert.equal(
        (await request(`/trips/${trip._id}`)).name,
        "Other tab version",
      );
      await page
        .getByRole("button", { name: "Save my edits as a copy", exact: true })
        .click();
      await page.waitForURL(
        (url) =>
          url.pathname.startsWith("/planner/") &&
          !url.pathname.endsWith(trip._id),
      );
      assert.equal(
        await page.getByLabel("Trip name", { exact: true }).inputValue(),
        "My conflicted edits",
      );
      await a11y("planner-conflict-recovered");
    },
  );
  await check(
    "authored calendar closes with Escape and restores focus",
    async () => {
      await page.goto(`${base}/planner/new?country=JP`);
      await page
        .getByRole("button", { name: "Choose first day", exact: true })
        .click();
      await page.getByRole("dialog").getByRole("grid").waitFor();
      await a11y("calendar-dialog");
      await page.keyboard.press("Escape");
      assert(
        await page
          .getByRole("button", { name: "Choose first day", exact: true })
          .evaluate((el) => el === document.activeElement),
      );
      await page.getByLabel("First day", { exact: true }).fill("2026-99-99");
      await page
        .getByRole("button", { name: "Choose first day", exact: true })
        .click();
      await page.getByRole("dialog").getByRole("grid").waitFor();
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "a lost hold response is retried with the original key",
    async () => {
      const tours = await request("/catalog?country=JP&kind=tours"),
        tour = tours[0];
      await page.goto(`${base}/discover/tours/${tour._id}`);
      const departures = await request(
        `/catalog/tours/${tour._id}/departures?from=${addDays(dateKey(new Date()), 1)}&to=${addDays(dateKey(new Date()), 2)}`,
      );
      assert(departures.length);
      await page
        .getByLabel("Departure", { exact: true })
        .selectOption(departures[0]._id);
      await page
        .getByRole("button", {
          name: "Review availability and price",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Hold selected items", exact: true })
        .waitFor();
      const before = await request("/reservations");
      let lost = false;
      await page.route("**/api/reservations", async (route) => {
        if (route.request().method() === "POST" && !lost) {
          lost = true;
          await route.fetch();
          await route.abort("failed");
        } else await route.continue();
      });
      await page
        .getByRole("button", { name: "Hold selected items", exact: true })
        .click();
      await page
        .getByRole("link", { name: "Check reservations before retrying" })
        .waitFor();
      await page
        .getByRole("button", { name: "Hold selected items", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Confirm demo reservation", exact: true })
        .waitFor();
      const after = await request("/reservations");
      assert.equal(after.length, before.length + 1);
      await page
        .getByRole("button", { name: "Confirm demo reservation", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "A journey to look forward to." })
        .waitFor();
      await request(`/reservations/${after[0]._id}`, "delete");
    },
  );
  await check(
    "fixed package uses a separate review and reservation journey",
    async () => {
      const packages = await request("/catalog?country=JP&kind=packages");
      await page.goto(`${base}/discover/packages/${packages[0]._id}`);
      const rows = await request(
        `/catalog/packages/${packages[0]._id}/departures?from=${addDays(dateKey(new Date()), 1)}&to=${addDays(dateKey(new Date()), 29)}`,
      );
      assert(rows.length);
      await page
        .getByLabel("Departure", { exact: true })
        .selectOption(rows[0]._id);
      await page
        .getByRole("button", {
          name: "Review availability and price",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Hold selected items", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Confirm demo reservation", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "A journey to look forward to." })
        .waitFor();
      const reservation = (await request("/reservations"))[0];
      assert.equal(reservation.source.kind, "package");
      assert.equal(
        reservation.items.filter((i) => i.kind === "stay").length,
        2,
      );
      assert.equal(
        reservation.items.filter((i) => i.kind === "tour").length,
        2,
      );
      await request(`/reservations/${reservation._id}`, "delete");
    },
  );
  await check(
    "template copies are editable and do not mutate their source",
    async () => {
      const templates = await request("/catalog?country=JP&kind=templates"),
        original = await request(`/catalog/templates/${templates[0].id}`);
      await page.goto(`${base}/discover/templates/${original.id}`);
      await page.getByRole("link", { name: "Use this itinerary" }).click();
      await page.getByRole("button", { name: "Create my trip" }).click();
      await page
        .getByRole("heading", { name: "Your day, in order." })
        .waitFor();
      await page
        .locator(".stop-row")
        .first()
        .getByRole("button", { name: /^Remove / })
        .click();
      const unchanged = await request(`/catalog/templates/${original.id}`);
      assert.deepEqual(unchanged.days, original.days);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Map", exact: true }).click();
      await page.getByRole("button", { name: "Day plan", exact: true }).click();
      assert.equal(await page.locator(".stop-row").count(), 1);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await a11y("planner-mobile");
      await page.screenshot({
        path: `${out}/planner-mobile.png`,
        fullPage: true,
      });
    },
  );
  await check("draft copy and deletion preserve the original", async () => {
    await page.goto(`${base}/trips`);
    const card = page.locator("article.trip-row").filter({
      has: page.getByRole("link", { name: "Other tab version", exact: true }),
    });
    await card.getByRole("button", { name: "Copy trip", exact: true }).click();
    await page.getByLabel("Trip name", { exact: true }).waitFor();
    const copied = page.url().split("/").at(-1);
    assert.notEqual(copied, trip._id);
    await page.goto(`${base}/trips`);
    const copyCard = page.locator("article.trip-row").filter({
      has: page.getByRole("link", {
        name: "Other tab version copy",
        exact: true,
      }),
    });
    await copyCard
      .getByRole("button", { name: "Delete draft", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete draft", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert((await request("/trips")).some((t) => t._id === trip._id));
    assert(!(await request("/trips")).some((t) => t._id === copied));
  });
  await check(
    "country filters, clear and browser navigation remain synchronized",
    async () => {
      await page.goto(`${base}/countries/JP`);
      await page.getByLabel("Search this collection").fill("zzznomatch");
      await page
        .getByRole("heading", { name: "No places match yet." })
        .waitFor();
      await page
        .getByRole("button", { name: "Clear search this collection" })
        .click();
      await page.getByRole("button", { name: "Senso-ji", exact: true }).waitFor();
      await page.getByLabel("City", { exact: true }).selectOption("jp-kyoto");
      await page
        .getByRole("button", { name: "Fushimi Inari Taisha", exact: true })
        .waitFor();
      await page.goBack();
      assert.equal(
        await page.getByLabel("City", { exact: true }).inputValue(),
        "",
      );
    },
  );
  await check(
    "map-provider and WebGL failures leave accessible discovery usable",
    async () => {
      const fallbackContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
        colorScheme: "dark",
      });
      await fallbackContext.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return /webgl/i.test(type)
            ? null
            : original.call(this, type, ...args);
        };
      });
      await fallbackContext.route("https://tiles.openfreemap.org/**", (route) =>
        route.abort("failed"),
      );
      const fallback = await fallbackContext.newPage();
      await fallback.goto(base);
      await fallback
        .getByRole("button", { name: "Japan", exact: true })
        .click();
      await fallback
        .getByRole("link", { name: "Explore Japan", exact: true })
        .click();
      await fallback
        .getByRole("button", { name: "Senso-ji", exact: true })
        .waitFor();
      await fallbackContext.close();
    },
  );
  assert.equal(errors.length, 0, errors.join("; "));
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      { passed: true, checks, errors, accessibility, usage },
      null,
      2,
    ),
  );
  console.log("Extended recovery and product journeys passed.");
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true });
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      {
        passed: false,
        error: error.message,
        url: page.url(),
        checks,
        errors,
        accessibility,
        usage,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
