/* global console, document, process, URL */
// Run against the bench; a fresh bench draws a new world, otherwise uses its current life.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(process.env.BENCH_URL ?? "http://localhost:3000/play");
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
    .locator('[data-tab="who"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".screen-heading").waitFor();
  assert.equal(await page.locator(".screen-heading .name").innerText(), name);
  assert.equal(await page.locator(".screen-backdrop").count(), 0);
  assert.equal(await page.locator(".screen-portrait").count(), 1);
  assert.ok(
    !(await page.locator("#sheet-body").innerText()).includes("undefined"),
  );
  await page.waitForFunction(() =>
    [...document.querySelectorAll("#sheet-media img")].every((i) => i.complete),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: process.argv[2] ?? "test-results/character.png",
  });
  const first = page.locator(".record-person").first();
  if (await first.count()) {
    const familyName = await first.innerText();
    await first.click();
    await page.locator("#person:not([hidden])").waitFor();
    assert.equal(await page.locator("#person-name").innerText(), familyName);
    await page.locator("#person-close").click();
  }
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  console.log(
    "PASS record-driven portrait, name, household link, no fabricated backdrop or time spent",
  );
  await page.route("**/api/card?*", async (route) => {
    const r = await route.fetch();
    const json = await r.json();
    await route.fulfill({
      json: {
        ...json,
        presentation: { portraitUrl: null, backgroundUrl: null },
      },
    });
  });
  await page.reload();
  await page.locator("#front-continue:not([disabled])").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  await page
    .locator('[data-tab="who"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".screen-heading").waitFor();
  assert.equal(await page.locator("#sheet-media img").count(), 0);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(100);
  const box = await page.locator("#sheet").boundingBox();
  assert.ok(
    box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= 1024 &&
      box.y + box.height <= 768,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS optional-artwork contract: null images leave clear slots; smaller viewport fits",
  );
} finally {
  await browser.close();
}
