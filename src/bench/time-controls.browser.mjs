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
  const clockOf = async () => page.locator("#card-clock").innerText();
  const settle = async () =>
    page.waitForFunction(() => !document.getElementById("day").disabled);
  await settle();
  const start = await clockOf();
  // Week lives seven days (or stops early at a scene that needs the player).
  const week = page.waitForResponse(
    (r) => new URL(r.url()).searchParams.get("mode") === "week",
    { timeout: 300000 },
  );
  await page.locator("#week").click();
  const weekResult = await (await week).json();
  await settle();
  console.log(
    "Week:",
    start,
    "->",
    await clockOf(),
    "ended as",
    weekResult.packet.kind,
  );
  assert.notEqual(await clockOf(), start);
  // The calendar: a future day shows a skip-forward icon with no label text.
  await page
    .locator('[data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".calendar-layout").waitFor();
  const days = page.locator(".month .day");
  assert.equal(await page.locator(".calendar-skip").count(), 0);
  await days.last().click();
  const skip = page.locator(".calendar-skip");
  await skip.waitFor();
  assert.equal((await skip.innerText()).trim(), "");
  assert.ok(await skip.getAttribute("aria-label"));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/reports/time-controls-2026-10-15/calendar.png",
  });
  const skipped = page.waitForResponse(
    (r) => new URL(r.url()).searchParams.get("mode") === "to",
    { timeout: 300000 },
  );
  const target = await page
    .locator(".month .day.selected")
    .getAttribute("data-date");
  await skip.click();
  const result = await (await skipped).json();
  await settle();
  console.log(
    "Skip to",
    target,
    ": clock",
    await clockOf(),
    "ended as",
    result.packet.kind,
    result.packet.kind === "stop" ? `on ${result.packet.at.date}` : "",
  );
  assert.notEqual(await clockOf(), start);
  assert.deepEqual(errors, []);
  console.log("PASS Week, the calendar skip-forward icon, and its run");
} finally {
  await browser.close();
}
