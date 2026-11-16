/* global process, URL, console, document */
// Dev mode's Loans view on the screen (src/bench/dev-views/loans.ts): a played life at Ragland,
// Alabama (the pinned borrower of tests/support/real-borrower.ts: seed promises-real-loan-1 draw
// loan:16, born 1995-03-01) runs to Sep 2, 2025 through dev mode's Run, then the Metrics board in
// dev mode shows the household's loan applications (whose income the lender read and the costs
// that sized the ask) and each month's bill with its payment or missed-payment record.
// SHOTS_DIR saves the screen. Run against a fresh bench: node src/bench/dev-view-loans.browser.mjs
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { devModeOn } from "./dev-setup.mjs";

const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
/** Ragland, Alabama: drawPlace("promises-real-loan-1", "loan:16") in scripts/core2-year/place.ts. */
const RAGLAND = {
  seed: "f417013914c51a45e5256ec0c87e9131da51cb3029512a93ce11f167e7f02394",
  placeKey: "0163216",
};
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(`${base}/play`);
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Borrower",
    gender: "nonbinary",
    birthYear: 1995,
    birthMonth: 3,
    birthDay: 1,
  });
  // KEEP_WORLD reuses a bench whose world this script already built and ran.
  if (!process.env.KEEP_WORLD) {
    await page.request.post(
      `${base}/api/newlife?${new URLSearchParams({ ...RAGLAND, person })}`,
      { timeout: 600000 },
    );
    await page.reload();
    await page.locator("#front-continue").click();
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    console.log("Place:", await page.locator("#card-place").innerText());
    // The world's days to Sep 2, 2025, through dev mode's advance route (dev-api.ts).
    const ran = await page.request.post(`${base}/api/dev/advance`, {
      data: { step: "date", to: "2025-09-02" },
      timeout: 900000,
    });
    assert.ok(ran.ok(), await ran.text());
  }
  await page.reload();
  await page.locator("#front-continue").click();
  await devModeOn(page);
  // Politics, then its Metrics board (savings-estimate.browser.mjs opens Budgets the same way).
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator('#sheet-tabs [data-tab="metrics"]').click();
  const panel = page.locator(".dev-view-loans");
  await panel.waitFor();
  const text = await panel.innerText();
  console.log(text);
  assert.match(text, /Applications/);
  if (SHOTS) {
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/dev-view-loans.png` });
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
