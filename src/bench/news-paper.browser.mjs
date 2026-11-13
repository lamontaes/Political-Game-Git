/* global process, console, document, fetch, URL */
// News opens on the player's own paper and keeps one tab order
// (play-nov8-news-opens-on-a-different-paper-each-time), on the bench
// (npm run bench): a new life in a drawn place; News on day one and after
// each of four weeks run through dev mode: the same tab in front and the same order each
// time. Then another tab chosen, News closed and opened again: the chosen tab
// is still in front. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/news-paper.browser.mjs [shots dir]
// NEWS_PLACE_KEY names the place instead of a drawn one (Manchester, Connecticut, the
// owner's Nov 8 repro, is 0944690).
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
const WEEKS = 4;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(180000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const closeSheet = async () => {
  const close = page.locator("#sheet-close");
  if (await close.isVisible()) await close.click();
};
const openNews = async () => {
  await closeSheet();
  await page
    .locator('#rings [data-tab="news"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".news-board").waitFor();
  await page.waitForTimeout(500);
};
/** The tabs in order and the key of the outlet in front (the board names it). */
const tabs = () =>
  page.evaluate(() => ({
    order: [...document.querySelectorAll(".news-board [data-outlet]")].map(
      (t) => t.dataset.outlet,
    ),
    front: document.querySelector(".news-board").dataset.outlet,
  }));
if (process.env.NEWS_PLACE_KEY)
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("placeKey", process.env.NEWS_PLACE_KEY);
    return route.continue({ url: url.toString() });
  });
try {
  const life = await startLife(page, { fresh: true });
  console.log("Place:", life.placeName, "Seed:", life.seed);
  const opened = Date.now();
  await openNews();
  const first = await tabs();
  // The outlet in front: its record id and why it is the player's.
  const home = await page.evaluate(async () => {
    const id = (await (await fetch("/api/dev/state")).json()).playerId;
    return (await fetch(`/api/news/home?id=${id}`)).json();
  });
  const own = home.find((outlet) => outlet.id === first.front);
  console.log(
    `In front: ${first.front} (${own?.name ?? "no outlet of the town"}), ${own?.why ?? "no press of the town's own"}; News opened in ${Date.now() - opened - 500} ms`,
  );
  console.log(
    `Day one: front "${first.front}", tabs ${JSON.stringify(first.order)}`,
  );
  if (shots) await page.screenshot({ path: `${shots}/news-day-1.png` });
  for (let week = 1; week <= WEEKS; week += 1) {
    await closeSheet();
    // A week of play through dev mode's run (a talk midweek would hold the Week button).
    const date = await page.evaluate(async () => {
      await fetch("/api/dev/run-until", {
        method: "POST",
        body: JSON.stringify({ days: 7, cap: 8 }),
      });
      return (await (await fetch("/api/dev/state")).json()).date;
    });
    console.log(`Ran to ${date}`);
    await openNews();
    const now = await tabs();
    console.log(
      `Week ${week}: front "${now.front}", tabs ${JSON.stringify(now.order)}`,
    );
    if (shots)
      await page.screenshot({ path: `${shots}/news-week-${week}.png` });
    assert.equal(now.front, first.front, `week ${week}: the paper in front`);
    // Papers may join as new outlets print; those already there keep their order.
    const kept = now.order.filter((t) => first.order.includes(t));
    assert.deepEqual(
      kept,
      first.order.filter((t) => now.order.includes(t)),
      `week ${week}: the tab order`,
    );
  }
  // Another tab chosen is kept when News is closed and opened again.
  const all = page.locator(".news-board [data-outlet]");
  if ((await all.count()) > 1) {
    const other = all.nth(1);
    const name = await other.getAttribute("data-outlet");
    await other.click();
    await openNews();
    const again = await tabs();
    assert.equal(again.front, name, "the chosen tab kept");
    console.log(`Chose "${name}", closed and opened News: still in front`);
  } else console.log("One paper only: nothing else to choose");
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS News keeps its paper and its tabs");
} finally {
  await browser.close();
}
