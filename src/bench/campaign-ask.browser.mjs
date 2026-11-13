/* global process, console, document, fetch, URL */
// A candidate who knows you asks you for money (play-campaign-ask-reaches-player),
// on the bench (npm run bench): a new life, dev mode on, the world run 15 days
// at a time with dev mode's run until a candidate's request waits on the player
// (at most 400 days). Politics, Elections lists it under its own heading; its
// page shows the race, the sum the player would give and their cash. The player
// gives a smaller whole-dollar sum: their cash drops by exactly that, and the
// request is gone. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/campaign-ask.browser.mjs [shots dir]
// SEED and PLACE_KEY replay one world.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { devModeOn } from "./dev-setup.mjs";
import { playOpening } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
/** Days per run and the most days run before the check gives up (run lengths, not model values). */
const STEP = 15;
const MOST = 400;
/** The most lives the check starts looking for an ask. */
const LIVES = 3;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(180000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
if (process.env.PLACE_KEY || process.env.SEED)
  await page.route("**/api/newlife?*", (route) => {
    const url = new URL(route.request().url());
    if (process.env.SEED) url.searchParams.set("seed", process.env.SEED);
    if (process.env.PLACE_KEY)
      url.searchParams.set("placeKey", process.env.PLACE_KEY);
    return route.continue({ url: url.href });
  });
const json = (path, method = "GET", body) =>
  page.evaluate(
    async ({ path, method, body }) =>
      (
        await fetch(path, {
          method,
          ...(body ? { body: JSON.stringify(body) } : {}),
        })
      ).json(),
    { path, method, body },
  );
/** A new life from the creator, then dev mode on; prints its place and seed. */
async function newLife() {
  // A life with money to be asked for: made in the creator with a 1980
  // birthday, so the player is a working adult with savings (a drawn new life
  // starts at 18 with nothing to give, and nobody asks a person with nothing
  // past their cushion: donationAnswer's no-spare). State and town are drawn.
  await page.goto("http://localhost:3000/play");
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("[data-gender=female]").click();
  await page.locator("#cr-random-name").click();
  await page.waitForFunction(() => document.getElementById("cr-given").value);
  await page.locator("#cr-year").selectOption("1980");
  const states = page.locator("#cr-states button");
  await states.nth(Math.floor(Math.random() * (await states.count()))).click();
  const towns = page.locator("#cr-towns button");
  await towns.first().waitFor();
  await towns.nth(Math.floor(Math.random() * (await towns.count()))).click();
  await page.locator("#cr-screen:not([hidden])").waitFor();
  const built = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#cr-begin").click();
  const made = await built;
  const body = await made.json();
  await page.waitForFunction(
    () => document.getElementById("card-name")?.textContent.trim(),
    null,
    { timeout: 600000 },
  );
  await playOpening(page, body.sceneMomentId ?? null);
  console.log(
    "Place:",
    body.placeName,
    "Seed:",
    new URL(made.url()).searchParams.get("seed"),
  );
  await devModeOn(page);
}
try {
  // Lives in drawn places in turn, until a candidate who knows the player asks
  // (a place's year may hold no race whose candidate counts them in).
  let asked = { asks: [] };
  for (let life = 0; life < LIVES && !asked.asks.length; life += 1) {
    await newLife();
    asked = await json("/api/campaign/asks");
    for (let day = 0; !asked.asks.length && day < MOST; day += STEP) {
      await json("/api/dev/run-until", "POST", { days: STEP, cap: STEP });
      asked = await json("/api/campaign/asks");
    }
  }
  assert.ok(
    asked.asks.length,
    `a candidate who knows the player asked within ${MOST} days in one of ${LIVES} lives`,
  );
  const ask = asked.asks[0];
  console.log(
    `Asked: ${ask.candidate} (${ask.candidateId}) for ${ask.race}, ${ask.suggestedMinor / 100} dollars suggested, ${asked.cashMinor / 100} held; ask ${ask.id}`,
  );
  await page.keyboard.press("Escape");
  const start = Date.now();
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Elections", exact: true })
    .click();
  const row = page.locator(`.roster-row[data-ask="${ask.id}"]`);
  await row.click();
  const give = page.getByRole("button", { name: "Give", exact: true });
  await give.waitFor();
  console.log(`The request opened in ${Date.now() - start} ms`);
  if (shots) await page.screenshot({ path: `${shots}/request.png` });
  const size = Math.max(1, Math.floor(ask.suggestedMinor / 200));
  await page.locator(".number-box").last().fill(String(size));
  await give.click();
  await page.waitForTimeout(1500);
  if (shots) await page.screenshot({ path: `${shots}/after-gift.png` });
  const after = await json("/api/campaign/asks");
  assert.ok(
    !after.asks.some((a) => a.id === ask.id),
    "the answered request is gone",
  );
  assert.equal(
    asked.cashMinor - after.cashMinor,
    size * 100,
    "the player's cash dropped by exactly the gift",
  );
  // A refusal: the next request declined, and that candidate never asks again.
  const next = after.asks[0];
  if (next) {
    await page.locator(`.roster-row[data-ask="${next.id}"]`).click();
    await page.getByRole("button", { name: "Decline", exact: true }).click();
    await page.waitForTimeout(1500);
    if (shots) await page.screenshot({ path: `${shots}/after-decline.png` });
    await json("/api/dev/run-until", "POST", { days: 60, cap: 60 });
    const later = await json("/api/campaign/asks");
    assert.ok(
      !later.asks.some((a) => a.candidateId === next.candidateId),
      `${next.candidate} does not ask again after the refusal`,
    );
    console.log(
      `Declined ${next.candidate} (${next.id}); 60 days on, no new ask from them`,
    );
  }
  assert.deepEqual(errors, [], "page errors");
  console.log(`PASS gave ${size} dollars to ${ask.candidate}`);
} finally {
  await browser.close();
}
