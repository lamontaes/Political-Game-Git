/* global process, console, document, URL, URLSearchParams */
// The filing counter in a real browser, on the bench (npm run bench): a new
// life in a place drawn from all 56, Travel to the first office that takes
// filings, its view, then the counter. No Open races panel and no rules panel
// beside the counter (owner, Oct 28 sitting, points 29 and 31: dev menus);
// each race the clerk offers reads differently and explains its office on
// hover (point 30); a grown resident who joined a party files and the filing
// keeps that party, with no form; filing takes the afternoon off the clock.
//   node src/bench/filing.browser.mjs            SEED=<seed> replays a world
import assert from "node:assert/strict";
import { chromium } from "playwright";
import parameters from "../core2/data/parameters.json" with { type: "json" };
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
page.on("pageerror", (e) => errors.push(e.message));
// The player's clock, in minutes: the moment the last packet reached, or,
// for a life that has lived no moment yet, the end of the world's day, where
// the player's next hours start.
async function clock() {
  const { life } = await (await page.request.get(`${base}/api/title`)).json();
  const day = Date.parse(`${life.date}T00:00:00Z`) / 60000;
  const at = life.packet?.at ?? {
    date: new Date((day + 24 * 60) * 60000).toISOString().slice(0, 10),
    minuteOfDay: 0,
  };
  return {
    ...at,
    minutes: Date.parse(`${at.date}T00:00:00Z`) / 60000 + at.minuteOfDay,
  };
}
async function openNavigationTab(tab) {
  // The rail over the card is the one menu, open screen or not.
  const button = page.locator(`#rings [data-tab="${tab}"]`);
  await button.focus();
  assert.ok(
    await button.evaluate((node) => node === document.activeElement),
    "the navigation button did not receive keyboard focus",
  );
  await page.keyboard.press("Enter");
  await page.locator("#sheet:not([hidden])").waitFor();
}
// Travel to the first office that takes filings: its card opens its view,
// and Go opens the counter.
async function toCounter() {
  await openNavigationTab("travel");
  const office = page
    .locator("#sheet-body .entry", { hasText: /You file here/ })
    .first();
  await office.waitFor();
  const name = await office.locator("h3").innerText();
  await office.click();
  await page.locator("#sheet-body.place-view").waitFor();
  await page.locator('[data-testid="place-go"]').click();
  await page.locator("#talk:not([hidden])").waitFor();
  // The narrator sets the counter up first, alone; Continue, then the clerk.
  const next = page.locator("#talk-next");
  if (await next.isVisible().catch(() => false)) await next.click();
  await page.locator("#talk-choices button").first().waitFor();
  return name;
}
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  // SEED=<seed> replays a drawn world: the new-life request carries it.
  if (process.env.SEED)
    await page.route("**/api/newlife?*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("seed", process.env.SEED);
      return route.continue({ url: url.toString() });
    });
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const asked = new URL((await made).url()).searchParams;
  const world = { seed: asked.get("seed"), date: asked.get("date") };
  console.log("Seed:", world.seed);
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  console.log("Office:", await toCounter());
  // No panel beside the counter: the Open races menu and the rules panel are gone.
  const panels = await page.evaluate(() => ({
    raceMenu: Boolean(document.getElementById("race-menu")),
    overlay: Boolean(document.getElementById("filing-overlay")),
    partyForm: Boolean(document.getElementById("filing-party")),
  }));
  assert.deepEqual(
    panels,
    { raceMenu: false, overlay: false, partyForm: false },
    "a dev panel still stands beside the counter",
  );
  const choices = await page.locator("#talk-choices button").allInnerTexts();
  console.log("Choices:", choices.join(" | "));
  assert.equal(
    new Set(choices).size,
    choices.length,
    "two choices read the same",
  );
  // The office explained on hover: the card names the office and what the
  // records know of it, with nothing to mark learned.
  const pick = page
    .locator("#talk-choices button", { has: page.locator(".reply-facts") })
    .first();
  assert.ok(await pick.count(), "no race to pick at the counter");
  const picked = (
    await pick.evaluate((b) => b.childNodes[0]?.textContent ?? "")
  ).trim();
  await pick.hover();
  await page.locator("#tip:not([hidden])").waitFor();
  const tip = await page.evaluate(() => ({
    term: document.getElementById("tip-term").textContent.trim(),
    short: document.getElementById("tip-short").textContent.trim(),
    learned: document.getElementById("tip-learned").hidden,
  }));
  console.log(`Hover "${picked}": ${tip.term} — ${tip.short}`);
  assert.ok(
    tip.term && picked.includes(tip.term),
    "the card names another office",
  );
  assert.ok(tip.short.length > 8, "the card says nothing of the office");
  assert.ok(tip.learned, "an office card offers Mark as learned");
  assert.doesNotMatch(
    tip.short,
    /\b\d{4}-\d{2}-\d{2}\b/,
    "a date reads as a code",
  );
  await page.screenshot({
    path: "docs/play-first/shots/sitting-oct28/30-office-hover.png",
  });
  await page.mouse.move(10, 10);
  await pick.click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: "docs/play-first/shots/sitting-oct28/29-counter-no-panels.png",
  });
  await page.locator("#talk-leave").click();
  await page.locator("#talk").waitFor({ state: "hidden", timeout: 10000 });
  // A grown resident of the same world joins a party and files: the filing
  // keeps that party with no form at the counter.
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Candidate",
    gender: "nonbinary",
    birthYear: 1980,
    birthMonth: 6,
    birthDay: 15,
  });
  const adult = await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ ...world, person })}`,
    { timeout: 600000 },
  );
  assert.equal(adult.status(), 200);
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  // Join a party on Politics, as a player does. Three honest cases: parties
  // on offer (join the first), already a member (that party), or no party in
  // this place (run as an independent).
  await openNavigationTab("politics");
  const join = page.locator("#sheet-body button", { hasText: /^Join / });
  const member = page.locator("#sheet-body [data-party-id]");
  const shown = await join
    .first()
    .or(member.first())
    .waitFor({ timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  let joined = "";
  if (shown && (await join.count())) {
    joined = (await join.first().innerText()).replace(/^Join /, "");
    const joining = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/party/join",
    );
    await join.first().click();
    await joining;
    console.log("Joined:", joined);
  } else if (shown) {
    const line = await member.first().locator(".record-value").innerText();
    joined = line.split(" · ")[0].trim();
    console.log("Already a member of:", joined);
  } else {
    console.log("No party on offer in this place: filing as independent");
  }
  await page.locator("#sheet-close").click();
  await toCounter();
  await page
    .locator("#talk-choices button", { has: page.locator(".reply-facts") })
    .first()
    .click();
  const file = page.locator("#talk-choices button", {
    hasText: /file for this office/i,
  });
  await file.first().waitFor();
  const filed = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/filing/choose",
  );
  const before = await clock();
  await file.first().click();
  const result = (await (await filed).json()).result;
  // Filing takes the afternoon: the hours come off the player's clock (a
  // stop that needs the player may end the afternoon sooner).
  const after = await clock();
  const spent = after.minutes - before.minutes;
  console.log(
    `Clock: ${before.date} minute ${before.minuteOfDay} -> ${after.date} minute ${after.minuteOfDay} (${spent} minutes)`,
  );
  assert.ok(
    spent > 0 && spent <= parameters.filingVisitHours.value * 60,
    `filing moved the clock ${spent} minutes`,
  );
  console.log(
    "Filed:",
    JSON.stringify({
      party: result?.filing?.party,
      platform: result?.filing?.platform,
      joined,
    }),
  );
  assert.ok(
    ["petitioning", "on-ballot"].includes(result?.filing?.status),
    `the filing was refused: ${JSON.stringify(result?.unmet ?? result)}`,
  );
  // The party on the filing is the resident's tie on record (joined now, or
  // held before), never a form's.
  const me = (await (await page.request.get(`${base}/api/title`)).json()).life
    .personId;
  const onRecord = (
    await (
      await page.request.get(
        `${base}/api/government?id=${encodeURIComponent(me)}`,
      )
    ).json()
  ).party?.member?.name;
  console.log("Party on record:", onRecord ?? "none");
  assert.equal(
    result.filing.party ?? "",
    onRecord ?? "",
    "the filing does not carry the party on the resident's record",
  );
  if (joined)
    assert.equal(onRecord, joined, "the join did not reach the record");
  assert.deepEqual(errors, []);
  console.log(
    "PASS the counter with no panels: races read apart and explain their office on hover; the filing keeps the party joined",
  );
} finally {
  await browser.close();
}
