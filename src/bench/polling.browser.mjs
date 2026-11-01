/* global process, URL, console, document */
// The ballot on election day (play-stop-21-ballot-stuck-on-first-page; no pager since Oct 29):
// Continue turns the ballot's pages to the player's own race; marking it
// records the vote. Honest UI drive on the bench: creator, party join,
// filing, calendar skip to election day, page the ballot.
// Run: BENCH_PORT=3001 [BENCH_SEED=<logged seed>] node --import tsx src/bench/polling.browser.mjs
// The town is drawn from all 56 places with the repo's drawPlace helper; the
// run seed is logged, so BENCH_SEED reproduces the same draws.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { drawPlace } from "../../scripts/core2-year/place.ts";
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
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let filedContest = "";
page.on("response", async (r) => {
  if (new URL(r.url()).pathname === "/api/filing/choose") {
    try {
      const j = await r.json();
      console.log(
        "CHOOSE RESULT:",
        JSON.stringify(j.result ?? null).slice(0, 300),
      );
      if (["petitioning", "on-ballot"].includes(j.result?.status ?? ""))
        filedContest = j.result.filing.contestId;
    } catch {
      // Non-JSON filing response; the UI state below is the evidence.
    }
  }
});
const draws = [];
const runSeed = process.env.BENCH_SEED ?? randomUUID();
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
    await page.locator("#cr-character-next").click();
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
    await page
      .locator('[data-tab="politics"]')
      .first()
      .evaluate((e) => e.click());
    await page
      .locator("#sheet-body")
      .waitFor({ timeout: 20000 })
      .catch(() => {});
    for (let w = 0; w < 10; w += 1) {
      await page.evaluate(() => {
        document.getElementById("sheet-body")?.scrollTo(0, 999999);
      });
      await page.waitForTimeout(1500);
      if (
        await page.locator("#sheet-body button", { hasText: /join/i }).count()
      )
        break;
    }
    if (await page.locator("#sheet-body button", { hasText: /join/i }).count())
      break;
    seed = "";
    place = "";
  }
  assert.ok(place, "no drawn town had a parties module in 6 draws");
  console.log("Draws:", draws.join(" | "));
  // The joinable parties, through the UI.
  const joinLabels = await page
    .locator("#sheet-body button", { hasText: /join/i })
    .evaluateAll((els) => els.map((e) => e.textContent.trim()));
  console.log("Parties:", joinLabels.join(" | "));
  assert.ok(joinLabels.length, "no joinable party");
  let filed = "";
  for (const joinLabel of joinLabels) {
    if (filed) break;
    await page
      .locator('[data-tab="politics"]')
      .first()
      .evaluate((e) => e.click());
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.getElementById("sheet-body")?.scrollTo(0, 999999);
    });
    await page.waitForTimeout(500);
    const jb = page.locator("#sheet-body button", { hasText: joinLabel });
    if (await jb.count()) {
      await jb.first().click();
      await page.waitForTimeout(2000);
      console.log("Joined:", joinLabel);
    }
    // File for a 2026 race first, a council seat if one is open.
    await page
      .locator('[data-tab="travel"]')
      .first()
      .evaluate((e) => e.click());
    const visited = new Set();
    for (let round = 0; round < 12 && !filed; round += 1) {
      await page
        .locator('[data-tab="travel"]')
        .first()
        .evaluate((e) => e.click());
      await page.waitForTimeout(1000);
      if (!(await page.locator("#sheet:not([hidden])").count())) continue;
      const labels = await page
        .locator("#sheet-body button", { hasText: /Go/ })
        .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))
        .catch(() => []);
      console.log("Travel round", round, "destinations:", labels.length);
      const label = labels.find((l) => !visited.has(l));
      if (!label) break;
      visited.add(label);
      await page
        .locator(`#sheet-body button[aria-label="${label}"]`)
        .evaluate((e) => e.click());
      const talked = await page
        .locator("#talk:not([hidden])")
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (!talked) continue;
      await page
        .locator("#talk-choices button")
        .first()
        .waitFor({ timeout: 10000 })
        .catch(() => {});
      for (let r = 0; r < 6 && !filed; r += 1) {
        const choices = page.locator("#talk-choices button");
        const n = await choices.count();
        if (!n) {
          await page.waitForTimeout(1500);
          continue;
        }
        const texts = [];
        for (let c = 0; c < n; c += 1)
          texts.push(await choices.nth(c).innerText());
        if (!texts.some((t) => /20\d\d/i.test(t))) {
          console.log("No dated race here, moving on");
          await page
            .locator("#talk-leave")
            .click()
            .catch(() => {});
          continue;
        }
        const order = [...Array(n).keys()].sort((a, b) => {
          // A 2026 race fills a multi-page general-election ballot, which is
          // what the pager proof needs; nearer races fit on one page.
          const rank = (t) =>
            /council.*2026/i.test(t)
              ? 0
              : /2026/i.test(t)
                ? 1
                : /council/i.test(t)
                  ? 2
                  : /mayor/i.test(t)
                    ? 3
                    : /I want to run for/i.test(t)
                      ? 4
                      : 5;
          return rank(texts[a]) - rank(texts[b]);
        });
        let acted = false;
        for (const c of order) {
          if (!/I want to run for/i.test(texts[c])) continue;
          console.log("Filing as:", texts[c]);
          await choices.nth(c).click();
          await page.waitForTimeout(2000);
          console.log(
            "choices:",
            await page
              .locator("#talk-choices button")
              .allInnerTexts()
              .catch(() => []),
          );
          // No form at the counter: the filing carries the party on record.
          const confirm = page.locator("#talk-choices button", {
            hasText: /file for this office/i,
          });
          if (await confirm.count()) {
            await confirm.first().click();
            await page.waitForTimeout(2000);
          }
          acted = true;
          break;
        }
        if (acted) break;
        await choices.first().click();
        await page.waitForTimeout(1500);
      }
      const lines = await page
        .locator("#talk-lines")
        .innerText()
        .catch(() => "");
      if (/filed|thank you|congratulations|on the ballot/i.test(lines))
        filed = lines.slice(-120);
      if (filedContest) filed = `on-ballot ${filedContest}`;
      await page
        .locator("#talk-leave")
        .click()
        .catch(() => {});
    }
  }
  assert.ok(filed, "could not file for a seat through the UI");
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
  for (let leg = 0; leg < 48; leg += 1) {
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
    // Answer whatever stop is open.
    const talk = page.locator(
      "#talk:not([hidden]) #talk-choices button:visible",
    );
    if (await talk.count()) {
      console.log(
        "Stop: talk,",
        (
          await talk
            .first()
            .innerText()
            .catch(() => "?")
        ).slice(0, 60),
      );
      await talk.first().click();
      await page.waitForTimeout(2000);
    } else if (await page.locator("#talk:not([hidden])").count()) {
      console.log(
        "Stop: choiceless talk:",
        (
          (await page
            .locator("#talk-lines")
            .innerText()
            .catch(() => "?")) ?? ""
        ).slice(-160),
      );
      await page.screenshot({
        path: "docs/reports/ballot-pages-2026-10-24/stop.png",
      });
      const left = page.locator("#talk-leave:visible");
      if (await left.count()) await left.click().catch(() => {});
      else
        await page
          .locator("#talk-silent:visible")
          .click()
          .catch(() => {});
      await page.waitForTimeout(2000);
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
    // Run the clock again from the calendar.
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
      await page
        .getByRole("button", { name: "Next month", exact: true })
        .click();
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
    console.log(
      "Leg clock:",
      await page
        .locator("#card-clock")
        .innerText()
        .catch(() => "?"),
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
    const talk = page.locator(
      "#talk:not([hidden]) #talk-choices button:visible",
    );
    if (await talk.count()) {
      console.log("Election day stop: talk");
      await talk.first().click();
      await page.waitForTimeout(2000);
      continue;
    }
    if (await page.locator("#talk:not([hidden])").count()) {
      const left = page.locator("#talk-leave:visible");
      if (await left.count()) await left.click().catch(() => {});
      else
        await page
          .locator("#talk-silent:visible")
          .click()
          .catch(() => {});
      await page.waitForTimeout(2000);
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
  const titles = () => page.locator("#ballot-races .race h3").allInnerTexts();
  const total = await page.locator("#ballot-races .race").count();
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
  const own = page.locator("#ballot-races .race button", {
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
  const sceneBefore = await (
    await page.request.get(`${BASE}/api/polling-place`)
  ).json();
  const ownPersonId = sceneBefore?.people?.find(
    (x) => x.reason === "you",
  )?.personId;
  const marked = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/polling-place/mark",
    { timeout: 30000 },
  );
  await page
    .locator("#ballot-races .race button", {
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
  assert.ok(playerId, "scene named no 'you' person before marking");
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
} finally {
  await browser.close();
}
