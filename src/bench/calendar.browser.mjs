/* global process, URL, console, document */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  if (await page.locator("#front-continue").isEnabled()) {
    await page.locator("#front-continue").click();
  } else {
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 300000 },
    );
    await page.locator("#new-life").click();
    await page.locator("#new-world").click();
    const r = await response;
    assert.equal(r.status(), 200);
    console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
    await page
      .locator("#opening-box:not([hidden])")
      .waitFor({ timeout: 120000 });
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Skip opening", exact: true })
      .click();
  }
  await page.waitForFunction(
    () =>
      document.getElementById("card-name").textContent.trim() &&
      document.getElementById("card-clock").textContent.trim(),
  );
  const name = await page.locator("#card-name").innerText();
  const clock = await page.locator("#card-clock").innerText();
  console.log(
    "Player:",
    name,
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  await page
    .locator('[data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".calendar-layout").waitFor();
  const month = await page.locator(".calendar-heading h3").innerText();
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  assert.notEqual(
    await page.locator(".calendar-heading h3").innerText(),
    month,
  );
  await page
    .getByRole("button", { name: "Previous month", exact: true })
    .click();
  assert.equal(await page.locator(".calendar-heading h3").innerText(), month);
  await page.locator(".month .day").last().click();
  assert.equal(await page.locator("#card-clock").innerText(), clock);
  assert.equal(await page.locator(".month").count(), 1);
  assert.ok(
    !(await page.locator("#sheet-body").innerText()).includes("undefined"),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/reports/calendar-readable-2026-10-14/calendar.png",
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  const box = await page.locator("#sheet").boundingBox();
  assert.ok(
    box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= 1024 &&
      box.y + box.height <= 768,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS one month, month navigation, day selection, unchanged clock, responsive panel",
  );
} finally {
  await browser.close();
}
