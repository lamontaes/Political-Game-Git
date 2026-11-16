/* global process, console, document, fetch, URL */
// A body's at-large seats are one race on Politics, Elections
// (play-at-large-race-one-row), on the bench (npm run bench): a new life in a
// named or drawn place, played to a day (dev mode's run), then Elections: the
// at-large body is one row with no holder's name in its title, its page lists
// everyone running for any of its seats and how many seats it fills, and File
// for it opens the clerk on that race. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/at-large-race.browser.mjs [shots dir]
// PLACE_KEY names the place (Haleyville, Alabama is 0132704; Manchester,
// Connecticut 0944690); RACE_DAY the day to play to (default 2025-05-20).
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
const day = process.env.RACE_DAY ?? "2025-05-20";
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
  const reached = await page.evaluate(async (until) => {
    const date = (await (await fetch("/api/dev/state")).json()).date;
    const days = Math.round((Date.parse(until) - Date.parse(date)) / 864e5);
    if (days > 0)
      await fetch("/api/dev/run-until", {
        method: "POST",
        body: JSON.stringify({ days, cap: days + 1 }),
      });
    return (await (await fetch("/api/dev/state")).json()).date;
  }, day);
  console.log("Played to", reached);
  const ballot = await page.evaluate(async () =>
    (await fetch("/api/government/local-races")).json(),
  );
  const close = page.locator("#sheet-close");
  if (await close.isVisible()) await close.click();
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator('#sheet-tabs [data-tab="campaigns"]').click();
  await page.locator("#sheet-body .roster-row").first().waitFor();
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll("#sheet-body .roster-row[data-contest]")].map(
      (e) => ({
        contest: e.dataset.contest,
        title: e.querySelector("b")?.textContent.trim() ?? "",
        text: e.innerText,
      }),
    ),
  );
  console.log(
    `${ballot.date}: ${rows.map((r) => r.text.replace(/\s+/g, " ")).join(" | ")}`,
  );
  if (shots) await page.screenshot({ path: `${shots}/elections.png` });
  const titles = rows.map((r) => r.title);
  assert.equal(new Set(titles).size, titles.length, "a race printed twice");
  // A race's own district may stand in its title; a holder's name may not.
  const holders = new Set(
    ballot.races.flatMap((race) => race.filers.map((f) => f.name)),
  );
  for (const r of rows) {
    const named = /\(([^)]*)\)/.exec(r.title)?.[1];
    assert.ok(
      !named ||
        !/^[A-Z][a-z]+ [A-Z]/.test(named) ||
        /^(District|Ward|Seat|Place|Position) /.test(named),
      `${r.title}: told apart by a holder`,
    );
    assert.ok(!holders.has(named), `${r.title}: told apart by a candidate`);
  }
  const race = ballot.races.find((r) => r.seats > 1);
  if (!race) {
    console.log("No at-large race on this ballot");
    assert.deepEqual(errors, [], "page errors");
    process.exit(0);
  }
  console.log(
    `${race.title}: ${race.seats} seats, contest ${race.contestId}, counts ${race.contestIds.join(", ")}; running: ${race.filers.map((f) => `${f.name} (${f.filingId})`).join(", ") || "no one yet"}`,
  );
  await page
    .locator(`#sheet-body .roster-row[data-contest="${race.contestId}"]`)
    .click();
  await page.locator("#sheet-body .roster-page").waitFor();
  await page.waitForTimeout(400);
  const shown = await page.evaluate(() => ({
    people: document.querySelectorAll("#sheet-body .roster-page .member-card")
      .length,
    text: document.querySelector("#sheet-body .roster-page").innerText,
  }));
  assert.equal(shown.people, race.filers.length, "everyone running");
  assert.match(shown.text, new RegExp(`\\b${race.seats}\\b`), "seats to fill");
  if (shots) await page.screenshot({ path: `${shots}/race.png` });
  const file = page.locator('[data-testid="file-for-it"]:visible').first();
  if (await file.count()) {
    // The counter offers the race (its first contest) and File for it picks it.
    const opening = page.waitForResponse((r) =>
      r.url().includes("/api/filing/open"),
    );
    const choosing = page.waitForRequest((r) =>
      r.url().includes("/api/filing/choose"),
    );
    await file.click();
    const visit = (await (await opening).json()).visit;
    const pick = visit?.choices.find(
      (c) => c.action.kind === "pick" && c.action.contestId === race.contestId,
    );
    assert.ok(pick, `the clerk offers no pick of ${race.contestId}`);
    await choosing;
    await page.locator("#talk:not([hidden])").waitFor();
    await page.waitForTimeout(800);
    console.log(`File for it: the clerk on ${race.contestId}`);
    if (shots) await page.screenshot({ path: `${shots}/file-for-it.png` });
  } else
    console.log(
      `No File for it today: filing ${race.filingOpen ? "open" : "not open"}, may file ${race.playerMayFile}`,
    );
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS the at-large body is one race");
} finally {
  await browser.close();
}
