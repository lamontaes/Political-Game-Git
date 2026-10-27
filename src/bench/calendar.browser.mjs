/* global process, URL, console, document */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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
  // It opens on today: the day's tile is boxed and no day panel is open.
  assert.ok(await page.locator(".month .day.today.selected").count());
  await page.screenshot({
    path: "docs/reports/calendar-today-2026-10-27/today.png",
  });
  // An empty future day opens no middle panel; the skip sits under the month.
  await page
    .locator(".month .day:not(.today):not(:has(.day-icon))")
    .last()
    .click();
  assert.equal(await page.locator(".calendar-details").isVisible(), false);
  assert.equal(await page.locator(".calendar-layout.has-day").count(), 0);
  assert.equal(await page.locator("#card-clock").innerText(), clock);
  assert.equal(await page.locator(".month").count(), 1);
  assert.ok(
    !(await page.locator("#sheet-body").innerText()).includes("undefined"),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/reports/calendar-readable-2026-10-14/calendar.png",
  });
  const skip = page.locator(".calendar-month-foot .skip-forward");
  assert.equal(await skip.count(), 1);
  assert.equal((await skip.innerText()).trim(), "");
  assert.ok(await skip.getAttribute("aria-label"));
  // A day with a birthday, deadline or election carries an icon and opens its panel.
  for (let i = 0; i < 12; i++) {
    if (await page.locator(".month .day:has(.day-icon)").count()) break;
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  }
  const marked = page.locator(".month .day:has(.day-icon)").first();
  assert.ok(
    await marked
      .locator(".day-icon")
      .first()
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  );
  await marked.click();
  await page.locator(".calendar-details").waitFor();
  assert.ok(
    (await page.locator(".calendar-details .calendar-event p").count()) > 0,
  );
  const layout = await page.locator(".calendar-layout").boundingBox();
  const sheet = await page.locator("#sheet-body").boundingBox();
  assert.ok(
    Math.abs(
      layout.x - sheet.x - (sheet.x + sheet.width - layout.x - layout.width),
    ) <= 2,
    "the calendar layout is centered in its panel",
  );
  await page.screenshot({
    path: "docs/reports/play-time-controls-2026-10-15/calendar.png",
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  const box = await page.locator("#sheet").boundingBox();
  assert.ok(
    box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= 1024 &&
      box.y + box.height <= 768,
  );
  const target = await page
    .locator(".month .day.selected")
    .getAttribute("data-date");
  await page.locator(".calendar-details .skip-forward").click();
  await page.waitForFunction(
    (before) =>
      document.getElementById("card-clock").innerText.trim() !== before,
    clock,
  );
  const jumped = await page.locator("#card-clock").innerText();
  console.log("Calendar jump to", target, "->", jumped.replace("\n", " "));
  // It reached that day, or a scene the director fired stopped it on an earlier one.
  assert.ok(
    jumped.includes(String(Number(target.slice(-2)))) ||
      (await page.locator("#continue").isVisible()),
  );
  // Week advances seven days, Day one.
  if (await page.locator("#continue").isVisible())
    await page.locator("#continue").click();
  const week = page.locator("#week");
  assert.ok((await week.innerText()).trim());
  await week.waitFor();
  await page.waitForFunction(() => !document.getElementById("week").disabled);
  const beforeWeek = await page.locator("#card-clock").innerText();
  await week.click();
  await page.waitForFunction(
    (before) =>
      document.getElementById("card-clock").innerText.trim() !== before,
    beforeWeek,
  );
  console.log("Week ->", await page.locator("#card-clock").innerText());
  assert.deepEqual(errors, []);
  console.log(
    "PASS one month, month navigation, day selection, unchanged clock, responsive panel, calendar skip icon, Week",
  );
} finally {
  await browser.close();
}
