/* global process, console, document, getComputedStyle */
// The race page's "Last time" rows keep the date and the winner's name whole (CTO line on issue
// #9995, from the Player's shot of #10099: "November 2, / 2021", "Reese / Warner" wrapped). Every
// race on Politics, Elections of a drawn place is opened at 1440x900 and each label and figure in
// a "Last time" row must sit on one line.
// Run against a fresh bench: node src/bench/race-last-time.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await startLife(page, { fresh: true });
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((button) => button.click());
  await page.locator('#sheet-tabs [data-tab="campaigns"]').click();
  await page.locator("#sheet-body .roster-row").first().waitFor();
  const count = await page.locator("#sheet-body .roster-row").count();
  let checked = 0;
  for (let i = 0; i < count; i++) {
    await page.locator("#sheet-body .roster-row").nth(i).click();
    await page.locator("#sheet-body .roster-page").waitFor();
    await page.waitForTimeout(300);
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll(".dotrows.one-line")].flatMap((box) =>
        [...box.querySelectorAll(".dotlabel, .dotvalue")].map((node) => {
          const line = parseFloat(getComputedStyle(node).lineHeight);
          const room = node.closest(".roster-side").getBoundingClientRect();
          return {
            text: node.textContent.trim(),
            clipped: node.getBoundingClientRect().right > room.right + 1,
            lines: Math.round(node.getBoundingClientRect().height / line),
          };
        }),
      ),
    );
    for (const row of rows) {
      assert.equal(row.lines, 1, `"${row.text}" wraps`);
      assert.ok(!row.clipped, `"${row.text}" runs past its column`);
    }
    checked += rows.length;
    if (rows.length && shots)
      await page.screenshot({ path: `${shots}/race-last-time.png` });
    await page
      .locator("#sheet-body .roster-back, #sheet-back")
      .first()
      .click({ timeout: 2000 })
      .catch(() => undefined);
    await page.locator('#sheet-tabs [data-tab="campaigns"]').click();
    await page.locator("#sheet-body .roster-row").first().waitFor();
  }
  console.log(
    `race-last-time: ${checked} rows on ${count} races, none wrapped`,
  );
  assert.ok(checked > 0, "no race showed a Last time section");
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
