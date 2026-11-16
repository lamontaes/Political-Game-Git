/* global process, console, document */
// The jobs sheet's Apply control, on the bench (npm run bench): a new life, the
// player's job left so openings list, one opening applied for, the button read
// as Applied. Run: BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/apply-for-opening.browser.mjs <shots dir>
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const [shots] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({
  viewport: { width: 1672, height: 941 },
  deviceScaleFactor: 2,
});
page.setDefaultTimeout(60000);
try {
  await startLife(page);
  await page.locator('#rings [data-tab="who"]').evaluate((e) => e.click());
  await page.locator('#sheet-tabs [data-tab="jobs"]').waitFor();
  await page.locator('#sheet-tabs [data-tab="jobs"]').click();
  await page.waitForTimeout(2000);
  if (await page.locator('[data-testid="leave-job"]').count()) {
    await page.locator('[data-testid="leave-job"]').click();
    await page.waitForTimeout(2500);
  }
  console.log((await page.locator("#sheet").innerText()).slice(0, 600));
  if (shots) await page.screenshot({ path: `${shots}/jobs-sheet.png` });
  const apply = page
    .locator('[data-testid="apply-for-opening"]:not(:disabled)')
    .first();
  await apply.waitFor();
  const count = await page.locator('[data-testid="apply-for-opening"]').count();
  console.log(`openings with an Apply control: ${count}`);
  await apply.scrollIntoViewIfNeeded();
  if (shots) await page.screenshot({ path: `${shots}/apply-before.png` });
  await apply.click();
  await page.waitForTimeout(1500);
  const done = page.locator('[data-testid="apply-for-opening"]:disabled');
  assert.ok((await done.count()) >= 1, "no opening shows as applied");
  console.log(`applied button text: ${await done.first().innerText()}`);
  if (shots) await page.screenshot({ path: `${shots}/apply-after.png` });
} finally {
  await browser.close();
}
