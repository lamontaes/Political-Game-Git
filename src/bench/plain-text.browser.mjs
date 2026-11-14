/* global process, console, document, NodeFilter, URL, URLSearchParams */
// The player's screens in a real browser, on the bench (npm run bench): a new
// life in a place drawn from all 56. News, every Politics tab, the filing
// counter, the clerk's reply after filing, Campaigns and the talk box must show
// no field name, status code, ISO date or developer button.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { finishTalk, leaveTalk, playOpening } from "./start-life.mjs";
import { devModeOff, devModeOn, devRunUntilMayFile } from "./dev-setup.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shots = process.env.PLAIN_TEXT_SHOTS;
const found = [];
// What developer text looks like once a screen draws it.
const tells = [
  // "Act 2025-12" and "Ordinance 2025-18" are a law's number, not a date.
  [
    "an ISO date",
    /(?<!\b(?:Acts?|Ordinances?|Resolutions?|Measures?) )\b\d{4}-\d{2}(?:-\d{2})?\b/,
  ],
  ["a field name", /\b[a-z]+[A-Z][A-Za-z]*\b/],
  ["a status code", /\b[a-z]+(?:-[a-z]+)+\b/],
  ["a status code", /\b[A-Z]+(?:-[A-Z]+)+\b/],
  ["a record kind", /\b[A-Z][a-z]+\.[a-z]+\b/],
  // Three or more decimals is an unrounded value; a one-decimal change ("up 0.3") is rounded.
  ["a bare fraction", /(?<![$\d.])\b0\.\d{3,}\b(?!\s*%)/],
  ["the Mark gap button", /\bMark gap\b/],
  ["a raw yes-or-no value", /\b(?:True|False)\b/],
];
// Hyphenated American English words that are not codes.
const words = new Set([
  "full-time",
  "part-time",
  "self-employed",
  "year-round",
  "re-elected",
  "re-election",
  "one-time",
  "first-time",
  "long-term",
  "short-term",
  "high-school",
  "single-family",
  "multi-family",
  "co-op",
  "e-mail",
  "x-ray",
  "same-day",
  "self-defense",
  "assessor-collector",
  "pre-k",
  "well-being",
  "cost-of-living",
  "on-site",
  "non-profit",
  "single-family",
]);
/** A broadcast call sign with its band ("WAGH-TV"), which stays in capitals (47 CFR 73.3550). */
const CALL_SIGN = /^[KW][A-Z]{2,3}-(?:TV|FM|AM|DT|LP|CD)$/;
async function read(screen, selector) {
  // Each visible text node by itself, so neighboring buttons never run together.
  const text = await page.evaluate((s) => {
    const lines = [];
    for (const root of document.querySelectorAll(s)) {
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walk.nextNode(); node; node = walk.nextNode())
        // Dev mode's own controls (Mark gap, its panels) are not the player's
        // screen: this check turns dev mode on only to run the world.
        if (
          node.parentElement?.checkVisibility() &&
          !node.parentElement.closest("#talk-gap, .dev-only") &&
          node.textContent.trim()
        )
          lines.push(node.textContent.trim());
    }
    return lines.join("\n");
  }, selector);
  for (const line of text.split("\n"))
    for (const [what, pattern] of tells) {
      const match = line.match(pattern);
      if (
        match &&
        !words.has(match[0].toLowerCase()) &&
        !CALL_SIGN.test(match[0])
      )
        found.push(`${screen}: ${what} "${match[0]}" in "${line.trim()}"`);
    }
  if (shots)
    await page.screenshot({
      path: `${shots}/${screen.replace(/\W+/g, "-").toLowerCase()}.png`,
    });
}
async function sheet(tab) {
  await page
    .locator(`[data-tab="${tab}"]`)
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet-body").waitFor();
  await page.waitForTimeout(800);
}
// A place to start in (PLAIN_TEXT_PLACE_KEY, a place key as drawPlace gives
// it), to reread a draw a merger reported; otherwise the game draws one.
const placeKey = process.env.PLAIN_TEXT_PLACE_KEY;
if (placeKey)
  await page.route("**/api/newlife?*", (route) => {
    const url = new URL(route.request().url());
    if (!url.searchParams.has("placeKey"))
      url.searchParams.set("placeKey", placeKey);
    return route.continue({ url: url.toString() });
  });
// The counter's latest visit, as the filing routes answer it.
let lastVisit = null;
let filingWaited = false;
page.on("response", async (response) => {
  if (!new URL(response.url()).pathname.startsWith("/api/filing/")) return;
  const body = await response.json().catch(() => null);
  if (body?.visit) lastVisit = body.visit;
  // Something that came up on the way is lived first; the counter waits.
  if (new URL(response.url()).pathname === "/api/filing/open")
    filingWaited = Boolean(body?.waiting);
});
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  // The world the game drew, to file in again as a grown resident below.
  const asked = new URL((await made).url()).searchParams;
  const world = {
    seed: asked.get("seed"),
    date: asked.get("date"),
    ...(asked.get("placeKey") ? { placeKey: asked.get("placeKey") } : {}),
  };
  console.log("Seed:", world.seed, "date:", world.date);
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  await playOpening(page, (await (await made).json()).sceneMomentId ?? null);
  console.log("Place:", await page.locator("#card-place").innerText());
  await sheet("news");
  await read("News", "#sheet");
  // News prints stories, never record rows with kinds, series or
  // jurisdiction labels (owner, Oct 27).
  if (
    /\bSeries\b|\bJurisdiction\b|Public record/.test(
      await page.locator("#sheet").innerText(),
    )
  )
    found.push("News: a record row with its kind or series labels");
  await sheet("politics");
  const tabs = page.locator("#sheet-tabs button");
  for (let i = 0; i < (await tabs.count()); i++) {
    const name = (await tabs.nth(i).innerText()).trim();
    await tabs.nth(i).click();
    await page.waitForTimeout(800);
    await read(`Politics ${name}`, "#sheet");
  }
  // The filing counter: the first office in Travel that takes filings.
  const counter = async (who, tries = 3) => {
    await finishTalk(page);
    await sheet("travel");
    const go = page.locator(".travel-tile[data-filing]");
    await go.first().waitFor();
    let opened = false;
    for (let i = 0; i < (await go.count()) && !opened; i++) {
      await go.nth(i).click();
      const placeGo = page.locator('[data-testid="place-go"]');
      // The place card draws after its tile is chosen (it loads what the place offers first).
      if (
        await placeGo.waitFor({ timeout: 5000 }).then(
          () => true,
          () => false,
        )
      )
        await placeGo.click();
      opened = await page
        .locator("#talk:not([hidden])")
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);
    }
    assert.ok(opened, "no place in Travel takes filings");
    // A story on the way plays first: it is lived, and the office is visited again.
    if (filingWaited && tries > 1) {
      await finishTalk(page);
      return counter(who, tries - 1);
    }
    await read(`Talk box (${who})`, "#talk");
    // The clerk's scene leads in before the race choices: Continue until they are offered.
    const choice = page.locator("#talk-choices button").first();
    const next = page.locator("#talk-next:visible");
    for (let turn = 0; turn < 12 && !(await choice.count()); turn += 1) {
      await choice.or(next).first().waitFor();
      if (await choice.count()) break;
      await next.click();
      await read(`Talk box, lead-in (${who})`, "#talk");
    }
    await choice.click();
    await page.waitForTimeout(600);
    await read(`Talk box, race picked (${who})`, "#talk");
  };
  // Escape closes the top open thing and opens Options only when nothing is
  // open, so a sheet left open (Travel, after the filing counter) is closed first.
  const optionsFree = async () => {
    if (await page.locator("#sheet-close").isVisible())
      await page.locator("#sheet-close").click();
  };
  // A seat the player may file for has its window open: the world runs until one does (dev mode, on the Calendar).
  await optionsFree();
  await devModeOn(page);
  const opened = await devRunUntilMayFile(page);
  assert.equal(opened.reason, "event", "no seat opened its filing window");
  // The screens are read as a player sees them: dev mode off.
  await devModeOff(page);
  await counter("seventeen");
  // Leave the counter, or play the talk to its end where Leave is not offered.
  await leaveTalk(page);
  // A grown resident of the same world files, so the clerk's reply and
  // Campaigns are read too.
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Candidate",
    gender: "nonbinary",
    birthYear: 1980,
    birthMonth: 6,
    birthDay: 15,
  });
  const adult = await page.request.post(
    `http://localhost:3000/api/newlife?${new URLSearchParams({ ...world, person })}`,
    { timeout: 600000 },
  );
  assert.equal(adult.status(), 200);
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  await optionsFree();
  await devModeOn(page);
  await devRunUntilMayFile(page);
  await devModeOff(page);
  await counter("grown");
  // The clerk's lead-in ends on the choice to take the papers; the filing is
  // made by the choice after it. Each is answered as a player would, until the
  // filing is on record.
  let filedSeen = false;
  page.on("response", (r) => {
    if (new URL(r.url()).pathname === "/api/filing/choose") filedSeen = true;
  });
  for (let turn = 0; turn < 10 && !filedSeen; turn += 1) {
    const choices = page.locator("#talk-choices button");
    const labels = await choices.allInnerTexts();
    // The clerk words the commit choice from a bank (File, take the papers, Where do I sign...): the
    // choice that is not a way out is the filing.
    const fileAt = labels.findIndex(
      (l) => !/\b(?:not now|think|leave|walk|never mind|later|see)\b/i.test(l),
    );
    if (fileAt >= 0) await choices.nth(fileAt).click();
    else if (await page.locator("#talk-next").isVisible())
      await page.locator("#talk-next").click();
    else assert.fail(`no File choice: ${labels.join(" | ")}`);
    await page.waitForTimeout(600);
  }
  assert.ok(filedSeen, "the filing was never made");
  await page.waitForTimeout(800);
  await read("After filing", "#talk");
  await leaveTalk(page);
  await sheet("politics");
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Campaign", exact: true })
    .click();
  await page.locator(".campaign-board").first().waitFor();
  await read("Politics Campaigns after filing", "#sheet");
  // Two weeks on, News carries the region's numbers and the month's stories.
  await page.locator("#sheet-close").click();
  for (let week = 0; week < 2; week++) {
    const moved = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/advance",
      { timeout: 600000 },
    );
    moved.catch(() => {});
    // Whatever holds the clock (a scene, a stop) is answered first, as a player would.
    for (
      let hold = 0;
      hold < 30 && (await page.locator("#week").isDisabled());
      hold += 1
    ) {
      if (await page.locator("#talk-leave").isVisible())
        await page.locator("#talk-leave").click();
      else if (await page.locator("#talk-next").isVisible())
        await page.locator("#talk-next").click();
      else if (await page.locator("#talk-choices button").count())
        await page.locator("#talk-choices button").first().click();
      else if (await page.locator("#continue").isVisible())
        await page.locator("#continue").click();
      await page.waitForTimeout(500);
    }
    await page.locator("#week").click();
    await moved;
    await page.waitForTimeout(1000);
    // Anything that stops the week is answered as a player would: a talk is
    // played through, a stop's Continue pressed.
    for (let stop = 0; stop < 20; stop++) {
      await finishTalk(page);
      if (!(await page.locator("#continue").isVisible())) break;
      const resumed = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/api/resume",
        { timeout: 600000 },
      );
      resumed.catch(() => {});
      await page
        .locator("#continue")
        .click({ timeout: 5000 })
        .catch(() => {});
      await resumed.catch(() => {});
      await page.waitForTimeout(1000);
    }
  }
  await sheet("news");
  await read("News two weeks on", "#sheet");
  if (
    /\bSeries\b|\bJurisdiction\b|Public record/.test(
      await page.locator("#sheet").innerText(),
    )
  )
    found.push(
      "News two weeks on: a record row with its kind or series labels",
    );
  for (const line of found) console.log(line);
  assert.deepEqual(found, [], "developer text on the player's screens");
  assert.deepEqual(errors, []);
  console.log("PASS no developer text on News, Politics, filing or talk");
} finally {
  await browser.close();
}
