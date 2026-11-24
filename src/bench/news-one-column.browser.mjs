/* global process, console, getComputedStyle */
// A news story is one column, in a real browser on the bench (npm run bench): the lead story's
// text is never set in columns, so its last sentence cannot float in a second one (owner,
// Nov 23, C16: "It reaches everyone in New Jersey." in a second column).
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
    .locator('#rings [data-tab="news"]')
    .first()
    .evaluate((tab) => tab.click());
  await page.locator(".news-board").waitFor();
  const text = page.locator(".news-story.lead .news-text").first();
  await text.waitFor();
  const lefts = await text.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      count: style.columnCount,
      lefts: [...node.children].map((child) =>
        Math.round(child.getBoundingClientRect().left),
      ),
    };
  });
  assert.equal(lefts.count, "auto", "the lead story is set in columns");
  assert.equal(
    new Set(lefts.lefts).size,
    1,
    "the story's lines start at different left edges",
  );
  console.log(
    `ok: the lead story is one column (${lefts.lefts.length} paragraphs)`,
  );
} finally {
  await browser.close();
}
