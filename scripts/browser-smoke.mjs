import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
// For this workstation point PLAYWRIGHT_MODULE at the bundled playwright/index.mjs.
// Else install playwright locally as an optional development tool.
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  channel: process.env.BROWSER_CHANNEL || "msedge",
});
const base = process.env.BASE_URL || "http://localhost:3000";
const directory = "artifacts/screenshots";
await mkdir(directory, { recursive: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
async function noOverflow() {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    "Horizontal overflow",
  );
}
try {
  await page.goto(base);
  await page.getByText("6 stays in the collection").waitFor();
  await noOverflow();
  await page.screenshot({ path: `${directory}/desktop.png`, fullPage: true });
  await page.getByLabel("Destination").selectOption("Jaipur");
  await page.getByText("2 stays in the collection").waitFor();
  await page.getByLabel("Find a hotel").fill("does not exist");
  await page.getByRole("button", { name: "Search stays" }).click();
  await page.getByText("No stays found.").waitFor();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByText("6 stays in the collection").waitFor();
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  const email = `browser-${Date.now()}@example.test`,
    password = "browser-demo-password-987";
  await page.getByLabel("Your name").fill("Demo Traveler");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByText("A blank page, for now.").waitFor();
  await page
    .getByRole("link", { name: "Explore stays", exact: true })
    .first()
    .click();
  await page
    .getByRole("link", { name: "View stay", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Check availability" }).click();
  await page.getByText("Available for your stay").waitFor();
  await page.screenshot({ path: `${directory}/quote.png`, fullPage: true });
  await page.getByRole("button", { name: "Confirm demo reservation" }).click();
  await page
    .getByText("Your demo reservation is confirmed.", { exact: false })
    .waitFor();
  await page.getByText("Confirmed", { exact: true }).waitFor();
  await page.screenshot({ path: `${directory}/bookings.png`, fullPage: true });
  await page
    .getByRole("button", { name: "Cancel reservation", exact: true })
    .click();
  await page.getByRole("button", { name: "Yes, cancel", exact: true }).click();
  await page.getByText("Cancelled", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByText("Your demo reservation is confirmed.", { exact: false })
      .count(),
    0,
    "Confirmation message must clear after cancellation",
  );
  await page.screenshot({ path: `${directory}/cancelled.png`, fullPage: true });
  await page.getByRole("button", { name: "Log out", exact: false }).click();
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByText("Cancelled", { exact: true }).waitFor();
  await page.reload();
  await page.getByText("Cancelled", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.getByText("6 stays in the collection").waitFor();
  await noOverflow();
  await page.screenshot({ path: `${directory}/mobile.png`, fullPage: true });
  await page
    .getByRole("link", { name: "View stay", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Check availability" }).click();
  await page.getByText("Available for your stay").waitFor();
  await noOverflow();
  await page.screenshot({
    path: `${directory}/mobile-detail.png`,
    fullPage: true,
  });
  assert.deepEqual(errors, [], "Uncaught browser errors");
  const result = {
    passed: true,
    browser: "Edge headless",
    viewports: ["1440x1000", "390x844"],
    scenarios: [
      "catalog",
      "filter",
      "empty result",
      "register",
      "availability",
      "reserve",
      "history",
      "cancel",
      "logout",
      "login",
      "deep-link refresh",
      "mobile catalog/detail",
      "no horizontal overflow",
    ],
    pageErrors: errors,
  };
  await writeFile(
    "artifacts/browser-smoke.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
