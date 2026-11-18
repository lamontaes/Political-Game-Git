/* global process, console, document, fetch, URL */
// After the player files for a race, its line on the Elections page says they filed, not
// "File for it" (Blockers' walk at Launiupoko, Hawaii, Nov 17: the clerk said "All set. I've got
// you on the list", the line still said File for it and the race page offered no button). On a
// fresh bench (npm run bench): a new life at a drawn place (PLACE_KEY or BENCH_SEED pin one),
// dev mode's run-until a month at a time to the first day a race of the player's own is open for
// filing, the filing at the counter the way a player files, then the race's line. Fails if the
// line still offers filing or does not say the player filed, or on a page error. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/filed-race-row.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import controls from "./data/controls.json" with { type: "json" };
import { finishTalk, startLife } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
const words = controls.localRaces;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(900000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
for (const [env, param] of [
  ["PLACE_KEY", "placeKey"],
  ["BENCH_SEED", "seed"],
])
  if (process.env[env])
    await page.route("**/api/newlife*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set(param, process.env[env]);
      return route.continue({ url: url.toString() });
    });

/** Opens Politics → Elections and returns each line's contest id and words. */
async function electionRows() {
  await finishTalk(page);
  const close = page.locator("#sheet-close");
  if (await close.isVisible()) await close.click();
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator('#sheet-tabs [data-tab="campaigns"]').click();
  await page.locator("#sheet-body .roster-row").first().waitFor();
  return page.evaluate(() =>
    [...document.querySelectorAll("#sheet-body .roster-row[data-contest]")].map(
      (row) => ({
        contest: row.dataset.contest,
        text: row.innerText.replace(/\s+/g, " ").trim(),
      }),
    ),
  );
}

/** The page reads the day from the server on load: reload and continue the life. */
async function reloadLife() {
  const title = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/title",
  );
  await page.reload();
  await title;
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-clock")?.textContent.trim(),
  );
}

try {
  const life = await startLife(page, { fresh: true });
  console.log("Place:", life.placeName, "Seed:", life.seed);
  // A month at a time, at most three years, to a race of the player's own open for filing.
  let open = null;
  for (let month = 0; month < 36 && !open; month += 1) {
    open = await page.evaluate(async () => {
      const { races } = await (
        await fetch("/api/government/local-races")
      ).json();
      return (
        races.find(
          (r) =>
            r.bar !== "not-your-office" &&
            r.playerMayFile &&
            r.filingOpen &&
            r.filedWith,
        ) ?? null
      );
    });
    if (!open)
      await page.evaluate(() =>
        fetch("/api/dev/run-until", {
          method: "POST",
          body: JSON.stringify({ days: 30, cap: 31 }),
        }),
      );
  }
  assert.ok(open, "no race of the player's own opened for filing in 3 years");
  await reloadLife();
  const date = await page.evaluate(
    async () => (await (await fetch("/api/dev/state")).json()).date,
  );
  console.log("Filing open on", date, "for", open.title);
  const before = (await electionRows()).find(
    (r) => r.contest === open.contestId,
  );
  console.log("before:", before?.text);
  assert.ok(before?.text.includes(words.fileForIt), "the line offers filing");
  // File the way a player does: the line, File for it, then the counter's replies.
  await page
    .locator(`#sheet-body .roster-row[data-contest="${open.contestId}"]`)
    .click();
  await page.locator('[data-testid="file-for-it"]').click();
  for (let step = 0; step < 30; step += 1) {
    await page.waitForTimeout(700);
    if (!(await page.locator("#talk").isVisible())) break;
    const next = page.locator("#talk-next");
    const replies = page.locator("#talk-choices .reply");
    const texts = await replies.allInnerTexts();
    const file = texts.findIndex((t) => /\bfile\b/i.test(t));
    if (await next.isVisible()) await next.click();
    else if (texts.length) await replies.nth(Math.max(file, 0)).click();
    else if (await page.locator("#talk-leave").isVisible())
      await page.locator("#talk-leave").click();
    else break;
  }
  const after = (await electionRows()).find(
    (r) => r.contest === open.contestId,
  );
  console.log("after:", after?.text);
  if (shots) {
    // The race chosen, so the picture shows its line and its page together.
    await page.evaluate((contestId) => {
      const row = document.querySelector(
        `#sheet-body .roster-row[data-contest="${contestId}"]`,
      );
      row?.click();
      row?.scrollIntoView({ block: "nearest" });
    }, open.contestId);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${shots}/filed-race-row.png` });
  }
  assert.ok(
    !after?.text.includes(words.fileForIt),
    `the filed race's line still offers filing: ${after?.text}`,
  );
  assert.ok(
    after?.text.includes(words.youFiled),
    `the filed race's line does not say the player filed: ${after?.text}`,
  );
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS a filed race's line says the player filed");
} finally {
  await browser.close();
}
