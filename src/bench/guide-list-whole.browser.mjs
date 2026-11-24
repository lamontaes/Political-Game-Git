/* global process, console, document */
// The Guide's list of words stays inside its panel and shows whole rows, in a real browser on
// the bench (npm run bench) (the CTO's Nov 24 catch on #10536: "the Guide's word list scrolls,
// and its top row is clipped"): the list's box ends inside the panel (nothing of it is cut off by
// the panel), and after the list is scrolled to a word far down, the first row it shows is whole.
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
    .locator('#rings [data-tab="guide"]')
    .first()
    .evaluate((tab) => tab.click());
  await page.locator(".roster-screen.guide").waitFor();
  await page.waitForTimeout(1500);
  const seen = await page.evaluate(() => {
    const box = document.querySelector(".roster-screen.guide .pager");
    const sheet = document.getElementById("sheet").getBoundingClientRect();
    const rect = box.getBoundingClientRect();
    // Scroll the list to a word far down, as choosing one there does.
    const rows = [...box.querySelectorAll(".pick")];
    rows[Math.floor(rows.length * 0.7)].scrollIntoView({ block: "start" });
    const top = box.getBoundingClientRect().top;
    const first = rows.find((row) => row.getBoundingClientRect().bottom > top);
    const firstRect = first.getBoundingClientRect();
    return {
      cutByPanel: Math.round(rect.bottom - sheet.bottom),
      rows: rows.length,
      firstCut: Math.round(top - firstRect.top),
    };
  });
  assert.ok(
    seen.cutByPanel <= 0,
    `${life.placeName}: the Guide's list stands ${seen.cutByPanel}px past the panel's foot`,
  );
  assert.ok(
    seen.firstCut <= 1,
    `${life.placeName}: the list's first row is cut ${seen.firstCut}px at the top`,
  );
  console.log(
    `ok: ${life.placeName}: ${seen.rows} words, the list ends inside the panel and its first row is whole`,
  );
} finally {
  await browser.close();
}
