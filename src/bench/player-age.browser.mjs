/* global console, process, document, URL */
// A new game starts the player at 18 or older (owner, Nov 16), from the creator and without it.
// Without it: the player is one of the town's adults. From it: the creator's birth years start at
// age 18, and the life begun at the age picked is that age. Each time dev mode's "How this world
// opened" shows the player's age and how it was set. Fails on a page error, a creator year under
// 18, or a player under 18. Run against a fresh bench:
//   node src/bench/player-age.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { playOpening, startLife } from "./start-life.mjs";
import { devModeOn } from "./dev-setup.mjs";

const shots = process.argv[2];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

/** Dev mode's player rows: the age row's value and how it was made. */
async function ageRow(name) {
  await devModeOn(page);
  const place = await page.locator("#card-place").innerText();
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page
    .locator("#sheet-body button, #sheet button", { hasText: /^Metrics$/ })
    .first()
    .click();
  await page.locator(".dev-opening").waitFor();
  await page
    .locator('[data-testid="dev-opening-subject"]')
    .selectOption("person");
  const row = page.locator(".dev-opening-row", {
    hasText: "Age when the life began",
  });
  await row.waitFor();
  const cells = await row.locator("td").allInnerTexts();
  console.log(name, "|", place, "|", cells.slice(0, 2).join(" | "));
  if (shots) {
    await row.evaluate((n) => n.scrollIntoView({ block: "center" }));
    await page.screenshot({ path: `${shots}/player-age-${name}.png` });
  }
  return Number.parseInt(cells[0].replace(/^.*?:\s*/, ""), 10);
}

try {
  // Without the creator: New game, Advanced, a new world.
  await startLife(page, { url: `${base}/play`, fresh: true });
  const drawn = await ageRow("without-creator");
  assert.ok(drawn >= 18, `without the creator the player is ${drawn}`);

  // From the creator: the youngest birth year it offers is age 18; begin a life at it.
  await page.goto(`${base}/play`);
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-screen:not([hidden])").waitFor();
  await page.locator("[data-gender=female]").click();
  await page.locator("#cr-given").fill("Test");
  await page.locator("#cr-family").fill("Person");
  await page.waitForFunction(() => document.getElementById("cr-given").value);
  const years = await page
    .locator("#cr-year option")
    .evaluateAll((options) => options.map((o) => o.textContent));
  const ages = years.map((label) => Number(/age (\d+)/.exec(label)?.[1]));
  console.log("creator ages", Math.min(...ages), "to", Math.max(...ages));
  assert.equal(Math.min(...ages), 18, "the creator's youngest age");
  await page
    .locator("#cr-year")
    .selectOption({ index: ages.indexOf(Math.min(...ages)) });
  await page.locator("#cr-place-random").click();
  await page.locator("#cr-bust .bust-stack:not(.loading)").waitFor();
  const born = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#cr-begin").click();
  await playOpening(page, (await (await born).json()).sceneMomentId ?? null);
  await page.locator("#card:not([hidden])").waitFor({ timeout: 60000 });
  const chosen = await ageRow("from-creator");
  assert.equal(chosen, 18, "a life begun at 18 from the creator");
  assert.deepEqual(errors, [], "page errors");
} finally {
  await browser.close();
}
