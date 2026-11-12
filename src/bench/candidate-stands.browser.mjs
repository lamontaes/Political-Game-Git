/* global process, console, document, fetch, URL */
// A local race's candidates show the few stands the race turns on, a stand on a
// spending line as a sentence about more or less money for it, never the
// line's name with For or Against (play-nov8-candidates-stands-are-budget-lines),
// on the bench (npm run bench): a new life in a named (PLACE_KEY) or drawn
// place, played to RACE_DAY (default 2025-08-15) with dev mode's run, then
// Politics, Elections, the race with the most candidates. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/candidate-stands.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
const day = process.env.RACE_DAY ?? "2025-08-15";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(600000);
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
  await page.evaluate(async (until) => {
    const date = (await (await fetch("/api/dev/state")).json()).date;
    const days = Math.round((Date.parse(until) - Date.parse(date)) / 864e5);
    if (days > 0)
      await fetch("/api/dev/run-until", {
        method: "POST",
        body: JSON.stringify({ days, cap: days + 1 }),
      });
  }, day);
  const [ballot, controls] = await page.evaluate(async () => [
    await (await fetch("/api/government/local-races")).json(),
    await (await fetch("/api/controls")).json(),
  ]);
  const race = [...ballot.races].sort(
    (a, b) => b.filers.length - a.filers.length,
  )[0];
  if (!race?.filers.length) {
    console.log(`No local race has a candidate by ${day}`);
    process.exit(0);
  }
  const close = page.locator("#sheet-close");
  if (await close.isVisible()) await close.click();
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator('#sheet-tabs [data-tab="campaigns"]').click();
  await page
    .locator(`#sheet-body .roster-row[data-contest="${race.contestId}"]`)
    .click();
  await page.locator("#sheet-body .roster-page .member-card").first().waitFor();
  await page.waitForTimeout(500);
  const text = await page.evaluate(
    () => document.querySelector("#sheet-body .roster-page").innerText,
  );
  if (shots) await page.screenshot({ path: `${shots}/race.png` });
  console.log(
    `${race.title} (${race.contestId}), ${race.filers.length} running`,
  );
  const lines = controls.policyNames ?? {};
  for (const f of race.filers) {
    console.log(`  ${f.name} (${f.filingId}):`);
    for (const st of f.stances)
      console.log(
        `    filed ${st.question}=${st.position} -> ${st.words ?? (st.question.startsWith("budget-line:") ? "(left out: no words yet)" : `${lines[st.question] ?? st.question}: ${st.position > 0 ? "For" : "Against"}`)}`,
      );
  }
  // No spending line's name stands as a row with For or Against.
  for (const f of race.filers)
    for (const st of f.stances.filter((s) =>
      s.question.startsWith("budget-line:"),
    )) {
      const name = lines[st.question];
      if (!name) continue;
      assert.doesNotMatch(
        text,
        new RegExp(`${name.toUpperCase()}\\s*\\n?\\s*(For|Against)\\b`),
        `${name} shown with For or Against`,
      );
    }
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS no spending line is shown as For or Against");
} finally {
  await browser.close();
}
