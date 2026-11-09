/* global document, console, URL, process */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
await page.route("**/api/controls", async (route) => {
  const response = await route.fetch();
  const data = await response.json();
  const { readFile } = await import("node:fs/promises");
  await route.fulfill({
    json: {
      ...data,
      ...JSON.parse(await readFile("src/bench/data/controls.json", "utf8")),
    },
  });
});
const errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("PAGE ERROR", e.message);
});
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
    await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    const r = await response;
    assert.equal(r.status(), 200);
    console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
  }
  await page.waitForFunction(
    () =>
      document.getElementById("card-name").textContent.trim() &&
      document.getElementById("card-clock").textContent.trim(),
  );
  const name = await page.locator("#card-name").innerText();
  const clock = await page.locator("#card-clock").textContent();
  console.log(
    "Player:",
    name,
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  await page
    .locator('[data-tab="travel"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".travel-tile").first().waitFor();
  // Travel always lists somewhere to go, even on the opening night at 8:30 p.m.
  // (owner, Oct 27): a public place joins the list when the player's own
  // reasons are few; the chosen place says whether it is open now.
  const places = await page.locator(".travel-tile").count();
  console.log("Destinations:", places, clock.replace("\n", " "));
  assert.ok(places >= 3, `at least three destinations, got ${places}`);
  for (const tile of await page.locator(".travel-tile").all()) {
    assert.equal(await tile.locator("img.travel-art").count(), 1);
    const name = await tile.locator("b").innerText();
    assert.ok(name.trim() && !/[()]/.test(name), `tile name: ${name}`);
  }
  // The chosen place's side: its picture, hours and a Go that names it.
  await page.locator(".travel-detail .travel-facts").waitFor();
  assert.match(
    await page.locator(".travel-facts").innerText(),
    /Open|Closed|Filing office/,
  );
  assert.equal(await page.locator(".travel-hero img").count(), 1);
  assert.match(
    await page.locator('[data-testid="place-go"]').innerText(),
    /^Go to /,
  );
  // Nothing explains itself under a heading or tile (owner, Nov 8, 2:15 a.m.).
  assert.equal(
    await page.locator(".travel-tile p, .travel-group + p").count(),
    0,
  );
  const fit = await page.evaluate(() => {
    const body = document.getElementById("sheet-body");
    return body.scrollHeight <= body.clientHeight + 1;
  });
  assert.ok(fit, "the sheet body scrolls");
  assert.equal(
    await page.locator(".pager-arrow").count(),
    0,
    "Travel has arrows",
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${process.env.SHOTS ?? "docs/reports/travel-cards-2026-10-27"}/travel.png`,
  });
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  assert.deepEqual(errors, []);
  console.log("PASS destinations, the chosen place and unchanged clock");
} finally {
  await browser.close();
}
