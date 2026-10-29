/* global process, console, document */
// The creator's Continue with a field missing, in a real browser on the bench
// (npm run bench): it names what is missing at the bottom and marks the field
// until it is filled; it never does nothing (owner, Oct 28 sitting, point 3).
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const state = () =>
  page.evaluate(() => ({
    status: document.getElementById("front-status").textContent,
    marked: [...document.querySelectorAll("#cr-character .missing")].map(
      (n) => n.dataset.testid,
    ),
    stage: ["cr-character", "cr-place"].find(
      (id) => !document.getElementById(id).hidden,
    ),
  }));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-character:not([hidden])").waitFor();
  await page.locator("#cr-random-name").click();
  await page.locator("#cr-given:not([value=''])").waitFor();
  // No gender yet: Continue says so and marks the gender row.
  await page.locator("#cr-character-next").click();
  let seen = await state();
  console.log(`no gender: "${seen.status}" marks ${seen.marked.join(",")}`);
  assert.equal(seen.stage, "cr-character", "went on without a gender");
  assert.ok(seen.status.length > 0, "nothing said at the bottom");
  assert.deepEqual(seen.marked, ["gender-choices"]);
  await page.locator("[data-gender=female]").click();
  seen = await state();
  assert.equal(seen.status, "", "the line stays after the field is filled");
  assert.deepEqual(seen.marked, [], "the mark stays after the field is filled");
  // A name cleared: Continue names the name.
  await page.locator("#cr-family").fill("");
  await page.locator("#cr-character-next").click();
  seen = await state();
  console.log(`no name: "${seen.status}" marks ${seen.marked.join(",")}`);
  assert.equal(seen.stage, "cr-character", "went on without a last name");
  assert.ok(seen.status.length > 0, "nothing said at the bottom");
  assert.deepEqual(seen.marked, ["creator-name"]);
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/03-creator-says-what-is-missing.png`,
    });
  await page.locator("#cr-family").fill("Reyes");
  seen = await state();
  assert.deepEqual(seen.marked, [], "the mark stays after typing");
  await page.locator("#cr-character-next").click();
  await page.locator("#cr-place:not([hidden])").waitFor();
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: Continue says what is missing, then goes on");
} finally {
  await browser.close();
}
