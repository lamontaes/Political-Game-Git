/* global process, console, document */
// The Politics > Executive page fills its panel, in a real browser on the bench (npm run bench)
// (the CTO's Nov 24 catch, the Town of Alderson: the right half empty beside a lone mayor; owner,
// Oct 27: "so much dead space"): in each drawn town the executive page has a right column that
// holds something, whether the town lists other officers there or has only a mayor and shows what
// is coming up there instead, and that column starts in the right half of the page.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const draws = Number(process.env.EXECUTIVE_FITS_DRAWS ?? 3);
try {
  for (let draw = 0; draw < draws; draw += 1) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.setDefaultTimeout(60000);
    const life = await startLife(page, { fresh: true });
    await page.locator('.ring[data-tab="politics"]').click();
    await page.locator("#sheet:not([hidden])").waitFor();
    await page.locator('.government-picker .tab[data-level="local"]').click();
    await page
      .locator('.government-branch .tab[data-branch="executive"]')
      .click();
    await page.locator(".split-screen .leader").first().waitFor();
    await page.waitForTimeout(800);
    const seen = await page.evaluate(() => {
      const box = (selector) =>
        document.querySelector(selector)?.getBoundingClientRect();
      const body = box(".split-body");
      const side = box(".split-side");
      return {
        heading:
          document.querySelector(".split-side .sechead")?.textContent.trim() ??
          "",
        sideText:
          document.querySelector(".split-side")?.textContent.trim().length ?? 0,
        sideStart: side
          ? Math.round(((side.left - body.left) / body.width) * 100)
          : null,
      };
    });
    assert.ok(
      seen.sideText > 0,
      `${life.placeName}: the executive page has no right column (the right half is empty)`,
    );
    assert.ok(
      seen.sideStart >= 40,
      `${life.placeName}: the right column starts ${seen.sideStart}% across the page`,
    );
    console.log(
      `ok: ${life.placeName}: the right column holds "${seen.heading}" and starts ${seen.sideStart}% across`,
    );
    if (process.env.SHOT_DIR)
      await page.screenshot({
        path: `${process.env.SHOT_DIR}/executive-${seen.heading.startsWith("Coming") ? "lone-mayor" : "several"}-${draw}.png`,
        scale: "css",
      });
    await page.close();
  }
} finally {
  await browser.close();
}
