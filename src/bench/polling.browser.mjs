/* global process, URL, console, document */
// The ballot on election day (play-stop-21-ballot-stuck-on-first-page; no pager since Oct 29):
// Continue turns the ballot's pages to the player's own race; marking it
// records the vote. Honest UI drive on the bench: creator, party join,
// filing, calendar skip to election day, page the ballot.
// Run: BENCH_PORT=3001 [BENCH_SEED=<logged seed>] node --import tsx src/bench/polling.browser.mjs
// The town is drawn from all 56 places with the repo's drawPlace helper; the
// run seed is logged, so BENCH_SEED reproduces the same draws.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { drawPlace } from "../../scripts/core2-year/place.ts";
import { finishTalk } from "./start-life.mjs";
import { devModeOn, devRunUntilMayFile } from "./dev-setup.mjs";
// The run is pinned: BENCH_SEED names the seed the places are drawn from, and
// without it the check runs the seed below, which draws Hampstead, Maryland
// and a race that files straight onto the ballot (a petition race reaches it
// only with signatures this check does not gather). It never goes red by draw.
const PINNED_SEED = "39ec0fdc-2c02-4e33-a7b7-e193551af953";
const PORT = process.env.BENCH_PORT ?? "3000";
const BASE = `http://localhost:${PORT}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// Election morning comes first (owner, Oct 26: going to vote is a choice):
// skip the canvass if offered, then Go vote opens the ballot.
const toBallot = async () => {
  if (!(await page.locator("#election-day:not([hidden])").count())) return;
  const skipCanvass = page.getByRole("button", {
    name: "Not today",
    exact: true,
  });
  if (await skipCanvass.count()) await skipCanvass.click();
  await page.getByRole("button", { name: "Go vote", exact: true }).click();
  await page.locator("#ballot:not([hidden])").waitFor();
};
// Joining a party is on the Parties tab of Politics, one party's page at a
// time (the Politics ring opens Government): each page with a Join button,
// by the party's roster key and the button's words.
const partiesTab = async () => {
  // A talk under an open sheet is played once the sheet is closed.
  if (await page.locator("#sheet:not([hidden])").count())
    await page.locator("#sheet-close").click();
  await finishTalk(page);
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet-tabs").waitFor({ timeout: 20000 });
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Parties", exact: true })
    .click();
  await page
    .locator("#sheet-body .parties-screen, #sheet-body .record-empty")
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => {});
};
const joinable = async () => {
  await partiesTab();
  const keys = await page
    .locator("#sheet-body .parties-screen .roster-row")
    .evaluateAll((rows) => rows.map((row) => row.dataset.key));
  const found = [];
  for (const key of keys) {
    await page
      .locator(`#sheet-body .parties-screen .roster-row[data-key="${key}"]`)
      .click();
    await page
      .locator(`#sheet-body .roster-page[data-key="${key}"]`)
      .waitFor({ timeout: 10000 })
      .catch(() => {});
    const join = page.locator("#sheet-body .roster-page button", {
      hasText: /^Join /,
    });
    if (await join.count())
      found.push({ key, label: (await join.first().innerText()).trim() });
  }
  return found;
};
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let filedContest = "";
let filedStatus = "";
// The counter's latest visit, as the filing routes answer it.
let lastVisit = null;
page.on("response", async (r) => {
  if (new URL(r.url()).pathname.startsWith("/api/filing/")) {
    const body = await r.json().catch(() => null);
    if (body?.visit) lastVisit = body.visit;
  }
  if (new URL(r.url()).pathname === "/api/filing/choose") {
    try {
      const j = await r.json();
      console.log(
        "CHOOSE RESULT:",
        JSON.stringify(j.result ?? null).slice(0, 300),
      );
      if (["petitioning", "on-ballot"].includes(j.result?.status ?? "")) {
        filedContest = j.result.filing.contestId;
        filedStatus = j.result.status;
      }
    } catch {
      // Non-JSON filing response; the UI state below is the evidence.
    }
  }
});
const draws = [];
const runSeed = process.env.BENCH_SEED ?? PINNED_SEED;
console.log("Run seed:", runSeed);
// The creator draws its world seed from /api/seed; derive it from the run
// seed and the draw number so BENCH_SEED alone replays the same worlds.
let drawNumber = 0;
await page.route("**/api/seed", (route) =>
  route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ seed: `${runSeed}-world-${drawNumber}` }),
  }),
);
try {
  // A life with a parties module (tiny towns have none): redraw, all draws logged.
  let seed = "";
  let place = "";
  let parties = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    drawNumber = attempt;
    const titled = page.waitForResponse((r) => r.url().endsWith("/api/title"));
    await page.goto(`${BASE}/play`);
    await titled;
    await page.locator("#new-life").click();
    await page.locator("#new-start").click();
    await page.locator('[data-testid="gender-male"]').click();
    await page.locator("#cr-given").fill("Test");
    await page.locator("#cr-family").fill("Voter");
    await page.locator("#cr-month").selectOption({ index: 1 });
    await page.locator("#cr-day").selectOption({ index: 1 });
    await page.waitForFunction(
      () => document.getElementById("cr-year").options.length > 1,
    );
    const years = await page.locator("#cr-year option").allInnerTexts();
    const grown =
      years.find((y) => Number(y) <= 1996) ?? years[years.length - 1];
    await page.locator("#cr-year").selectOption({ label: grown });
    await page.locator("#cr-states .item").first().waitFor();
    const drawn = drawPlace(runSeed, `polling-${attempt}`);
    console.log("Drawn place:", drawn.key, drawn.name, drawn.state);
    // The states page; the search brings the drawn one onto the first page.
    const stateName = await page
      .locator(`[data-testid="state-${drawn.state}"]`)
      .evaluate((b) => b.textContent);
    await page.locator("#cr-state-search").fill(stateName);
    await page.locator(`[data-testid="state-${drawn.state}"]`).click();
    await page.locator("#cr-towns .item").first().waitFor();
    const townName = drawn.name.split(",")[0];
    await page.locator("#cr-town-search").fill(townName);
    const townItems = page.locator("#cr-towns .item", {
      has: page.locator("span", { hasText: townName }),
    });
    await townItems.first().waitFor();
    await townItems.first().click();
    const made = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 600000 },
    );
    await page.locator("#cr-begin").click();
    seed = new URL((await made).url()).searchParams.get("seed");
    // The world seed the creator obtained: with the drawn place this
    // reproduces the world (BENCH_SEED only reproduces the draws).
    console.log("World seed (creator):", seed, "run seed:", runSeed);
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    place = await page.locator("#card-place").innerText();
    draws.push(`${place} (seed ${seed})`);
    console.log("Draw", attempt + 1, ":", place, seed);
    parties = await joinable();
    if (parties.length) break;
    seed = "";
    place = "";
  }
  assert.ok(place, "no drawn town offered a party to join in 6 draws");
  console.log("Draws:", draws.join(" | "));
  // The joinable parties, through the UI.
  console.log("Parties:", parties.map((p) => p.label).join(" | "));
  assert.ok(parties.length, "no joinable party");
  // Join the first party on offer, on its own page, as a player does.
  const party = parties[0];
  await partiesTab();
  await page
    .locator(`#sheet-body .parties-screen .roster-row[data-key="${party.key}"]`)
    .click();
  await page
    .locator("#sheet-body .roster-page button", { hasText: party.label })
    .first()
    .click();
  await page.waitForTimeout(2000);
  console.log("Joined:", party.label);
  await page
    .locator("#sheet-close")
    .click()
    .catch(() => {});
  // A seat the player may file for has its window open: dev mode runs the world until one does.
  await finishTalk(page);
  await devModeOn(page);
  const opened = await devRunUntilMayFile(page);
  assert.equal(opened.reason, "event", "no seat opened its filing window");
  console.log(
    "Filing open:",
    (await page.locator("#card-clock").innerText()).replace(/\s+/g, " "),
  );
  // The town's filing office, from Travel, during its hours.
  let filed = "";
  for (let visit = 0; visit < 3 && !filed; visit += 1) {
    await finishTalk(page);
    await page
      .locator('[data-tab="travel"]')
      .first()
      .evaluate((e) => e.click());
    const office = page.locator(".travel-tile[data-filing]").first();
    await office.waitFor();
    await office.click();
    await page.locator('[data-testid="place-go"]').click();
    await page.locator("#talk:not([hidden])").waitFor();
    // The narrator sets the counter up first; Continue until the races are offered.
    const races = page.locator("#talk-choices button", {
      has: page.locator(".reply-facts"),
    });
    for (let line = 0; line < 12 && !(await races.count()); line += 1) {
      const next = page.locator("#talk-next:visible");
      if (await next.count()) await next.click();
      else await page.waitForTimeout(500);
    }
    if (!(await races.count())) continue;
    const texts = await races.allInnerTexts();
    // A council seat first, as the pager proof wants a full general-election ballot.
    const at = Math.max(
      0,
      texts.findIndex((t) => /council/i.test(t)),
    );
    console.log("Race:", texts[at].replace(/\s+/g, " "));
    await races.nth(at).click();
    await page.waitForTimeout(800);
    // The counter's own file choice, by its key in the visit record.
    const fileText = lastVisit?.choices?.find((c) => c.key === "file")?.text;
    const choices = page.locator("#talk-choices button");
    const labels = await choices.allInnerTexts();
    const fileAt = fileText
      ? labels.findIndex((l) => l.trim().startsWith(fileText.trim()))
      : -1;
    assert.ok(fileAt >= 0, `no File choice: ${labels.join(" | ")}`);
    const chosen = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/filing/choose",
    );
    await choices.nth(fileAt).click();
    await chosen;
    await page.waitForTimeout(800);
    if (filedContest) filed = `${filedStatus} ${filedContest}`;
  }
  assert.ok(filed, "could not file for a seat through the UI");
  // A race filed by petition reaches the ballot only with its signatures, which
  // this check does not gather: the draw is named and the run stops honestly.
  assert.equal(
    filedStatus,
    "on-ballot",
    `the open race files by petition (${filedContest}); this check gathers no signatures, so draw again`,
  );
  console.log("PASS filed:", filed);
  // The target election comes from the filed contest, not a fixed date.
  const targetDate = filedContest.split(":").pop();
  const [ty, tm, td] = targetDate.split("-").map(Number);
  const targetMonth = new Date(ty, tm - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const targetClock = new Date(ty, tm - 1, td).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  console.log("Target election:", targetDate, targetMonth, targetClock);
  // A race months away: dev mode runs the world to the week before it (the
  // same run that opened the filing), so the calendar's legs walk only the
  // last week, where every stop on the way still plays.
  const today = (await (await page.request.get(`${BASE}/api/title`)).json())
    .life?.date;
  const daysAway = today
    ? Math.round((Date.parse(targetDate) - Date.parse(today)) / 86400000)
    : 0;
  if (daysAway > 14) {
    await finishTalk(page);
    const ran = await page.request.post(`${BASE}/api/dev/run-until`, {
      data: { days: daysAway - 7 },
      timeout: 1800000,
    });
    assert.equal(ran.status(), 200, await ran.text());
    await page.reload();
    await page
      .locator("#front-continue")
      .click()
      .catch(() => {});
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    // Whatever the run left open (a stop, a talk) is played first.
    await finishTalk(page);
    if (await page.locator("#continue:not([hidden]):visible").count())
      await page.locator("#continue").click();
    console.log(
      "Dev run:",
      daysAway - 7,
      "days to",
      (await page.locator("#card-clock").innerText()).replace(/\s+/g, " "),
    );
  }
  // Run the clock to election day with the calendar's skip-forward.
  await page
    .locator('[data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  await page
    .locator(".calendar-heading h3")
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  for (let m = 0; m < 30; m += 1) {
    const heading = await page
      .locator(".calendar-heading h3")
      .innerText()
      .catch(() => "?");
    if (heading.includes(targetMonth)) break;
    await page.getByRole("button", { name: "Next month", exact: true }).click();
    await page.waitForTimeout(600);
  }
  console.log(
    "Calendar:",
    await page
      .locator(".calendar-heading h3")
      .innerText()
      .catch(() => "?"),
  );
  await page
    .locator(".month .day")
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  const day3 = page.locator(`.month button.day[data-date="${targetDate}"]`);
  assert.ok(await day3.count(), "no target day in view");
  await day3.first().click();
  await page.waitForTimeout(1000);
  console.log(
    "Clock:",
    await page
      .locator("#card-clock")
      .innerText()
      .catch(() => "?"),
  );
  await page.screenshot({
    path: "docs/reports/ballot-pages-2026-10-24/calendar-nov.png",
  });
  // Run time forward with the skip control; answer stops until the ballot shows.
  const skip = page.locator(".calendar-day .go-to-day");
  console.log("Skip-forward present:", await skip.count());
  if (await skip.count()) {
    await skip.first().click();
    await page.waitForTimeout(3000);
  }
  // A race a year or more away has a talk every week or two on the way.
  let stuckLegs = 0;
  let lastLegClock = "";
  for (let leg = 0; leg < 100; leg += 1) {
    await toBallot();
    if (await page.locator("#ballot:not([hidden])").count()) {
      const clock = await page
        .locator("#card-clock")
        .innerText()
        .catch(() => "?");
      if (clock.includes(String(ty))) break;
      // An earlier election's ballot: leave it honestly and keep skipping.
      console.log("Earlier ballot at", clock, "— leaving it");
      await page.locator("#ballot-leave").click();
      await page.waitForTimeout(2000);
    }
    if (
      (
        await page
          .locator("#card-clock")
          .innerText()
          .catch(() => "?")
      ).includes(targetClock)
    )
      break;
    // Answer whatever stop is open: a talk is played to its end as a player
    // would (Continue on each line, the first reply, Leave), a stop's Continue pressed.
    if (await page.locator("#talk:not([hidden])").count()) {
      console.log(
        "Stop: talk,",
        (
          (await page
            .locator("#talk-lines")
            .innerText()
            .catch(() => "?")) ?? ""
        )
          .replace(/\s+/g, " ")
          .slice(0, 100),
      );
      // A talk under the calendar is played once the sheet is closed.
      if (await page.locator("#sheet:not([hidden])").count())
        await page.locator("#sheet-close").click();
      await finishTalk(page);
    } else if (await page.locator("#continue:not([hidden]):visible").count()) {
      console.log("Stop: player Continue");
      await page
        .locator("#continue:not([hidden]):visible")
        .click()
        .catch(() => {});
      await page.waitForTimeout(2000);
    }
    // A scene still playing covers the menu: wait it out fully, don't touch the calendar.
    if (await page.locator("#game.cinema").count()) {
      console.log("Stop: cinema scene playing, waiting it out");
      await page
        .locator("#game.cinema")
        .waitFor({ state: "detached", timeout: 90000 })
        .catch(() => {});
      await page.waitForTimeout(1000);
    }
    // Run the clock again from the calendar. A talk that opened meanwhile
    // keeps the calendar shut: the loop looks again and plays it first.
    await page
      .locator('[data-tab="calendar"]')
      .first()
      .evaluate((e) => e.click());
    const calendarUp = await page
      .locator(".calendar-heading h3")
      .waitFor({ timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (!calendarUp) continue;
    for (let m = 0; m < 30; m += 1) {
      const heading = await page
        .locator(".calendar-heading h3")
        .innerText()
        .catch(() => "?");
      if (heading.includes(targetMonth)) break;
      const moved = await page
        .getByRole("button", { name: "Next month", exact: true })
        .click({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (!moved) break;
      await page.waitForTimeout(500);
    }
    await page
      .locator(".month .day")
      .first()
      .waitFor({ timeout: 15000 })
      .catch(() => {});
    const day3 = page.locator(`.month button.day[data-date="${targetDate}"]`);
    if (!(await day3.count())) {
      console.log("No day 3 in view; skipping leg");
      continue;
    }
    if (
      !(await day3
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      const cover = await day3
        .first()
        .evaluate((e) => {
          const r = e.getBoundingClientRect();
          const t = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
          return t
            ? `${t.tagName}#${t.id}.${t.className}`.slice(0, 120)
            : "none";
        })
        .catch(() => "?");
      console.log("Day 3 hidden; covering element:", cover);
      await page.screenshot({
        path: "docs/reports/ballot-pages-2026-10-24/covered.png",
      });
      // A scene may be ending: wait it out fully, then retry next leg.
      await page
        .locator("#game.cinema")
        .waitFor({ state: "detached", timeout: 90000 })
        .catch(() => {});
      continue;
    }
    await day3.first().click();
    await page.waitForTimeout(1000);
    const skip2 = page.locator(".calendar-day .go-to-day");
    if (await skip2.count()) {
      await skip2.first().click();
      await page.waitForTimeout(4000);
    }
    const legClock = await page
      .locator("#card-clock")
      .innerText()
      .catch(() => "?");
    console.log("Leg clock:", legClock);
    // A clock that does not move over three legs is named, not walked 100 times:
    // at Hampstead, Maryland (seed above) Hour, Day and Week all answer 400
    // "Player stop clock cannot cross an unresolved stop." with nothing on
    // screen to resolve (pool: play-clock-refuses-to-cross-a-stop-nothing-shows).
    stuckLegs = legClock === lastLegClock ? stuckLegs + 1 : 0;
    lastLegClock = legClock;
    assert.ok(
      stuckLegs < 3,
      `the clock did not move over three legs (${legClock}); a stop the screen does not show holds it`,
    );
  }
  console.log(
    "Clock:",
    await page
      .locator("#card-clock")
      .innerText()
      .catch(() => "?"),
  );
  // Election day arrived at midnight: play the day out until the polls stop
  // opens the ballot. Answer stops, wait out scenes, advance the day.
  // The last skip leg leaves the calendar sheet open over the day button.
  if (await page.locator("#sheet:not([hidden])").count()) {
    console.log("Election day: closing the calendar sheet");
    await page.locator("#sheet-close").click();
    await page.waitForTimeout(1000);
  }
  const arrived = (
    await page
      .locator("#card-clock")
      .innerText()
      .catch(() => "?")
  ).includes(targetClock);
  assert.ok(arrived, `legs never reached ${targetClock}`);
  for (let round = 0; round < 30; round += 1) {
    await toBallot();
    if (await page.locator("#ballot:not([hidden])").count()) break;
    console.log(
      "Round",
      round,
      await page
        .locator("#card-clock")
        .innerText()
        .catch(() => "?"),
    );
    if (await page.locator("#talk:not([hidden])").count()) {
      console.log("Election day stop: talk");
      await finishTalk(page);
      continue;
    }
    if (await page.locator("#continue:not([hidden]):visible").count()) {
      console.log("Election day stop: player Continue");
      await page
        .locator("#continue:not([hidden]):visible")
        .click()
        .catch(() => {});
      await page.waitForTimeout(2000);
      continue;
    }
    if (await page.locator("#game.cinema").count()) {
      console.log("Election day: cinema scene playing, waiting it out");
      await page
        .locator("#game.cinema")
        .waitFor({ state: "detached", timeout: 90000 })
        .catch(() => {});
      await page.waitForTimeout(1000);
      continue;
    }
    const day = page.locator("#day:not([disabled]):visible");
    if (await day.count()) {
      console.log("Election day: advancing the day");
      await day.first().click();
      await page.waitForTimeout(4000);
      continue;
    }
    console.log(
      "Election day: no ballot, no stops, no scenes, no day button; day count:",
      await page.locator("#day").count(),
      "disabled:",
      await page.locator("#day[disabled]").count(),
    );
    await page.waitForTimeout(3000);
  }
  console.log(
    "Ballot visible:",
    await page.locator("#ballot:not([hidden])").count(),
  );
  await page.screenshot({
    path: "docs/reports/ballot-pages-2026-10-24/election-day.png",
  });
  assert.ok(
    await page.locator("#ballot:not([hidden])").count(),
    "no ballot on election day",
  );
  const titles = () => page.locator("#ballot .ballot-race").allInnerTexts();
  const total = await page.locator("#ballot .ballot-race").count();
  console.log("Races on ballot:", total);
  console.log("Races:", (await titles()).join(" | "));
  await page.screenshot({
    path: "docs/reports/ballot-pages-2026-10-24/before-ballot.png",
  });
  // The ballot has no Back or Continue (owner, Oct 29): every race is on the one
  // page, which scrolls inside the panel, and the player's own race is reachable.
  assert.equal(
    await page
      .locator("#ballot button", { hasText: /^\s*(Continue|Back)\s*$/ })
      .count(),
    0,
    "the ballot shows Continue or Back",
  );
  const own = page.locator("#ballot .ballot-choice", {
    hasText: "Test Voter",
  });
  assert.ok(await own.count(), "own race (Test Voter) is not on the ballot");
  await own.first().scrollIntoViewIfNeeded();
  assert.ok(await own.first().isVisible(), "own race out of reach");
  console.log("PASS ballot: scrolls to own race");
  await page.screenshot({
    path: "docs/reports/ballot-pages-2026-10-24/own-race.png",
  });
  // Mark the own race; the mark response carries the ballot (visit) id.
  // The player, by the life's own record.
  const ownPersonId = (
    await (await page.request.get(`${BASE}/api/title`)).json()
  ).life?.personId;
  const marked = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/polling-place/mark",
    { timeout: 30000 },
  );
  await page
    .locator("#ballot .ballot-choice", {
      hasText: "Test Voter",
    })
    .first()
    .click();
  const markBody = await (await marked).json();
  const record = markBody.record ?? {};
  console.log("Ballot id:", record.id ?? "?");
  assert.ok(record.id, "mark response carried no ballot id");
  // The visit id exists before any vote (marked: {}), so assert the mark
  // itself: the player's candidateId under the filed contest's id.
  const playerId = ownPersonId;
  assert.ok(playerId, "the title names no player");
  assert.ok(filedContest, "no accepted filing contest id captured");
  assert.equal(
    record.marked?.[filedContest],
    playerId,
    `mark response: marked[${filedContest}] is not the player ${playerId}: ${JSON.stringify(record.marked)}`,
  );
  const readBack = await (
    await page.request.get(`${BASE}/api/polling-place`)
  ).json();
  const readContest = readBack?.contests?.find((c) => c.id === filedContest);
  assert.equal(
    readContest?.marked?.candidateId,
    playerId,
    `polling scene read back does not show the player's mark on ${filedContest}`,
  );
  console.log(
    "PASS marking: marked",
    filedContest,
    "=",
    playerId,
    "in the response and the scene; ballot id",
    record.id,
  );
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: "docs/reports/ballot-pages-2026-10-24/after-mark.png",
  });
  // Leaving the polls takes the ballot with it: no race button stays in the page to post a mark
  // to polls that are closed ("The polls aren't open for this character." once per later press).
  await page.locator("#ballot-leave").click();
  await page.waitForTimeout(800);
  assert.equal(
    await page.locator("#ballot .ballot-choice").count(),
    0,
    "a ballot's race buttons stay in the page after the visit ends",
  );
  assert.deepEqual(
    errors.filter((message) => /polls aren't open/.test(message)),
    [],
    "the page raised the closed-polls error",
  );
  console.log(
    "PASS after the visit: no ballot buttons left, no closed-polls error",
  );
} catch (error) {
  // Where it stopped, for whoever reads the failure (POLL_SHOTS: a folder).
  if (process.env.POLL_SHOTS)
    await page
      .screenshot({ path: `${process.env.POLL_SHOTS}/polling-stopped.png` })
      .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
