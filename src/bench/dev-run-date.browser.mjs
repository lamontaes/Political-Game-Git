/* global process, console, URL */
// After a dev panel runs days, every screen shows the new day (play-news-date-line-reads-the-start-date):
// a new life in Rock Cave, West Virginia (seed rockcave-a), Calendar, the dev panel's Run, then the card
// clock and the News date line both read the day the run reached. Run on the bench (npm run bench):
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/dev-run-date.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { playOpening } from "./start-life.mjs";
import { devModeOn } from "./dev-setup.mjs";

const PLACE = "5469244";
const SEED = "rockcave-a";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(180000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://localhost:3000/play");
  await page.locator("#new-life").waitFor();
  await page.route("**/api/newlife?*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("seed", SEED);
    url.searchParams.set("placeKey", PLACE);
    route.continue({ url: url.toString() });
  });
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  if (await page.locator("#new-advanced").isVisible())
    await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const body = await (await made).json();
  await playOpening(page, body.sceneMomentId ?? null);
  await devModeOn(page);
  await page
    .locator('[data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator('[data-testid="dev-run"]').waitFor();
  const done = page.waitForResponse(
    (r) => r.url().includes("/api/dev/run-until"),
    { timeout: 600000 },
  );
  await page.locator('[data-testid="dev-run"]').click();
  const out = await (await done).json();
  assert.notEqual(out.from, out.to, "the run moved the world");
  await page.waitForTimeout(1500);
  await page.locator("#sheet-close").click();
  // The day the run reached, in the clock's words ("Wednesday, February 19, 2025").
  const [year, month, day] = out.to.split("-").map(Number);
  const words = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    },
  );
  const clock = await page.locator("#card-clock").innerText();
  assert.ok(clock.includes(words), `the card clock reads ${words}: ${clock}`);
  await page
    .locator('#rings [data-tab="news"]')
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(1000);
  const news = await page.locator("#sheet-body").innerText();
  assert.ok(news.includes(words), `News dates its page ${words}`);
  assert.deepEqual(errors, [], "page errors");
  console.log(
    `PASS the card clock and News read ${words} after a dev run (${out.from} -> ${out.to})`,
  );
} finally {
  await browser.close();
}
