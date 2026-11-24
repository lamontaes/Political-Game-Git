/* global process, console, document, URL */
// Who you are names the player's schools as people write them
// (play-school-names-abbreviated), on the bench (npm run bench): a new life in
// a named place (PLACE_KEY; Abingdon, Illinois, 1700113, whose district record
// is "Abingdon-Avon CUSD 276") or a drawn one, then Who you are. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/school-names.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(180000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
if (process.env.PLACE_KEY)
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("placeKey", process.env.PLACE_KEY);
    return route.continue({ url: url.toString() });
  });
try {
  const life = await startLife(page, { fresh: true });
  console.log("Place:", life.placeName, "Seed:", life.seed);
  const close = page.locator("#sheet-close");
  if (await close.isVisible()) await close.click();
  await page
    .locator('#rings [data-tab="who"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.waitForTimeout(800);
  const text = await page.evaluate(
    () => document.getElementById("sheet-body").innerText,
  );
  const schools = text
    .split("\n")
    .filter((line) => /School|Academy|District/.test(line));
  console.log(`Schools shown: ${schools.join(" | ")}`);
  if (shots) await page.screenshot({ path: `${shots}/who-you-are.png` });
  assert.doesNotMatch(
    text,
    /\b(Sch|Elem|HS|MS|SD|ISD|CISD|CUSD|CCSD|USD|ESD)\b(?!\.)/,
    "an abbreviation left",
  );
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS Who you are spells out the schools");
} finally {
  await browser.close();
}
