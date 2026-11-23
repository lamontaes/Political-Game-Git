/* global process, console, document, getComputedStyle */
// A portrait is never in a circle or a box (owner, Nov 5; the CTO's line on issue #9995, stop 2):
// every headshot on the menus sits in soft light and fades at its edges. A drawn place's Politics
// screens (Government, Parties) are opened at 1440x900 and every visible headshot is read for a
// border, a rounded edge, and the fade mask the approved bust has.
// Run against a fresh bench: node src/bench/headshot-no-ring.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
try {
  await startLife(page, { fresh: true });
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((button) => button.click());
  let seen = 0;
  for (const name of ["Government", "Parties"]) {
    await page.locator("#sheet button", { hasText: name }).first().click();
    await page.waitForTimeout(800);
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll(".headshot")]
        .filter((node) => node.checkVisibility())
        .map((node) => {
          const style = getComputedStyle(node);
          return {
            border: parseFloat(style.borderTopWidth),
            radius: style.borderTopLeftRadius,
            mask: style.maskImage || style.webkitMaskImage,
          };
        }),
    );
    for (const row of rows) {
      assert.equal(row.border, 0, `${name}: a headshot has a border`);
      assert.equal(row.radius, "0px", `${name}: a headshot is rounded`);
      assert.match(row.mask, /gradient/, `${name}: a headshot has no fade`);
    }
    seen += rows.length;
  }
  assert.ok(seen > 0, "no headshot was found on the Politics screens");
  console.log(`headshot-no-ring: ok (${seen} headshots)`);
} finally {
  await browser.close();
}
