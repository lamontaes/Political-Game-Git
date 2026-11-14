/* global process, console, document, NodeFilter, URL, URLSearchParams */
// The player's screens in a real browser, on the bench (npm run bench): a new
// life in a place drawn from all 56. News, every Politics tab, the filing
// counter, the clerk's reply after filing, Campaigns and the talk box must show
// no field name, status code, ISO date or developer button.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { playOpening } from "./start-life.mjs";
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
  ["an ISO date", /\b\d{4}-\d{2}(?:-\d{2})?\b/],
  ["a field name", /\b[a-z]+[A-Z][A-Za-z]*\b/],
  ["a status code", /\b[a-z]+(?:-[a-z]+)+\b/],
  ["a status code", /\b[A-Z]+(?:-[A-Z]+)+\b/],
  ["a record kind", /\b[A-Z][a-z]+\.[a-z]+\b/],
  ["a bare fraction", /(?<![$\d.])\b0\.\d+\b(?!\s*%)/],
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
  "co-op",
  "e-mail",
  "x-ray",
]);
// Real names a player reads that look like codes: a broadcast station's call
// sign ("WKIL-TV") and a bill numbered by its year after its form's word, as
// a clerk reads it ("Act 2025-11", src/english/bill-names.ts spokenDesignation).
const named = (match, line) =>
  /^[KW][A-Z]{2,3}-(?:TV|FM|AM)$/.test(match) ||
  new RegExp(`\\b(?:Act|Ordinance|Resolution) ${match}\\b`).test(line);
async function read(screen, selector) {
  // Each visible text node by itself, so neighboring buttons never run together.
  const text = await page.evaluate((s) => {
    const lines = [];
    for (const root of document.querySelectorAll(s)) {
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walk.nextNode(); node; node = walk.nextNode())
        if (node.parentElement?.checkVisibility() && node.textContent.trim())
          lines.push(node.textContent.trim());
    }
    return lines.join("\n");
  }, selector);
  for (const line of text.split("\n"))
    for (const [what, pattern] of tells) {
      const match = line.match(pattern);
      if (match && !words.has(match[0].toLowerCase()) && !named(match[0], line))
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
// A named repro, to reread a draw a merger reported: the place
// (PLAIN_TEXT_PLACE_KEY, a place key as drawPlace gives it) and the game seed
// (PLAIN_TEXT_SEED) of the first life; left unset, the game draws both.
const placeKey = process.env.PLAIN_TEXT_PLACE_KEY;
const seedWanted = process.env.PLAIN_TEXT_SEED;
if (placeKey || seedWanted)
  await page.route("**/api/newlife?*", (route) => {
    const url = new URL(route.request().url());
    if (placeKey && !url.searchParams.has("placeKey"))
      url.searchParams.set("placeKey", placeKey);
    if (seedWanted && !url.searchParams.has("person"))
      url.searchParams.set("seed", seedWanted);
    return route.continue({ url: url.toString() });
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
  // A talk ends the way a player ends it: Leave where it is shown, else the
  // scene's own way on, else its one remaining reply (the clerk's "Thank
  // you." after an age refusal ends the visit, and Leave is then hidden).
  const endTalk = async () => {
    const talk = page.locator("#talk:not([hidden])");
    for (let turn = 0; turn < 20 && (await talk.count()); turn += 1) {
      const way = page.locator(
        "#talk-leave:visible, #talk-next:visible, #talk-skip:visible",
      );
      const reply = page.locator("#talk-choices button:visible");
      if (await way.count()) await way.first().click();
      else if (await reply.count()) await reply.last().click();
      await page.waitForTimeout(600);
    }
    assert.equal(await talk.count(), 0, "a talk the player cannot leave");
  };
  // The filing counter: the first office in Travel that takes filings. The
  // clerk's races each carry their seat, election day and holder
  // (`.reply-facts`, play.mjs renderFiling); a talk at the counter without
  // them is another scene, which is left as a player would before the tile
  // is opened again.
  const counter = async (who) => {
    const race = page.locator("#talk-choices button:has(.reply-facts)");
    for (let visit = 0; visit < 4; visit += 1) {
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
      if (await race.count()) {
        // The visit the pick answers with: its choices name what each does.
        const picked = page.waitForResponse(
          (r) => new URL(r.url()).pathname === "/api/filing/choose",
        );
        await race.first().click();
        const visit = await (await picked).json();
        await page.waitForTimeout(600);
        await read(`Talk box, race picked (${who})`, "#talk");
        return visit;
      }
      console.log(
        `At the counter (${who}): another scene, left before the clerk: ${(await page.locator("#talk-choices").innerText()).replace(/\s+/g, " ")}`,
      );
      await endTalk();
    }
    assert.fail(`the clerk offered no race in four visits (${who})`);
  };
  // A seat the player may file for has its window open: the world runs until one does (dev mode, on the Calendar).
  await devModeOn(page);
  const opened = await devRunUntilMayFile(page);
  assert.equal(opened.reason, "event", "no seat opened its filing window");
  // The player's screens are read as a player sees them: dev mode off.
  await devModeOff(page);
  await counter("seventeen");
  await endTalk();
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
  await devModeOn(page);
  await devRunUntilMayFile(page);
  await devModeOff(page);
  const visit = await counter("grown");
  // The choice that files, read from the visit's record (its words are the
  // bank's, which change): the button that carries its text.
  const file = (visit?.visit?.choices ?? []).find(
    (choice) => choice.action?.kind === "file",
  );
  const choices = page.locator("#talk-choices button");
  const labels = await choices.allInnerTexts();
  const fileAt = file
    ? labels.findIndex((l) => l.trim().startsWith(file.text.trim()))
    : -1;
  assert.ok(fileAt >= 0, `no File choice: ${labels.join(" | ")}`);
  const filed = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/filing/choose",
  );
  await choices.nth(fileAt).click();
  await filed;
  await page.waitForTimeout(800);
  await read("After filing", "#talk");
  await endTalk();
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
    // Kept from masking a failure above it when the browser closes.
    moved.catch(() => {});
    await page.locator("#week").click();
    await moved;
    await page.waitForTimeout(1000);
    // Anything that stops the week is answered as a player would.
    for (let stop = 0; stop < 20; stop++) {
      // A scene the week brought (a visitor at the house, say) is played out.
      if (await page.locator("#talk:not([hidden])").count()) await endTalk();
      if (!(await page.locator("#continue").isVisible())) break;
      const resumed = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/api/resume",
        { timeout: 600000 },
      );
      await page.locator("#continue").click();
      await resumed;
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
