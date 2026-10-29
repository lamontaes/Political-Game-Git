/* global process, URLSearchParams, console, document, fetch */
// Election day and night in the bench (npm run bench): a grown player in a
// place drawn from all 56 files for the soonest race they may enter, jumps
// the calendar to the week before, and plays Day by Day. Election morning
// opens with the canvass (Go canvassing), then the choice (Go vote, the
// ballot, marked for the first candidate). That night the returns pop-up
// steps through every place to the call; then the concession or victory
// scene. Each beat is photographed at 1440x900 into EDAY_SHOTS. EDAY_SEED
// replays a place; BENCH_PORT picks the server.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { drawPlace } from "../../scripts/core2-year/place.ts";

const runSeed = process.env.EDAY_SEED ?? String(Date.now());
const shots = process.env.EDAY_SHOTS;
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(180000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = async (name) => {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png` });
};
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Candidate",
    gender: "female",
    birthYear: 1985,
    birthMonth: 6,
    birthDay: 1,
  });
  let filed = null;
  let place = null;
  let personId = null;
  for (let draw = 0; draw < 6 && !filed; draw += 1) {
    place = drawPlace(`${runSeed}:${draw}`, "election-day");
    const made = await page.request.post(
      `${base}/api/newlife?${new URLSearchParams({ seed: place.seed, placeKey: place.key, person })}`,
      { timeout: 600000 },
    );
    assert.equal(made.status(), 200);
    personId = (await made.json()).personId;
    await page.reload();
    await page.locator("#front-continue").click();
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    filed = await page.evaluate(async () => {
      const gov = await (await fetch("/api/government")).json();
      const contests = (gov.contests ?? [])
        .map((row) => row.contest)
        .sort(
          (a, b) =>
            a.electionDate.localeCompare(b.electionDate) ||
            a.id.localeCompare(b.id),
        );
      for (const contest of contests) {
        const r = await fetch(
          `/api/file?${new URLSearchParams({ contestId: contest.id })}`,
          { method: "POST" },
        );
        const body = await r.json().catch(() => ({}));
        if (
          r.ok &&
          ["petitioning", "on-ballot"].includes(body.filing?.status ?? "")
        )
          return contest;
      }
      return null;
    });
  }
  assert.ok(filed, "no race the player could enter");
  console.log(
    `Place: ${place.name} (${place.key}), run seed ${place && runSeed}, place seed ${place.seed}; race ${filed.id} on ${filed.electionDate}`,
  );
  // The week before: a calendar jump, past every stop as a player would.
  const week = new Date(Date.parse(filed.electionDate) - 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  // Every stop the player's clock holds is continued past, as a player
  // would: whatever is pending now (a filing visit, a scene), then each one
  // the jump reaches. A choice is left to the character.
  const settle = async (packet) => {
    let at = packet;
    for (let i = 0; i < 50 && at?.kind === "stop"; i += 1) {
      const r = await page.request.post(
        `${base}/api/resume?${new URLSearchParams({ pauseId: at.pauseId })}`,
        { timeout: 600000 },
      );
      at = (await r.json().catch(() => ({}))).packet;
    }
    return at;
  };
  const current = async () =>
    (
      await (
        await page.request.post(
          `${base}/api/play?${new URLSearchParams({ id: personId })}`,
          { timeout: 600000 },
        )
      ).json()
    ).packet;
  for (let step = 0; step < 200; step += 1) {
    await settle(await current());
    const r = await page.request.post(
      `${base}/api/advance?${new URLSearchParams({ mode: "calendar", date: week })}`,
      { timeout: 600000 },
    );
    const body = await r.json().catch(() => ({}));
    if (/can't go backward/.test(JSON.stringify(body))) break;
    if (!r.ok() && /polling place first/.test(JSON.stringify(body))) {
      await page.request.post(
        `${base}/api/polling-place/leave?${new URLSearchParams({ id: personId })}`,
      );
      continue;
    }
    if (!r.ok())
      assert.fail(
        `${JSON.stringify(body).slice(0, 200)}; pending ${JSON.stringify(await current()).slice(0, 400)}`,
      );
    if (body.packet?.kind === "stop") {
      await settle(body.packet);
      continue;
    }
    break;
  }
  await page.reload();
  await page
    .locator("#front-continue")
    .click()
    .catch(() => {});
  // Day by day to election morning.
  const morning = page.locator("#election-day:not([hidden])");
  for (let day = 0; day < 12; day += 1) {
    if (await morning.isVisible().catch(() => false)) break;
    const talk = page.locator("#talk-leave");
    if (await talk.isVisible().catch(() => false))
      await talk.click({ timeout: 5000 }).catch(() => {});
    const resume = page.locator("#continue:not([hidden])");
    if (await resume.isVisible().catch(() => false))
      await resume.click({ timeout: 5000 }).catch(() => {});
    else
      await page
        .locator("#day")
        .click({ timeout: 5000 })
        .catch(() => {});
    await page.waitForTimeout(2500);
  }
  await morning.waitFor();
  await page.evaluate(() => document.fonts.ready);
  console.log("MORNING:", await page.locator("#election-day").innerText());
  // The card shows election morning, never the midnight the clock asked at.
  const clock = await page.locator("#card").innerText();
  console.log("CARD:", clock.replace(/\s+/g, " "));
  assert.doesNotMatch(clock, /12:00\s*AM/);
  await shot("eday-1-morning");
  await page
    .getByRole("button", { name: "Go canvassing", exact: true })
    .click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll("#election-day-acts button")].some((b) =>
      ["Go vote", "Continue"].includes(b.textContent),
    ),
  );
  console.log("CANVASS:", await page.locator("#election-day").innerText());
  await shot("eday-2-canvass-and-choice");
  // A candidate who no longer lives in the town the count reads (an
  // eviction, a move) has no ballot here: the morning says so and goes on.
  const away = !(await page
    .getByRole("button", { name: "Go vote", exact: true })
    .isVisible());
  if (away)
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  else {
    await page.getByRole("button", { name: "Go vote", exact: true }).click();
    await page.locator("#ballot:not([hidden])").waitFor();
    await shot("eday-3-ballot");
  }
  // Mark each race for its first candidate, as a voter might; a race below
  // the panel's fold is marked the same way.
  for (let i = 0; i < 40 && !away; i += 1) {
    if (!(await page.locator("#ballot:not([hidden])").isVisible())) break;
    const marked = await page.evaluate(() => {
      const open = document.querySelector(
        "#ballot-races .acts button:not([disabled])",
      );
      if (open) {
        open.click();
        return true;
      }
      // The page's races are marked: the ballot's next page.
      const next = [...document.querySelectorAll("#ballot-pager button")].find(
        (b) => !b.hidden && !b.disabled && b.offsetParent,
      );
      if (!next) return false;
      next.click();
      return true;
    });
    if (!marked) break;
    await page.waitForTimeout(800);
  }
  if (await page.locator("#ballot:not([hidden])").isVisible())
    await page.locator("#ballot-leave").click();
  // Election night: the returns pop-up, step by step to the call.
  const returns = page.locator("#returns:not([hidden])");
  for (let i = 0; i < 30; i += 1) {
    if (await returns.isVisible().catch(() => false)) break;
    // A job offer that holds the clock waits, as a player might let it.
    const later = page.getByRole("button", { name: "Not now", exact: true });
    if (await later.isVisible().catch(() => false)) {
      await later.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      continue;
    }
    const talk = page.locator("#talk-leave");
    // A control can hide between the look and the click (a panel opens):
    // each click waits briefly and the loop looks again.
    if (await talk.isVisible().catch(() => false))
      await talk.click({ timeout: 5000 }).catch(() => {});
    else {
      const resume = page.locator("#continue:not([hidden])");
      if (await resume.isVisible().catch(() => false))
        await resume.click({ timeout: 5000 }).catch(() => {});
      else
        await page
          .locator("#day")
          .click({ timeout: 5000 })
          .catch(() => {});
    }
    await page.waitForTimeout(3000);
  }
  if (!(await returns.isVisible().catch(() => false)))
    await shot("eday-stuck-before-returns");
  await returns.waitFor({ timeout: 300000 });
  console.log("RETURNS 1:", await page.locator("#returns").innerText());
  await shot("eday-4-returns-first");
  for (let i = 0; i < 40; i += 1) {
    const label = await page.locator("#returns-next").innerText();
    if (label === "Close") break;
    await page.locator("#returns-next").click();
  }
  console.log("CALL:", await page.locator("#returns").innerText());
  await shot("eday-5-returns-call");
  await page.locator("#returns-next").click();
  // The scene after the call: the concession call or the victory night.
  for (let i = 0; i < 6; i += 1) {
    const talk = page.locator("#talk:not([hidden])");
    if (await talk.isVisible().catch(() => false)) break;
    const resume = page.locator("#continue:not([hidden])");
    if (await resume.isVisible().catch(() => false))
      await resume.click({ timeout: 5000 }).catch(() => {});
    else
      await page
        .locator("#day")
        .click({ timeout: 5000 })
        .catch(() => {});
    await page.waitForTimeout(2500);
  }
  const talk = page.locator("#talk:not([hidden])");
  if (await talk.isVisible().catch(() => false)) {
    await page
      .locator("#talk-choices button")
      .first()
      .waitFor({ timeout: 15000 })
      .catch(() => {});
    console.log("SCENE:", await page.locator("#talk").innerText());
    await shot("eday-6-concede-or-celebrate");
  } else console.log("SCENE: none visible");
  assert.deepEqual(errors, []);
  console.log("PASS");
} finally {
  await browser.close();
}
