/* global process, console, document */
// The creator's Begin with a field missing, in a real browser on the bench
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
    marked: [...document.querySelectorAll("#cr-screen .missing")].map(
      (n) => n.dataset.testid,
    ),
    stage: document.getElementById("cr-screen").hidden ? "away" : "creator",
  }));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-screen:not([hidden])").waitFor();
  // The random name waits for a gender, so the names are typed here.
  await page.locator("#cr-given").fill("Pat");
  await page.locator("#cr-family").fill("Candidate");
  // No gender yet: Begin says so and marks the gender row.
  await page.locator("#cr-begin").click();
  let seen = await state();
  console.log(`no gender: "${seen.status}" marks ${seen.marked.join(",")}`);
  assert.equal(seen.stage, "creator", "went on without a gender");
  assert.ok(seen.status.length > 0, "nothing said at the bottom");
  assert.deepEqual(seen.marked, ["gender-choices"]);
  await page.locator("[data-gender=female]").click();
  seen = await state();
  assert.equal(seen.status, "", "the line stays after the field is filled");
  assert.deepEqual(seen.marked, [], "the mark stays after the field is filled");
  // A name cleared: Begin names the name.
  await page.locator("#cr-family").fill("");
  await page.locator("#cr-begin").click();
  seen = await state();
  console.log(`no name: "${seen.status}" marks ${seen.marked.join(",")}`);
  assert.equal(seen.stage, "creator", "went on without a last name");
  assert.ok(seen.status.length > 0, "nothing said at the bottom");
  assert.deepEqual(seen.marked, ["creator-name"]);
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/03-creator-says-what-is-missing.png`,
    });
  await page.locator("#cr-family").fill("Reyes");
  seen = await state();
  assert.deepEqual(seen.marked, [], "the mark stays after typing");
  // Everything but the place: Begin names the place and marks it.
  await page.locator("#cr-begin").click();
  seen = await state();
  console.log(`no place: "${seen.status}" marks ${seen.marked.join(",")}`);
  assert.equal(seen.stage, "creator", "went on without a place");
  assert.ok(seen.status.length > 0, "nothing said at the bottom");
  assert.deepEqual(seen.marked, ["creator-stage-place"]);
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: Begin says what is missing");
} finally {
  await browser.close();
}
