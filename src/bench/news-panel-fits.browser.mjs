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
    // The headline list is the shared long-list box: judge the rows it shows,
    // not its inner grid, which runs past the box's foot.
    const box = document.querySelector(".news-list");
    const edge = box ? box.getBoundingClientRect() : null;
    const rows = [...document.querySelectorAll(".news-list .news-row")].map(
      (node) => node.getBoundingClientRect(),
    );
    const visible = edge ? rows.filter((r) => r.top < edge.bottom) : [];
    const shown = [
      ...visible.map((r) =>
        edge ? Math.min(r.bottom, edge.bottom) : r.bottom,
      ),
      ...[...document.querySelectorAll(".news-page > *")].map(
        (node) => node.getBoundingClientRect().bottom,
      ),
    ];
    return {
      stories: rows.length,
      // A row the box's foot cuts through: the list must end on a whole row.
      cut: visible.filter((r) => edge && r.bottom > edge.bottom + 1).length,
      empty: Math.round(sheet.bottom - Math.max(...shown, 0)),
      foot: Math.round(sheet.bottom),
    };
  });
  assert.equal(gap.cut, 0, "a headline is cut off at the list's foot");
  assert.ok(
    gap.empty <= 90,
    `the News panel has ${gap.empty}px empty under its content`,
  );
  console.log(
    `ok: ${life.placeName}: ${gap.stories} headlines, ${gap.cut} cut at the list's foot, the panel ends ${gap.empty}px under its content (foot at ${gap.foot})`,
  );
} finally {
  await browser.close();
}
