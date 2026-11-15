/* global process, console, document, fetch, URLSearchParams */
// A government's Savings on Budgets is marked as the game's starting estimate
// until play has replaced it (play-nov8-town-savings-shown-with-no-mark-that-it-is-an-estimate),
// on the bench (npm run bench): a new life in a named (PLACE_KEY) or drawn
// place, Politics, Budgets, each government's tab on day one and after twelve
// months (dev mode's run). For each, the proof gives Savings over a year's
// Coming in, the government's record id, and whether the row is marked. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/savings-estimate.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const [shots] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(900000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const dollars = (minor) => `$${Math.round(minor / 100).toLocaleString()}`;
const look = async (when) => {
  const { view, controls } = await page.evaluate(async () => {
    const id = (await (await fetch("/api/dev/state")).json()).playerId;
    return {
      view: await (await fetch(`/api/budget?id=${id}`)).json(),
      controls: await (await fetch("/api/controls")).json(),
    };
  });
  const mark = controls.budgetStrips.savingsEstimated
    .replace("{amount}", "")
    .trim();
  const close = page.locator("#sheet-close");
  if (await close.isVisible()) await close.click();
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator('#sheet-tabs [data-tab="budgets"]').click();
  await page.waitForTimeout(800);
  for (const gov of view.governments.filter((g) => g.level !== "federal")) {
    const tab = page.locator(`#sheet-body [data-gov="${gov.id}"]`);
    if (await tab.count()) await tab.first().click();
    await page.waitForTimeout(600);
    const text = await page.evaluate(
      () => document.getElementById("sheet-body").innerText,
    );
    const revenue = gov.latest?.totals?.revenue?.minor ?? 0;
    const cash = gov.books?.cashMinor ?? 0;
    const share = revenue ? (cash / revenue).toFixed(3) : "?";
    console.log(
      `${when} ${gov.name} (${gov.id}, ${gov.level}): Savings ${dollars(cash)} = ${share} of a year's Coming in; opened with ${dollars(gov.openingCash?.minor ?? 0)}; marked ${gov.savingsEstimated}`,
    );
    if (gov.books)
      assert.equal(
        text.includes(mark),
        gov.savingsEstimated,
        `${gov.name}: the mark on screen and the record disagree`,
      );
    assert.doesNotMatch(text, /SG-|\.json|stopgap/, "dev text on Budgets");
    if (shots)
      await page.screenshot({ path: `${shots}/${when}-${gov.level}.png` });
  }
};
try {
  // An adult life: Budgets is open to a player of voting age.
  await page.goto(`${base}/play`);
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Reader",
    gender: "female",
    birthYear: 1980,
    birthMonth: 6,
    birthDay: 15,
  });
  const seed =
    process.env.SEED ??
    (await (await page.request.get(`${base}/api/seed`)).json()).seed;
  const made = await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed, person, ...(process.env.PLACE_KEY ? { placeKey: process.env.PLACE_KEY } : {}) })}`,
    { timeout: 600000 },
  );
  console.log("Seed:", seed, "Place:", (await made.json()).placeName);
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  await look("day-1");
  await page.evaluate(async () => {
    await fetch("/api/dev/run-until", {
      method: "POST",
      body: JSON.stringify({ days: 365, cap: 366 }),
    });
  });
  await look("month-12");
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS Savings carries the estimate mark while it is one");
} finally {
  await browser.close();
}
