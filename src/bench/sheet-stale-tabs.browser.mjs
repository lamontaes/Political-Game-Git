/* global process, console, document */
// A sheet opened right after another shows only its own tabs: Politics tabs clicked and
// closed at once, then News, leave no tab bar over the paper (found in the Oct 29 sweep).
// Run against a bench with a life in progress: node src/bench/sheet-stale-tabs.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  const title = await (await ready).json();
  assert.ok(title.life, "no life in progress on the bench");
  console.log(`life: ${title.life.name} · ${title.life.placeName}`);
  await page.locator("#front-continue:not([disabled])").click();
  await page.locator("#front").waitFor({ state: "hidden" });
  await page
    .waitForFunction(
      () => !document.getElementById("week").disabled,
      undefined,
      { timeout: 120000 },
    )
    .catch(() => {});
  for (let round = 0; round < 3; round += 1) {
    // Open Politics, click Campaigns and close at once (the requests are still out), then News.
    await page.evaluate(() => {
      document.querySelector('#rings [data-tab="politics"]').click();
    });
    await page.locator('#sheet-tabs [data-tab="campaigns"]').waitFor();
    await page.evaluate(() => {
      document.querySelector('#sheet-tabs [data-tab="campaigns"]').click();
      document.getElementById("sheet-close").click();
      document.querySelector('#rings [data-tab="news"]').click();
    });
    await page.locator("#sheet-body .paper").waitFor();
    await page.waitForTimeout(1500);
    const tabs = await page.evaluate(
      () => document.getElementById("sheet-tabs").children.length,
    );
    assert.equal(tabs, 0, `round ${round}: tabs over the News paper`);
    await page.locator("#sheet-close").click();
  }
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: News shows no leftover tabs");
} finally {
  await browser.close();
}
