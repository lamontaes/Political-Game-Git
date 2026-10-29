/* global console, process, document, URL */
// Run against a fresh bench: node src/bench/options.browser.mjs <screenshot.png>
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1672, height: 941 },
  });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.BENCH_URL ?? "http://localhost:3000/play");
  await page.locator("#front-options").click();
  const sheet = page.locator("#sheet");
  await sheet.waitFor();
  assert.equal(await sheet.locator('input[type="checkbox"]').count(), 1);
  assert.equal(
    await sheet.getByText("Skip opening", { exact: true }).count(),
    0,
  );
  const fullScreen = page.getByTestId("options-fullscreen");
  await fullScreen.check();
  await page.waitForFunction(() => Boolean(document.fullscreenElement));
  // External exit (Escape/native window controls) must update the checkbox.
  await page.evaluate(() => document.exitFullscreen());
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="options-fullscreen"]').checked,
  );
  await sheet.getByRole("button", { name: "Continue", exact: true }).click();
  await sheet.waitFor({ state: "hidden" });
  console.log(
    "PASS title Options, Continue, fullscreen entry and external exit",
  );

  const newLife = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const response = await newLife;
  assert.equal(response.status(), 200, await response.text());
  console.log(
    "Generated world:",
    new URL(response.url()).searchParams.get("seed"),
  );
  await page.locator("#card:not([hidden])").waitFor({ timeout: 60000 });
  await page.waitForFunction(
    () =>
      document.getElementById("card-name").textContent.trim() &&
      document.getElementById("card-clock").textContent.trim(),
  );
  const clock = await page.locator("#card-clock").textContent();
  const name = await page.locator("#card-name").innerText();
  console.log(
    "Player:",
    name,
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  await page.keyboard.press("Escape");
  await sheet.waitFor();
  assert.equal(
    await sheet.getByText("Skip opening", { exact: true }).count(),
    0,
  );
  assert.equal(await sheet.locator('input[type="checkbox"]').count(), 1);
  const box = await sheet.boundingBox();
  assert.ok(
    box &&
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= 1672 &&
      box.y + box.height <= 941,
  );
  assert.ok(box.height < 500, "Options stays compact");
  await page.waitForFunction(() =>
    [...document.images].every((img) => img.complete),
  );
  await page.evaluate(() => document.fonts.ready);
  if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
  await sheet.getByRole("button", { name: "Continue", exact: true }).click();
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  await page.keyboard.press("Escape");
  await page.getByTestId("quit-to-title").click();
  await page.getByTestId("title-menu").waitFor();
  await page.locator("#front-continue:not([disabled])").click();
  await page.locator("#card:not([hidden])").waitFor();
  await page.waitForFunction(
    () =>
      document.getElementById("card-name").textContent.trim() &&
      document.getElementById("card-clock").textContent.trim(),
  );
  assert.equal(await page.locator("#card-name").innerText(), name);
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  assert.deepEqual(errors, []);
  console.log(
    "PASS opening skip, compact Options, no interrupt toggles, no time spent, quit and resume the same life",
  );
} finally {
  await browser.close();
}
