/* global console, process, document */
// With Dev mode on, Politics > Metrics carries "How this world opened" under the board: the town's
// rows, then the player's, their household's, a business's and an office's, each with how the
// opening made it. Fails on a page error or a subject with no rows.
// Run against a fresh bench: node src/bench/dev-opening.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
import { devModeOn } from "./dev-setup.mjs";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await startLife(page, { fresh: true });
  await devModeOn(page);
  console.log("Place:", await page.locator("#card-place").innerText());
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page
    .locator("#sheet-body button, #sheet button", { hasText: /^Metrics$/ })
    .first()
    .click();
  const view = page.locator(".dev-opening");
  for (const subject of ["town", "person", "household", "business", "office"]) {
    await view.waitFor();
    await page
      .locator('[data-testid="dev-opening-subject"]')
      .selectOption(subject);
    await page.waitForFunction(
      (s) =>
        document.querySelectorAll(".dev-opening-row").length > 0 &&
        document.querySelector('[data-testid="dev-opening-subject"]')?.value ===
          s,
      subject,
    );
    await page.waitForTimeout(800);
    const rows = await page.locator(".dev-opening-row").count();
    console.log(subject, rows, "rows");
    assert.ok(rows > 0, `${subject}: no rows`);
    if (shots) {
      await view.evaluate((n) => n.scrollIntoView({ block: "start" }));
      await page.screenshot({ path: `${shots}/dev-opening-${subject}.png` });
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
