/* global process, URL, console, document, Event */
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
    await page.locator("#front-pick:not([hidden])").waitFor();
    names = await page.locator("#pick-list button").allInnerTexts();
    at = names.findIndex((t) =>
      new RegExp(process.env.BENCH_ROLE ?? "governor", "i").test(t),
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
    else if (await visible("continue")) await page.locator("#continue").click();
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
    } else if (await visible("talk-next"))
      await page.locator("#talk-next").click();
    else if (await visible("talk-leave"))
      await page.locator("#talk-leave").click();
    else if (await visible("continue")) await page.locator("#continue").click();
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
