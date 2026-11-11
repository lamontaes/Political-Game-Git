/* global process, console, document, URL */
// One person, one face (play-one-person-shows-two-faces): a life made in the
// creator shows the player's one bust (the same head, hair and facial hair,
// read from their one looks record) on every screen the player's own face
// appears (You, Jobs and study, Your life, the title's Continue, Saved
// games), and a household member shows the same face on People as in the talk
// box. Run against the bench (npm run bench):
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/one-face.browser.mjs [shots dir]
// STATE and TOWN name a place to search in the creator (the audit's repro:
// STATE="New Hampshire" TOWN=Blodgett); without them a state and town are drawn.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { playOpening } from "./start-life.mjs";

const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const [shots] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) =>
  shots ? page.screenshot({ path: `${shots}/${name}.png` }) : null;
/**
 * Who a face slot draws: the bust pieces that make the person (head, facial
 * hair, hair), not the clothes, which follow where they are (bust.ts dress).
 */
const faceIn = async (selector) => {
  const stack = page.locator(`${selector} .bust-stack`).first();
  if (!(await stack.count())) return null;
  return stack.evaluate((node) =>
    [...node.querySelectorAll("img")]
      .map((img) => new URL(img.src).pathname)
      .filter((path) => /\/(?:head|face|hair)-[^/]*$/.test(path))
      .join(" "),
  );
};
const seen = {};
try {
  await page.goto(`${base}/play`);
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("[data-gender=female]").click();
  await page.locator("#cr-random-name").click();
  await page.waitForFunction(() => document.getElementById("cr-given").value);
  if (process.env.STATE)
    await page.locator("#cr-state-search").fill(process.env.STATE);
  const states = page.locator("#cr-states button");
  await states
    .nth(
      process.env.STATE
        ? 0
        : Math.floor(Math.random() * (await states.count())),
    )
    .click();
  if (process.env.TOWN)
    await page.locator("#cr-town-search").fill(process.env.TOWN);
  await page.waitForTimeout(500);
  const towns = page.locator("#cr-towns button");
  await towns
    .nth(
      process.env.TOWN ? 0 : Math.floor(Math.random() * (await towns.count())),
    )
    .click();
  await page.locator("#cr-screen:not([hidden])").waitFor();
  const life = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#cr-begin").click();
  const made = await life;
  const body = await made.json();
  console.log(
    "Place:",
    body.placeName,
    "Seed:",
    new URL(made.url()).searchParams.get("seed"),
  );
  await page.waitForFunction(
    () => document.getElementById("card-name")?.textContent.trim(),
    null,
    { timeout: 600000 },
  );
  // The talk box: whoever speaks to the player shows the face their People card shows.
  if (body.sceneMomentId) {
    await page.locator("#talk").waitFor({ state: "visible", timeout: 60000 });
    await page.waitForTimeout(800);
    seen.talk = await faceIn(".busts-person.speaking");
    await shot("talk-box");
  }
  await playOpening(page, null);
  await page.waitForTimeout(1500);
  await shot("player-card");
  const timed = async (open, ready) => {
    const start = Date.now();
    await open();
    await page.locator(ready).first().waitFor();
    return Date.now() - start;
  };
  const ms = {};
  ms.you = await timed(
    () => page.locator('#rings [data-tab="who"]').click(),
    "#sheet-body .mxbust .bust-stack",
  );
  seen.you = await faceIn("#sheet-body .mxbust");
  // The screen fades in; the picture is taken once it has.
  await page.waitForTimeout(800);
  await shot("you");
  for (const tab of ["jobs", "history"]) {
    await page.locator(`[data-tab="${tab}"]:visible`).first().click();
    await page.waitForTimeout(800);
    seen[tab] = await faceIn("#sheet-body .mxbust");
    await shot(tab);
  }
  await page.keyboard.press("Escape");
  ms.people = await timed(
    () => page.locator('#rings [data-tab="people"]').click(),
    "#sheet .mxbust .bust-stack",
  );
  await page.waitForTimeout(800);
  await shot("people");
  // The open card's face, and each household member's as their card opens.
  const people = [await faceIn("#sheet .mxbust")];
  const rows = page.locator("#sheet .roster-row");
  for (let at = 0; at < Math.min(4, await rows.count()); at += 1) {
    await rows.nth(at).click();
    await page.waitForTimeout(700);
    people.push(await faceIn("#sheet .mxbust"));
  }
  // The title: Continue's face and Saved games' bust.
  await page.goto(`${base}/play`);
  await page.waitForFunction(
    () => !document.getElementById("front-continue").disabled,
  );
  await page.waitForTimeout(1200);
  seen.continue = await faceIn("#front-continue-bust");
  await shot("title-continue");
  await page.locator("#front-saves").click();
  await page.locator(".saves-row .mxbust .bust-stack").waitFor();
  seen.saved = await faceIn(".saves-row .mxbust");
  await shot("saved-games");
  console.log("Faces:", seen, "open ms:", ms);
  const own = seen.you;
  assert.ok(own, "You shows no face");
  for (const where of ["jobs", "history", "continue", "saved"])
    assert.equal(seen[where], own, `${where} shows a face other than You's`);
  if (seen.talk)
    assert.ok(
      people.includes(seen.talk) || seen.talk === own,
      "the talk box's face is not the speaker's People face",
    );
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS one face for the player on every screen");
} finally {
  await browser.close();
}
