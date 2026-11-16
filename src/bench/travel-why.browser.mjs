/* global process, console, fetch */
// Every Travel card says why it is listed, and the town's office is listed
// on the day its board meets (play-travel-in-a-village-lists-no-town-office),
// on the bench (npm run bench): a new life in a drawn place; each card's
// detail has a "Why here" line; then dev mode's run, a day at a time (up to
// 60 days), until the town office's card shows with "Its board meets today". Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium [BENCH_SEED=<seed>] node src/bench/travel-why.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
import { devModeOn } from "./dev-setup.mjs";

const [shots] = process.argv.slice(2);
const DAYS = 60;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const openTravel = async () => {
  await page.keyboard.press("Escape");
  await page
    .locator('[data-tab="travel"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".travel-tile").first().waitFor();
};
try {
  // BENCH_SEED draws the world from that seed (to retake a picture in the same
  // place); without it a new life is drawn.
  if (process.env.BENCH_SEED) {
    await page.goto("http://localhost:3000/play");
    const made = await page.request.post(
      `http://localhost:3000/api/newlife?seed=${process.env.BENCH_SEED}`,
      { timeout: 600000 },
    );
    assert.equal(made.status(), 200, "the world builds from the seed");
  }
  const life = await startLife(page, { fresh: !process.env.BENCH_SEED });
  console.log("Place:", life.placeName, "Seed:", life.seed);
  await openTravel();
  const tiles = page.locator(".travel-tile");
  const n = await tiles.count();
  for (let i = 0; i < n; i += 1) {
    await tiles.nth(i).click();
    await page.locator(".travel-facts").first().waitFor();
    const facts = await page.locator(".travel-facts").innerText();
    const title = (await tiles.nth(i).innerText()).trim();
    // A filing counter says when it opens; every other card says why.
    if (!/filing/i.test(facts))
      assert.match(facts, /Why here/i, `${title} says why it is listed`);
    if (i === 0 && shots)
      await page.screenshot({ path: `${shots}/travel-why.png` });
  }
  console.log(`${n} cards, each with its reason`);
  await devModeOn(page);
  let found = false;
  for (let week = 0; week < DAYS && !found; week += 1) {
    await openTravel();
    const office = page.locator(".travel-tile", {
      hasText: /^(City|Town|Village|Borough|Township|County) of /,
    });
    if (await office.count()) {
      await office.first().click();
      const facts = page.locator(".travel-facts");
      await facts.waitFor();
      if (/meets today/i.test(await facts.innerText())) {
        found = true;
        if (shots) await page.screenshot({ path: `${shots}/town-office.png` });
        console.log(
          `${(await office.first().innerText()).trim()}: listed, its board meets today`,
        );
        break;
      }
    }
    await page.evaluate(async () =>
      (
        await fetch("/api/dev/run-until", {
          method: "POST",
          body: JSON.stringify({ days: 1, cap: 1 }),
        })
      ).json(),
    );
  }
  assert.ok(
    found,
    `the town office listed on a meeting day within ${DAYS} days`,
  );
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS every card says why; the town office on its meeting day");
} finally {
  await browser.close();
}
