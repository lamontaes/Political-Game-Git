/* global process, console, document, fetch, URL */
// The Elections page offers a new player their own offices first, with the day they can file,
// shows one seat of a district body and names a county's offices as the county's (owner, Nov 16,
// 0.111.1), on the bench (npm run bench): a new life at a named place (PLACE_KEY; McMinnville,
// Tennessee is 4745100, Bonanza, Oregon 4107300), the Elections page on the opening day (a
// 17-year-old), after the player is old enough, and with the filing window open. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium PLACE_KEY=4745100 node src/bench/elections-offers.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { finishTalk, startLife } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
const days = (process.env.RUN_TO ?? "2025-06-01,2026-06-25").split(",");
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(900000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
if (process.env.PLACE_KEY)
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("placeKey", process.env.PLACE_KEY);
    return route.continue({ url: url.toString() });
  });

const seen = [];
async function elections(tag) {
  await finishTalk(page);
  const close = page.locator("#sheet-close");
  if (await close.isVisible()) await close.click();
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator('#sheet-tabs [data-tab="campaigns"]').click();
  await page.locator("#sheet-body .roster-row").first().waitFor();
  const read = await page.evaluate(() => ({
    groups: [...document.querySelectorAll("#sheet-body .roster-group")].map(
      (g) => g.innerText.replace(/\s+/g, " ").trim(),
    ),
    rows: [...document.querySelectorAll("#sheet-body .roster-row")].map((e) =>
      e.innerText.replace(/\s+/g, " ").trim(),
    ),
  }));
  console.log(`-- ${tag}`);
  for (const row of read.rows) console.log(`   ${row}`);
  if (shots) await page.screenshot({ path: `${shots}/elections-${tag}.png` });
  // Open the first own office's race and the first other office's race, as a player clicks them,
  // and print what each page says about filing: the words the shipped refusals and dates take.
  const rows = page.locator("#sheet-body .roster-row[data-contest]");
  const count = await rows.count();
  for (const [which, index] of [
    ["own", 0],
    ["other", count - 1],
  ]) {
    await rows.nth(index).click();
    await page.locator("#sheet-body .roster-page").waitFor();
    await page.waitForTimeout(400);
    const text = await page.evaluate(() =>
      document
        .querySelector("#sheet-body .roster-page")
        .innerText.replace(/\s+/g, " "),
    );
    console.log(`   [${which} race page] ${text}`);
    if (shots)
      await page.screenshot({ path: `${shots}/race-${which}-${tag}.png` });
    seen.push(text);
  }
  return read;
}

try {
  const life = await startLife(page, { fresh: true });
  console.log("Place:", life.placeName, "Seed:", life.seed);
  const first = await elections("opening");
  const text = first.rows.join(" | ");
  assert.match(
    text,
    /Council member|Mayor|Selectboard|Select/i,
    "own offices listed",
  );
  const commissioners = first.rows.filter((r) => /Commissioner/.test(r));
  assert.ok(
    commissioners.length <= 1,
    `commissioner seats: ${commissioners.length}`,
  );
  for (const row of first.rows.filter((r) =>
    /Commissioner|Sheriff|clerk|Assessor/i.test(r),
  ))
    assert.match(row, /County office/, `${row}: labeled as the county's`);
  for (const day of days) {
    const reached = await page.evaluate(async (until) => {
      const date = (await (await fetch("/api/dev/state")).json()).date;
      const n = Math.round((Date.parse(until) - Date.parse(date)) / 864e5);
      if (n > 0)
        await fetch("/api/dev/run-until", {
          method: "POST",
          body: JSON.stringify({ days: n, cap: n + 1 }),
        });
      return (await (await fetch("/api/dev/state")).json()).date;
    }, day);
    // The page reads the day from the server on load, so it is reloaded and the life continued.
    const title = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/title",
    );
    await page.reload();
    await title;
    await page.locator("#front-continue").click();
    await page.waitForFunction(() =>
      document.getElementById("card-clock")?.textContent.trim(),
    );
    await elections(reached);
  }
  for (const want of (process.env.EXPECT ?? "").split("|").filter(Boolean))
    assert.ok(
      seen.some((t) => new RegExp(want).test(t)),
      `no race page said: ${want}`,
    );
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS the Elections page offers the player their own offices");
} catch (e) {
  console.error(String(e.stack ?? e).slice(0, 600));
  if (shots)
    await page.screenshot({ path: `${shots}/failed.png` }).catch(() => {});
  throw e;
} finally {
  await browser.close();
}
