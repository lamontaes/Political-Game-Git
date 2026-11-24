/* global process, URL, console, document, fetch */
// The governor's state budget (legislation, Nov 8): the player steps in as the governor, the day the budget
// is due holds them, the screen lists each line with a change, and sending it closes the panel.
// BENCH_SEED and BENCH_PLACEKEY replay a world; SHOTS_DIR saves the screen.
// Run against a fresh bench: node src/bench/bill-budget.browser.mjs
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
// A button seen a moment ago can be gone by the click (a scene moves on): a missed tap is
// not a failure, the loop looks again.
const tap = (id) =>
  page
    .locator(`#${id}`)
    .click({ timeout: 5000 })
    .catch(() => {});
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
  // A place can have no body to step in as (a seat of one executive); take a new draw and name it.
  let seed = "";
  let names = [];
  let at = -1;
  for (let attempt = 1; attempt <= 5 && at < 0; attempt += 1) {
    const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
    await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
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
    const placeName = (await (await built).json()).placeName ?? "";
    await page.locator("#front-pick:not([hidden])").waitFor();
    const ownState = placeName.split(",").pop().trim();
    const own = await page.evaluate(async (state) => {
      const holders = await (await fetch("/api/advanced/officeholders")).json();
      return holders.find(
        (h) => /governor/i.test(h.title) && h.government === state,
      )?.name;
    }, ownState);
    // The picker lists the first 200 holders; searching for the governor's name finds theirs.
    if (own && !process.env.BENCH_ROLE)
      await page.locator("#pick-search").fill(own);
    names = await page.locator("#pick-list button").allInnerTexts();
    at = process.env.BENCH_ROLE
      ? names.findIndex((t) => new RegExp(process.env.BENCH_ROLE, "i").test(t))
      : names.findIndex((t) => own && t.includes(own));
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
    } else if (await visible("talk-next")) await tap("talk-next");
    else if (await visible("talk-leave")) await tap("talk-leave");
    else if (await visible("continue")) await tap("continue");
    else if (!(await page.locator("#week").isDisabled())) break;
    await page.waitForTimeout(800);
  }
  // Play days until the evening before a floor day holds the player for a bill.
  let held = false;
  for (let day = 0; day < 400 && !held; day += 1) {
    if (await visible("desk")) {
      // The State of the State holds the governor first: give the address, then the days go on.
      const address = page.locator("#desk-items .action", {
        hasText: /^Give the address$/,
      });
      if (await address.count()) {
        await address.first().click();
        await page.waitForTimeout(1500);
        continue;
      }
      // A state of emergency waits for the governor's word: let it pass, and the days go on.
      const emergency = page.locator("#desk-items .action", {
        hasText: /^Let it pass$/,
      });
      if (await emergency.count()) {
        await emergency.first().click();
        await page.waitForTimeout(1500);
        continue;
      }
      // A bill on the governor's desk comes before the budget: read it, sign it, and the days go on.
      const back = page.getByRole("button", { name: /Back to the desk/ });
      if (await back.count()) {
        await back.first().click();
        await page.waitForTimeout(1000);
        continue;
      }
      const read = page
        .locator("#desk-items")
        .getByRole("button", { name: "Read the bill" });
      if (
        !/budget/i.test(await page.locator("#desk-items").innerText()) &&
        (await read.count())
      ) {
        await read.first().click();
        await page
          .locator(".stage-vote button", { hasText: /^Sign it$/ })
          .click();
        await page.waitForTimeout(1500);
        await page.getByRole("button", { name: /Back to the desk/ }).click();
        await page.waitForTimeout(1000);
        continue;
      }
      held = true;
      break;
    }
    // A colleague asks for your vote the evening before: refuse ("I can't vote for it"), the reply
    // that leaves the vote the player's own to cast; agreeing would choose the side asked for.
    const replies = page.locator("#talk-choices .reply");
    if ((await replies.count()) > 0 && (await replies.first().isVisible())) {
      const undecided = replies.filter({ hasText: /can.t vote|undecided/i });
      await (
        (await undecided.count()) ? undecided.first() : replies.first()
      ).click();
    } else if (await visible("talk-next")) await tap("talk-next");
    else if (await visible("talk-leave")) await tap("talk-leave");
    else if (await visible("continue")) await tap("continue");
    else if (!(await page.locator("#week").isDisabled()))
      await page.locator("#week").click();
    await page.waitForTimeout(1500);
  }
  if (!held)
    console.log(
      "stop held:",
      JSON.stringify(
        await page.evaluate(
          async () =>
            (await (await fetch("/api/title")).json())?.life?.packet?.stop,
        ),
      ).slice(0, 600),
    );
  if (!held)
    console.log(
      "orders api:",
      JSON.stringify(
        await page.evaluate(async () => {
          const r = await fetch("/api/orders");
          return { status: r.status, body: (await r.text()).slice(0, 300) };
        }),
      ),
    );
  if (!held) {
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/budget-none.png` });
    console.log(
      "no hold; page:",
      await page.evaluate(() => document.body.innerText.slice(0, 400)),
    );
  }
  assert.ok(held, "the state budget held the governor within 400 days");
  const bills = await page.locator("#desk-items").innerText();
  console.log("floor screen:", bills.slice(0, 400));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/budget.png` });
  assert.match(bills, /budget/i, "the screen is the state budget");
  // Change the first line, then send the budget.
  await page.locator("#desk-items select").first().selectOption({ index: 4 });
  await page.waitForTimeout(500);
  await page
    .locator("#desk-items .action", { hasText: /send the budget/i })
    .first()
    .click();
  await page.waitForTimeout(1500);
  assert.ok(
    !(await visible("desk")),
    "the panel closed once the budget was sent",
  );
  const waiting = await page.evaluate(
    async () => (await (await fetch("/api/orders")).json()).length,
  );
  assert.equal(waiting, 0, "nothing is waiting on the governor");
  console.log("budget sent; waiting:", waiting);
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: the governor was held for the state budget and sent it");
} finally {
  await browser.close();
}
