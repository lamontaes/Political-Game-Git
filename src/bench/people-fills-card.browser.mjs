/* global process, console, document */
// People fills the card's right half, in a real browser on the bench (npm run bench): every
// person on the roster opens a card whose sections stand in two columns when there are two or
// more of them, never one column with the other half of the panel empty (owner, Nov 23, C17).
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
    .locator('#rings [data-tab="people"]')
    .first()
    .evaluate((tab) => tab.click());
  await page.locator(".roster-row").first().waitFor();
  const rows = await page.locator(".roster-row").count();
  let single = 0;
  for (let at = 0; at < rows; at += 1) {
    await page.locator(".roster-row").nth(at).click();
    await page.waitForFunction((index) => {
      const row = document.querySelectorAll(".roster-row")[index];
      return (
        row?.getAttribute("aria-pressed") === "true" &&
        document.querySelector(".roster-page")?.dataset.key ===
          row.dataset.key &&
        document.querySelector(".roster-page .mx3cols")
      );
    }, at);
    const shape = await page.evaluate(() => ({
      columns: document.querySelectorAll(".roster-page .mx3col").length,
      sections: document.querySelectorAll(".roster-page .mx3col > .sec").length,
    }));
    if (shape.sections >= 2 && shape.columns < 2) single += 1;
  }
  assert.equal(
    single,
    0,
    `${single} of ${rows} cards set their sections in one column`,
  );
  console.log(`ok: ${rows} person cards, none with an empty right half`);
} finally {
  await browser.close();
}
