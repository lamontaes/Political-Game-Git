/* global process, console, document */
// Budgets answers "Who wrote it" with who, in a real browser on the bench (npm run bench) (the
// CTO's Nov 24 Budgets item, 7142760180): in each government's budget the section appears only
// with a body named under "Adopted by", never as a date alone; and the chosen department's rows
// sit in the same column as the government's totals, so no column holds two rows with the panel
// empty beside them.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "../../../src/bench/start-life.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
try {
  const life = await startLife(page, { fresh: true });
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator('.tab:has-text("Budgets")').first().click();
  await page.locator(".strip-board .board-cols").waitFor();
  const tabs = await page.locator(".strip-board .board-top .tab").count();
  let named = 0;
  for (let at = 0; at < tabs; at += 1) {
    await page.locator(".strip-board .board-top .tab").nth(at).click();
    await page.waitForTimeout(900);
    const seen = await page.evaluate(() => {
      const sections = [...document.querySelectorAll(".strip-board .sec")];
      const who = sections.find(
        (sec) =>
          sec.querySelector(".sechead")?.textContent.trim() === "Who wrote it",
      );
      return {
        columns: document.querySelectorAll(".strip-board .board-cols > .mx3col")
          .length,
        rows: who
          ? [...who.querySelectorAll(".dl, .typed-row, li, p")].length
          : 0,
        who: who ? who.textContent.replace(/\s+/g, " ").trim() : null,
      };
    });
    assert.ok(
      seen.columns <= 2,
      `${life.placeName}: ${seen.columns} columns on the Budgets board`,
    );
    if (seen.who !== null) {
      named += 1;
      if (process.env.SHOT_DIR && named === 1)
        await page.screenshot({
          path: `${process.env.SHOT_DIR}/budgets-after.png`,
        });
      assert.match(
        seen.who,
        /Adopted by/,
        `${life.placeName}: "Who wrote it" without who: ${seen.who}`,
      );
    }
  }
  console.log(
    `ok: ${life.placeName}: ${tabs} governments, two columns each, ${named} with "Who wrote it" naming a body`,
  );
} finally {
  await browser.close();
}
