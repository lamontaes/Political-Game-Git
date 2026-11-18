/* global process, console, document, getComputedStyle, window */
// The creator fits the window (screens-creator-look-stage-fits-900; kit13: no
// scrolling inside a menu), on the bench (npm run bench) at 1440x900: New
// game, Start a life, a random place, then a female and a male look drawn by
// the creator's own Random: the panel's top is at or below 0 and its bottom,
// with Begin my life, at or above the window's edge, and nothing inside it
// scrolls but the long town list under its search box. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/creator-fits.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const [shots] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(`${base}/play`);
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-place-random").click();
  await page.locator("#cr-screen:not([hidden])").waitFor();
  for (const gender of ["female", "male"]) {
    await page.locator(`[data-gender=${gender}]`).click();
    await page.locator("#cr-random-name").click();
    await page.waitForTimeout(1200);
    const fit = await page.evaluate(() => {
      const box = (id) => document.getElementById(id).getBoundingClientRect();
      const panel = box("cr-screen");
      // The town list under its search box is a long list, the one box the
      // kit lets scroll; nothing else in the panel may.
      const scrolls = [...document.querySelectorAll("#cr-screen *")].filter(
        (e) =>
          e.id !== "cr-towns" &&
          e.scrollHeight > e.clientHeight + 1 &&
          /auto|scroll/.test(getComputedStyle(e).overflowY),
      ).length;
      return {
        top: Math.round(panel.top),
        bottom: Math.round(panel.bottom),
        begin: Math.round(box("cr-begin").bottom),
        place: document.querySelector("#cr-screen h3, #cr-screen .place-name")
          ?.textContent,
        scrolls,
        height: window.innerHeight,
      };
    });
    console.log(
      `${gender}: panel ${fit.top} to ${fit.bottom} of ${fit.height}, Begin my life ends at ${fit.begin}, ${fit.scrolls} scrolling boxes`,
    );
    assert.ok(fit.top >= 0, `${gender}: the panel's top is off the window`);
    assert.ok(fit.bottom <= fit.height, `${gender}: the panel runs off`);
    assert.ok(fit.begin <= fit.height, `${gender}: Begin my life is off`);
    assert.equal(fit.scrolls, 0, `${gender}: a box scrolls`);
    if (shots)
      await page.screenshot({ path: `${shots}/creator-${gender}.png` });
  }
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS the creator fits the window");
} finally {
  await browser.close();
}
