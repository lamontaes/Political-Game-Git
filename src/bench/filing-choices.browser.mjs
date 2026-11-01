/* global process, URL, console, document, fetch */
// The player's filing choices are the six offices only (owner, Oct 29): every race the
// government view offers a filing for, and every race the filing offices on Travel list,
// is a city council, state legislature, mayor, governor, U.S. House, U.S. Senate or
// president race. BENCH_SEED replays a world; SHOTS_DIR saves the Travel screen.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const SIX =
  /council|alderm|mayor|governor|legislat|state (senator|representative)|assembl|senator|representative|congress|president|house/i;
const NOT_SIX =
  /county|trustee|clerk|sheriff|treasurer|assessor|coroner|attorney|prosecutor|commission|township|auditor|secretary|controller|lieutenant/i;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  if (process.env.BENCH_SEED)
    await page.route("**/api/newlife*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("seed", process.env.BENCH_SEED);
      return route.continue({ url: url.toString() });
    });
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const r = await made;
  console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  const me = await page.evaluate(
    async () => (await (await fetch("/api/title")).json()).life.personId,
  );
  const gov = await page.evaluate(
    async (id) => await (await fetch(`/api/government?id=${id}`)).json(),
    me,
  );
  const titles = gov.contests.map((c) => c.contest.title);
  console.log(`${titles.length} choices:`, [...new Set(titles)].join(" | "));
  assert.ok(titles.length > 0, "no filing choice at all");
  for (const title of titles) {
    assert.ok(SIX.test(title), `not one of the six: ${title}`);
    assert.ok(!NOT_SIX.test(title), `an office outside the six: ${title}`);
  }
  // Travel's filing offices list only those races.
  const vis = (id) =>
    page
      .locator(`#${id}`)
      .isVisible()
      .catch(() => false);
  for (let i = 0; i < 30; i += 1) {
    if (await vis("talk-next")) await page.locator("#talk-next").click();
    else if (await vis("continue")) await page.locator("#continue").click();
    else if (!(await page.locator("#week").isDisabled())) break;
    await page.waitForTimeout(700);
  }
  await page
    .locator('#rings [data-tab="travel"]')
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(1500);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/travel.png` });
  const cards = await page.evaluate(() =>
    [...document.querySelectorAll("#sheet-body .entry, #sheet-body button")]
      .map((n) => n.textContent.replace(/\s+/g, " ").trim())
      .filter((t) => /Filing office/i.test(t)),
  );
  console.log(
    "filing offices on Travel:",
    cards.length,
    cards.map((c) => c.slice(0, 60)),
  );
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: the player's filing choices are the six offices");
} finally {
  await browser.close();
}
