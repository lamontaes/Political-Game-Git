/* global process, console, document, getComputedStyle */
// Government's Recent votes, in a real browser on the bench (npm run bench): every row is the
// same size of type, a row that opens a paper has a cue at rest (a brighter name) and lights on
// hover (owner, Nov 23, C7 and P22; MENU-LOOK, States).
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
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((tab) => tab.click());
  await page.locator(".vote-rows .dl").first().waitFor();
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll(".vote-rows .dl")].map((row) => ({
      open: row.classList.contains("open-row"),
      sizes: [...row.querySelectorAll(".dotlabel, .dotleader, .dotvalue")].map(
        (part) => getComputedStyle(part).fontSize,
      ),
      name: getComputedStyle(row.querySelector(".dotlabel")).color,
    })),
  );
  assert.ok(rows.length >= 1, "no recent votes on the first screen");
  const sizes = new Set(rows.flatMap((row) => row.sizes));
  assert.equal(sizes.size, 1, `the vote rows differ in type: ${[...sizes]}`);
  const open = rows.filter((row) => row.open);
  const plain = rows.filter((row) => !row.open);
  if (open.length && plain.length)
    assert.notEqual(
      open[0].name,
      plain[0].name,
      "an openable row has no cue at rest",
    );
  if (open.length) {
    const row = page.locator(".vote-rows .open-row").first();
    const rest = await row.evaluate((r) => getComputedStyle(r).backgroundImage);
    await row.hover();
    await page.waitForTimeout(400);
    const lit = await row.evaluate((r) => getComputedStyle(r).backgroundImage);
    assert.notEqual(lit, rest, "an openable row does not light on hover");
  }
  console.log(`ok: ${rows.length} vote rows, ${open.length} open, one size`);
} finally {
  await browser.close();
}
