/* global process, console, document */
// The News panel ends under its content, in a real browser on the bench (npm run bench) (the CTO's
// 06:46Z catch, Bloomsbury and Roaring Spring: the lower half of the panel empty; owner, Oct 27: "so
// much dead space"): in each drawn life the panel's foot sits within 90 px of the last thing it
// shows, the headline list or the open story.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
try {
  const life = await startLife(page, { fresh: true });
  await page
    .locator('#rings [data-tab="news"]')
    .first()
    .evaluate((tab) => tab.click());
  await page.locator(".news-board").waitFor();
  await page.waitForTimeout(1200);
  const gap = await page.evaluate(() => {
    const sheet = document.getElementById("sheet").getBoundingClientRect();
    const shown = [
      ...document.querySelectorAll(".news-list > *, .news-page > *"),
    ].map((node) => node.getBoundingClientRect().bottom);
    return {
      stories: document.querySelectorAll(".news-list > *").length,
      empty: Math.round(sheet.bottom - Math.max(...shown, 0)),
      foot: Math.round(sheet.bottom),
    };
  });
  assert.ok(
    gap.empty <= 90,
    `the News panel has ${gap.empty}px empty under its content`,
  );
  console.log(
    `ok: ${life.placeName}: ${gap.stories} headlines, the panel ends ${gap.empty}px under its content (foot at ${gap.foot})`,
  );
} finally {
  await browser.close();
}
