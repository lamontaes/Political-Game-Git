/* global process, console, document */
// The Politics > Executive page fits its content, in a real browser on the bench (npm run bench)
// (the CTO's Nov 24 catch, the Town of Alderson, and his send-back of #10409; owner, Oct 27: "so
// much dead space"): in each drawn town the page is either a town with other officers, whose
// right column lists them, or a town with only a mayor, whose panel is only as wide as the mayor
// and what is coming up, with no empty right half; and a "Coming up" section appears only with
// something scheduled in it, never as an empty line.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "../../support/start-life.mjs";
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
      const sheet = document.getElementById("sheet").getBoundingClientRect();
      const side = document.querySelector(".split-side");
      const content = [
        ...document.querySelectorAll(
          ".split-main .leader, .split-main .date-list, .split-main .chamber",
        ),
      ].map((node) => node.getBoundingClientRect().right);
      const comingHeads = [
        ...document.querySelectorAll(".split-screen .sechead"),
      ].filter((node) =>
        node.closest(".sec")?.querySelector(".date-list-empty"),
      );
      return {
        hasSide: !!side,
        sideText: side?.textContent.trim().length ?? 0,
        emptyRight: Math.round(sheet.right - Math.max(...content, 0)),
        width: Math.round(sheet.width),
        emptyComing: comingHeads.length,
        scheduled: document.querySelectorAll(".split-main .date-list li")
          .length,
      };
    });
    assert.equal(
      seen.emptyComing,
      0,
      `${life.placeName}: a Coming up section with nothing scheduled in it`,
    );
    if (seen.hasSide)
      assert.ok(
        seen.sideText > 0,
        `${life.placeName}: the executive page has an empty right column`,
      );
    else
      assert.ok(
        seen.emptyRight <= 120,
        `${life.placeName}: a town with only a mayor has ${seen.emptyRight}px empty to the right of its content (the panel is ${seen.width}px wide)`,
      );
    console.log(
      `ok: ${life.placeName}: ${seen.hasSide ? "other officers on the right" : `only a mayor, panel ${seen.width}px wide, ${seen.emptyRight}px past its content`}, ${seen.scheduled} dated line(s)`,
    );
    if (process.env.SHOT_DIR)
      await page.screenshot({
        path: `${process.env.SHOT_DIR}/executive-${seen.hasSide ? "several" : seen.scheduled ? "lone-calendar" : "lone-bare"}-${draw}.png`,
        scale: "css",
      });
    await page.close();
  }
} finally {
  await browser.close();
}
