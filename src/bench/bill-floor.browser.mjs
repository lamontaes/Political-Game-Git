/* global process, URL, console, document, fetch */
// The floor-vote stop at the state legislature (legislation, Nov 8): the player advances days until
// the evening before a floor day holds them for a bill on their chamber's agenda, votes on the floor screen,
// and the hold clears. (Adapted from bill-state.browser.mjs.) The older note: the bill at the state legislature (legislation mocks, Nov 8): dev mode introduces a bill in a
// state chamber and passes it at a margin; the Bills tab lists it and its paper shows the result by
// name. (Adapted from bill-stage.browser.mjs, whose head drafts a bill from Your office instead.) The
// old note follows: a member drafts a bill, the dev route holds its
// floor vote, and the bill's paper then shows the floor result by name: each chamber's yes and no,
// every name that has a card opening it.
// Builds a world with the Advanced start (a place drawn from the seed) and steps in as a
// member of a body. BENCH_SEED replays a world; SHOTS_DIR saves the screens.
// Run against a fresh bench: node src/bench/meeting.browser.mjs
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const visible = (id) =>
  page
    .locator(`#${id}`)
    .isVisible()
    .catch(() => false);
try {
  if (process.env.BENCH_SEED || process.env.BENCH_PLACEKEY)
    await page.route("**/api/newlife*", (route) => {
      const url = new URL(route.request().url());
      if (process.env.BENCH_SEED)
        url.searchParams.set("seed", process.env.BENCH_SEED);
      // A place named by its key (Westway, Texas, 4878016): the state sits January to June.
      if (process.env.BENCH_PLACEKEY)
        url.searchParams.set("placeKey", process.env.BENCH_PLACEKEY);
      return route.continue({ url: url.toString() });
    });
  // A draw can give a place whose bodies hold no floor day on a bill within 90 days (a legislature out
  // of session, an agenda not yet set): the check takes a fresh draw, up to five, and still asserts the hold.
  let seed = "";
  let names = [];
  let at = -1;
  let held = false;
  for (let drawn = 1; drawn <= 5 && !held; drawn += 1) {
    // A place can have no body to step in as (a seat of one executive); take a new draw and name it.
    seed = "";
    names = [];
    at = -1;
    for (let attempt = 1; attempt <= 5 && at < 0; attempt += 1) {
      const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
      await page.goto(
        `http://localhost:${process.env.BENCH_PORT ?? 3000}/play`,
      );
      await ready;
      await page.locator("#new-life").click();
      const built = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/api/newlife",
        { timeout: 600000 },
      );
      await page.locator("#new-advanced").click();
      await page.locator("#front-advanced:not([hidden])").waitFor();
      await page.locator("#advanced-build").click();
      seed = new URL((await built).url()).searchParams.get("seed");
      await page.locator("#front-pick:not([hidden])").waitFor();
      names = await page.locator("#pick-list button").allInnerTexts();
      at = names.findIndex((t) =>
        new RegExp(
          process.env.BENCH_ROLE ??
            "state (senator|representative)|assembl|delegate",
          "i",
        ).test(t),
      );
      if (at < 0)
        console.log(
          `unusable draw ${attempt}: seed ${seed}, no member of a body`,
        );
    }
    assert.ok(at >= 0, "no member of a body to step in as in five draws");
    await page.locator("#pick-list button").nth(at).click();
    await page.locator("#pick-play").click();
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    console.log(
      "Seed:",
      seed,
      "Place:",
      await page.locator("#card-place").innerText(),
      "Player:",
      names[at],
    );
    for (let i = 0; i < 20; i += 1) {
      // A colleague asks for your vote the evening before: refuse ("I can't vote for it"), the reply
      // that leaves the vote the player's own to cast; agreeing would choose the side asked for.
      const replies = page.locator("#talk-choices .reply");
      if ((await replies.count()) > 0 && (await replies.first().isVisible())) {
        const undecided = replies.filter({ hasText: /can.t vote|undecided/i });
        await (
          (await undecided.count()) ? undecided.first() : replies.first()
        ).click();
      } else if (await visible("talk-next"))
        await page.locator("#talk-next").click();
      else if (await visible("talk-leave"))
        await page.locator("#talk-leave").click();
      else if (await visible("continue"))
        await page.locator("#continue").click();
      else if (!(await page.locator("#week").isDisabled())) break;
      await page.waitForTimeout(800);
    }
    // Play days until the evening before a floor day holds the player for a bill.
    held = false;
    for (let day = 0; day < 90 && !held; day += 1) {
      if (await visible("desk")) {
        // The desk also holds the player's committee on a hearing day (Hold the hearing, Let the
        // day pass): that is not the floor. Only a Yes/No on a bill is the floor stop.
        const offered = await page.locator("#desk-items").innerText();
        if (/\bYes\b/.test(offered)) {
          held = true;
          break;
        }
        const pass = page
          .locator("#desk-items")
          .getByRole("button", { name: /Let the day pass/ });
        if (await pass.count()) await pass.first().click();
      }
      // A colleague asks for your vote the evening before: refuse ("I can't vote for it"), the reply
      // that leaves the vote the player's own to cast; agreeing would choose the side asked for.
      const replies = page.locator("#talk-choices .reply");
      if ((await replies.count()) > 0 && (await replies.first().isVisible())) {
        const undecided = replies.filter({ hasText: /can.t vote|undecided/i });
        await (
          (await undecided.count()) ? undecided.first() : replies.first()
        ).click();
      } else if (await visible("talk-next"))
        await page.locator("#talk-next").click();
      else if (await visible("talk-leave"))
        await page.locator("#talk-leave").click();
      else if (await visible("continue"))
        await page.locator("#continue").click();
      else if (!(await page.locator("#week").isDisabled()))
        await page.locator("#week").click();
      await page.waitForTimeout(1500);
    }
    if (!held) {
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/floor-none.png` });
      console.log(
        "no hold; page:",
        await page.evaluate(() => document.body.innerText.slice(0, 400)),
      );
    }
    if (!held)
      console.log(`draw ${drawn} (seed ${seed}): no floor day held the player`);
  }
  assert.ok(held, "a floor day held the player for a bill within 90 days");
  const bills = await page.locator("#desk-items").innerText();
  console.log("floor screen:", bills.slice(0, 400));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/floor-stop.png` });
  assert.match(bills, /Yes/, "the floor screen offers Yes");
  assert.match(bills, /No/, "the floor screen offers No");
  // The player's own vote: No.
  await page
    .locator("#desk-items")
    .getByRole("button", { name: "No", exact: true })
    .first()
    .click();
  await page.waitForTimeout(1500);
  const after = await page
    .locator("#desk-items")
    .innerText()
    .catch(() => "");
  console.log("after the vote:", after.slice(0, 200));
  // The vote is cast: the bill that was held is no longer on the floor list.
  const first = bills.split("\n").find((line) => line.trim());
  const still = await page.evaluate(async () =>
    (await (await fetch("/api/floor")).json()).map((b) => b.title ?? b.name),
  );
  console.log("still held after the vote:", JSON.stringify(still));
  assert.ok(!still.includes(first), "the voted bill is off the floor list");
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: the state floor day held the player and they voted No");
} finally {
  await browser.close();
}
