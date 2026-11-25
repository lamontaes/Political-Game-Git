/* global process, console */
// The Guide's Quorum entry carries no developer text, in a real browser on the bench (npm run bench)
// (the CTO's N16-21 send-back, Nov 24): it must not say what "the game" reads, records or assumes.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
try {
  await startLife(page, { fresh: true });
  await page
    .locator('#rings [data-tab="guide"]')
    .first()
    .evaluate((tab) => tab.click());
  await page.locator(".roster-row").first().waitFor();
  const quorum = page
    .locator(".roster-row", { hasText: /^\s*Quorum\s*$/ })
    .first();
  await quorum.scrollIntoViewIfNeeded();
  await quorum.click();
  await page.waitForTimeout(800);
  const text = await page.locator(".roster-page").innerText();
  assert.match(text, /Quorum/, "the Quorum entry did not open");
  assert.doesNotMatch(
    text,
    /recorded rules|the game says so|assuming a majority/i,
    "the Quorum entry carries developer text",
  );
  console.log("ok: the Quorum entry has no developer text");
} finally {
  await browser.close();
}
