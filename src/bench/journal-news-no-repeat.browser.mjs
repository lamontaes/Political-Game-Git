/* global process, console, document */
// Two screens that said a thing twice or said nothing in words, in a real browser on the bench
// (npm run bench), from the owner's Nov 24 grading packet: the Journal shows a chapter's date once
// (the chosen row, not again over its page: "Monday, January 20 | 2025 | Monday, January 20"),
// and a paper that has printed nothing shows no "Nothing from ... yet." line under its masthead.
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
    .locator('#rings [data-tab="journal"]')
    .first()
    .evaluate((tab) => tab.click());
  await page.locator(".roster-screen.journal").waitFor();
  await page.waitForTimeout(800);
  const journal = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".roster-screen.journal .pick")];
    const chosen = rows.at(-1)?.querySelector("b")?.textContent.trim() ?? "";
    const sameText = [...document.querySelectorAll("#sheet-body *")].filter(
      (node) =>
        node.children.length === 0 &&
        !node.closest(".pick") &&
        node.textContent.trim() === chosen,
    ).length;
    return {
      chosen,
      sameText,
      heads: document.querySelectorAll(".roster-screen.journal .sechead")
        .length,
    };
  });
  assert.ok(journal.chosen, `${life.placeName}: no chapter row in the Journal`);
  assert.equal(
    journal.sameText,
    0,
    `${life.placeName}: the Journal shows "${journal.chosen}" again over its page`,
  );
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/journal-after.png`,
    });
  await page
    .locator('#rings [data-tab="news"]')
    .first()
    .evaluate((tab) => tab.click());
  await page.locator(".news-board").waitFor();
  await page.waitForTimeout(1200);
  const news = await page.evaluate(() => ({
    filler: /Nothing (from .+ )?(here )?yet\./.test(
      document.getElementById("sheet-body").textContent,
    ),
    stories: document.querySelectorAll(".news-list > *").length,
  }));
  if (process.env.SHOT_DIR)
    await page.screenshot({ path: `${process.env.SHOT_DIR}/news-after.png` });
  assert.equal(
    news.filler,
    false,
    `${life.placeName}: a filler line on the News page`,
  );
  console.log(
    `ok: ${life.placeName}: the Journal row "${journal.chosen}" is not repeated over its page; News (${news.stories} headlines) has no filler line`,
  );
} finally {
  await browser.close();
}
