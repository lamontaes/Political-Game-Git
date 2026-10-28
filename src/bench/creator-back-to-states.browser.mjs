/* global process, console, document */
// Back on "Where are you from?" in a real browser on the bench (npm run bench):
// after a state is picked, Back returns to the states list; from the states,
// Back returns to the character (owner, Oct 28 sitting, point 5).
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
const stage = () =>
  page.evaluate(() => ({
    panel: ["cr-character", "cr-place"].find(
      (id) => !document.getElementById(id).hidden,
    ),
    states: !document.getElementById("cr-state-pick").hidden,
    towns: !document.getElementById("cr-town-pick").hidden,
  }));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-character:not([hidden])").waitFor();
  await page.locator("[data-gender=nonbinary]").click();
  await page.locator("#cr-random-name").click();
  await page.locator("#cr-given:not([value=''])").waitFor();
  await page.locator("#cr-character-next").click();
  await page.locator("#cr-place:not([hidden])").waitFor();
  const states = page.locator("#cr-states button");
  await states.first().waitFor();
  const at = Math.floor(Math.random() * (await states.count()));
  const stateName = await states.nth(at).innerText();
  await states.nth(at).click();
  await page.locator("#cr-towns button").first().waitFor();
  let seen = await stage();
  assert.deepEqual(seen, { panel: "cr-place", states: false, towns: true });
  await page.locator("#cr-place-back").click();
  await page.locator("#cr-state-pick:not([hidden])").waitFor();
  seen = await stage();
  console.log(
    `${stateName}: Back from the towns shows ${JSON.stringify(seen)}`,
  );
  assert.deepEqual(
    seen,
    { panel: "cr-place", states: true, towns: false },
    "Back after a state went somewhere other than the states",
  );
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/05-back-to-the-states.png`,
    });
  await page.locator("#cr-place-back").click();
  await page.locator("#cr-character:not([hidden])").waitFor();
  seen = await stage();
  assert.equal(seen.panel, "cr-character", "Back from the states");
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: Back returns to the states, then to the character");
} finally {
  await browser.close();
}
