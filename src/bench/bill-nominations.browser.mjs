/* global process, URL, console, document, Event */
// The president's open cabinet posts (legislation, Nov 8): the player steps in as the president, the first
// morning holds them on the vacant cabinet posts, the screen lists each post with the people it could go to,
// and naming one closes that post. BENCH_SEED replays a world; SHOTS_DIR saves the screen.
// Run against a fresh bench: node src/bench/bill-nominations.browser.mjs
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
      new RegExp(process.env.BENCH_ROLE ?? "president", "i").test(t),
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
  for (let day = 0; day < 90 && !held; day += 1) {
    if (await visible("desk")) {
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
      "nominations api:",
      JSON.stringify(
        await page.evaluate(async () => {
          const r = await fetch("/api/nominations");
          return { status: r.status, body: (await r.text()).slice(0, 300) };
        }),
      ),
    );
  if (!held) {
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/nominations-none.png` });
    console.log(
      "no hold; page:",
      await page.evaluate(() => document.body.innerText.slice(0, 400)),
    );
  }
  assert.ok(held, "the open cabinet posts held the president within 90 days");
  const bills = await page.locator("#desk-items").innerText();
  console.log("floor screen:", bills.slice(0, 400));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/nominations.png` });
  assert.match(bills, /Secretary/, "the screen names a cabinet post");
  // Name someone to the first open post.
  const before = await page.locator("#desk-items .plate").count();
  await page.locator("#desk-items .action").first().click();
  await page.waitForTimeout(1500);
  const left = await page.evaluate(async () =>
    (await (await fetch("/api/nominations")).json()).map((p) => p.post),
  );
  console.log(
    "posts open after the first nomination:",
    left.length,
    "of",
    before,
  );
  assert.ok(left.length < before, "the nominated post is no longer open");
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "ok: the president was held on the open cabinet posts and named one",
  );
} finally {
  await browser.close();
}
