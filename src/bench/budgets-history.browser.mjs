/* global process, console */
// Politics > Budgets opens without a page error, in a real browser on the bench (npm run bench)
// (Box and scroll's finding, N8-P28): the history lines took Object.prototype.valueOf from an
// options object that named no valueOf of its own, and threw.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await startLife(page, { fresh: true });
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((tab) => tab.click());
  await page.locator("#sheet button", { hasText: "Budgets" }).first().click();
  await page.locator(".bsdept").first().waitFor();
  await page.locator(".bsdept").first().click();
  await page.waitForTimeout(800);
  // A history of two years, drawn with an options object that names no amount reader of its own
  // (what the Budgets lines pass), draws a line and throws nothing.
  const drawn = await page.evaluate(async () => {
    const { trendLine } = await import("/ui/trend-line.mjs");
    const history = [
      { fiscalYear: 2023, minor: 100 },
      { fiscalYear: 2024, minor: 120 },
    ];
    return Boolean(trendLine(history, { width: 300 }));
  });
  assert.equal(drawn, true, "the history line was not drawn");
  assert.deepEqual(errors, [], errors.join("; "));
  console.log("ok: Budgets opens with no page error");
} finally {
  await browser.close();
}
