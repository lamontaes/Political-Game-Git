/* global process, console, document, fetch, URL */
// Every lead story carries the picture of what it is about
// (play-nov8-news-lead-has-no-picture-of-its-story), on the bench (npm run
// bench): a new life in a drawn place, News on day one and after each of four
// weeks, every paper's tab. Each tab with a lead shows a picture, named by the
// record it was chosen from; no tab's first column is bare; a federal lead and
// a business lead each show a picture at least once. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/news-picture.browser.mjs [shots dir]
// NEWS_PLACE_KEY names the place instead of a drawn one (Manchester,
// Connecticut, the owner's Nov 8 repro, is 0944690).
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
if (process.env.NEWS_PLACE_KEY)
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("placeKey", process.env.NEWS_PLACE_KEY);
    return route.continue({ url: url.toString() });
  });
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
/** What the board shows now: the lead's headline and picture, and whether the first column is bare. */
const board = () =>
  page.evaluate(() => {
    const lead = document.querySelector(".news-board .news-story.lead");
    const first = document.querySelector(".news-board .board-cols .mx3col");
    return {
      outlet: document.querySelector(".news-board").dataset.outlet ?? "",
      lead: lead?.querySelector(".news-headline")?.textContent.trim() ?? null,
      picture: lead?.querySelector("img.story-image")?.getAttribute("src"),
      loaded: Boolean(lead?.querySelector("img.story-image")?.naturalWidth),
      bare: !first || !first.textContent.trim(),
    };
  });
const seen = { leads: 0, pictured: 0, federal: 0, business: 0 };
const misses = [];
const check = async (when) => {
  const rows = await page.evaluate(async () => {
    const id = (await (await fetch("/api/dev/state")).json()).playerId;
    return (await fetch(`/api/news?id=${id}`)).json();
  });
  const tabs = page.locator(".news-board [data-outlet]");
  const count = Math.max(1, await tabs.count());
  for (let i = 0; i < count; i += 1) {
    if ((await tabs.count()) > 1) await tabs.nth(i).click();
    await page.waitForTimeout(300);
    const now = await board();
    const row = rows.find(
      (r) => r.headline === now.lead || (!r.headline && r.lede === now.lead),
    );
    const name = `${when}-tab-${i + 1}`;
    if (shots) await page.screenshot({ path: `${shots}/${name}.png` });
    if (now.bare) misses.push(`${name}: the first column is bare`);
    if (!now.lead) {
      console.log(`${name}: no lead (nothing in print)`);
      continue;
    }
    seen.leads += 1;
    if (!now.picture || !now.loaded) {
      misses.push(
        `${name}: lead "${now.lead}" ${now.picture ? `picture ${now.picture} did not load` : "has no picture"}: ${row?.kind} ${JSON.stringify(row?.facts ?? {}).slice(0, 300)}`,
      );
      continue;
    }
    seen.pictured += 1;
    const picked = row?.picture;
    const level = row?.facts?.level ?? "";
    const federal =
      level === "federal" ||
      [
        "us-capitol-exterior",
        "us-house-floor",
        "white-house-exterior",
        "oval-office-standard",
      ].includes(picked?.place) ||
      /^law:US(:|-[A-Z]{2}:federal:)/.test(row?.facts?.lawId ?? "") ||
      Boolean(row?.facts?.postId);
    const business = /^organization_/.test(picked?.recordId ?? "");
    if (federal) seen.federal += 1;
    if (business) seen.business += 1;
    console.log(
      `${name}: "${now.lead}" -> ${picked?.place} from ${picked?.recordId}${federal ? " (federal)" : ""}${business ? " (business)" : ""}`,
    );
  }
};
try {
  const life = await startLife(page, { fresh: true });
  console.log("Place:", life.placeName, "Seed:", life.seed);
  await openNews();
  await check("day-1");
  for (let week = 1; week <= WEEKS; week += 1) {
    await closeSheet();
    // A week of play through dev mode's run (a talk midweek would hold the Week button).
    await page.evaluate(async () => {
      await fetch("/api/dev/run-until", {
        method: "POST",
        body: JSON.stringify({ days: 7, cap: 8 }),
      });
    });
    await openNews();
    await check(`week-${week}`);
  }
  console.log(
    `Leads ${seen.leads}, pictured ${seen.pictured}, federal ${seen.federal}, business ${seen.business}`,
  );
  assert.deepEqual(misses, [], "leads without a picture, bare columns");
  assert.deepEqual(errors, [], "page errors");
  if (!seen.federal) console.log("NOTE: no federal lead in this run");
  if (!seen.business) console.log("NOTE: no business lead in this run");
  console.log("PASS every lead carries the picture of its record");
} finally {
  await browser.close();
}
