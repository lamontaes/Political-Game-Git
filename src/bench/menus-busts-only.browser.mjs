/* global process, console, document, URL */
// Menus show busts only (owner, Nov 7, RULINGS-nov5 item 50; the item
// play-your-life-draws-a-full-body-figure), on the bench (npm run bench): a
// new life in a drawn place, then You and its three tabs (one screenshot each,
// all the same bust of the same face), then every other menu on the rail and
// each of its tabs: no picture inside a menu is a whole figure (the people
// pack's /art/people/ figures stay in rooms and scenes). Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/menus-busts-only.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
const RAIL = [
  "who",
  "journal",
  "calendar",
  "money",
  "politics",
  "news",
  "people",
  "travel",
  "guide",
];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(300000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
/** Every picture inside the open sheet: an img's file or a background image. */
const pictures = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("#sheet img, #sheet [style]")]
      .map(
        (e) =>
          e.getAttribute("src") ??
          /url\("?([^")]+)/.exec(e.style.backgroundImage ?? "")?.[1] ??
          "",
      )
      .filter(Boolean),
  );
// PLACE_KEY names the place (Blodgett Landing, New Hampshire, the audit's, is 3306020).
if (process.env.PLACE_KEY)
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("placeKey", process.env.PLACE_KEY);
    return route.continue({ url: url.toString() });
  });
try {
  const life = await startLife(page, { fresh: true });
  console.log("Place:", life.placeName, "Seed:", life.seed);
  const youHeads = [];
  for (const rail of RAIL) {
    const close = page.locator("#sheet-close");
    if (await close.isVisible()) await close.click();
    await page
      .locator(`#rings [data-tab="${rail}"]`)
      .first()
      .evaluate((e) => e.click());
    await page.locator("#sheet:not([hidden])").waitFor();
    await page.waitForTimeout(800);
    const tabs = await page
      .locator("#sheet-tabs [data-tab]")
      .evaluateAll((all) => all.map((t) => t.dataset.tab));
    for (const tab of tabs.length ? tabs : [rail]) {
      if (tabs.length)
        await page.locator(`#sheet-tabs [data-tab="${tab}"]`).click();
      await page.waitForTimeout(900);
      const shown = await pictures();
      const whole = shown.filter((src) => src.includes("/art/people/"));
      console.log(
        `${rail}/${tab}: ${shown.length} pictures, ${whole.length} whole figures`,
      );
      assert.deepEqual(whole, [], `${rail}/${tab} draws a whole figure`);
      if (rail === "who") {
        youHeads.push(
          shown.filter((src) => src.includes("/art/busts/")).join(" "),
        );
        if (shots) await page.screenshot({ path: `${shots}/you-${tab}.png` });
      }
    }
  }
  // The three You tabs show the same bust of the same face.
  assert.ok(youHeads[0], "You shows no bust");
  for (const heads of youHeads)
    assert.equal(heads, youHeads[0], "the You tabs show different busts");
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS menus show busts only; the You tabs share one bust");
} finally {
  await browser.close();
}
