/* global process, console, fetch, URL */
// Run now, file on the date (owner, Nov 17, after playing v0.113.0: "From day
// one the player can announce for a coming race, form a campaign committee,
// raise money and gather petition signatures. The official filing happens in
// the real window"; and every race whose filing hasn't opened gets a "sim to
// [filing date]" button, "so I don't have to figure out the filing thing").
// On the bench (npm run bench): a new life in a drawn place opens Politics,
// Elections on day one, picks its own race, announces, sees its campaign,
// then presses Sim to the filing date until the race takes the filing, and
// opens the counter with File for it. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/announce-run.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { finishTalk, startLife } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
// BENCH_SEED and PLACE_KEY replay one life, only to reproduce a failure.
if (process.env.BENCH_SEED || process.env.PLACE_KEY)
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    if (process.env.BENCH_SEED)
      url.searchParams.set("seed", process.env.BENCH_SEED);
    if (process.env.PLACE_KEY)
      url.searchParams.set("placeKey", process.env.PLACE_KEY);
    return route.continue({ url: url.toString() });
  });
// The page's requests in flight, so a press is read only once its answer and
// whatever the page asked for after it (a scene, the room) have landed.
const open = new Set();
page.on("request", (request) => open.add(request));
for (const done of ["requestfinished", "requestfailed"])
  page.on(done, (request) => open.delete(request));
async function settled() {
  for (let quiet = 0; quiet < 4;) {
    await page.waitForTimeout(250);
    quiet = open.size ? 0 : quiet + 1;
  }
}
const shot = (name) =>
  shots ? page.screenshot({ path: `${shots}/${name}.png` }) : undefined;

/** The scenes played on the way, counted for the log. */
let scenes = 0;

/** Politics, Elections, and the race's own page. */
async function openRace(contestId) {
  const close = page.locator("#sheet-close");
  if (await close.isVisible()) await close.click();
  const ring = page.locator('.ring[data-tab="politics"]');
  // A scene still on screen (a talk that goes on after its last line) is
  // played out before the menu, as a player does.
  // A jump goes on after each scene it stopped on, so one press can meet
  // several scenes before the menu is back.
  for (let tries = 0; !(await ring.isVisible()) && tries < 80; tries += 1) {
    if (tries < 3) await shot(`scene-on-the-way-${scenes + 1}`);
    scenes += 1;
    await finishTalk(page);
    await settled();
  }
  await ring.click();
  await page
    .locator("#sheet:not([hidden])")
    .waitFor({ timeout: 30000 })
    .catch(async (error) => {
      await shot("stuck");
      throw error;
    });
  await page.locator('#sheet-tabs [data-tab="campaigns"]').click();
  await page.locator("#sheet-body .roster-row").first().waitFor();
  if (!contestId) return;
  await page.locator(`.roster-row[data-contest="${contestId}"]`).click();
  await page.locator(`.roster-page[data-key="${contestId}"]`).waitFor();
}

try {
  const life = await startLife(page, { fresh: true });
  const where = `${life.placeName} (seed ${life.seed})`;
  const ballot = await page.evaluate(async () =>
    (await fetch("/api/government/local-races")).json(),
  );
  const race = ballot.races.find((r) => r.mayAnnounce);
  assert.ok(
    race,
    `${where}: no race to announce for on day one: ${ballot.races
      .map((r) => `${r.title} ${r.bar}`)
      .join("; ")}`,
  );
  console.log(
    `${where}: ${race.title}, filing opens ${race.filingOpens}, election ${race.electionDate}`,
  );
  await openRace(race.contestId);
  await shot("1-race-page-day-one");
  assert.ok(
    await page.locator('[data-testid="announce"]').isVisible(),
    `${where}: no Announce on ${race.title}`,
  );
  assert.ok(
    await page.locator('[data-testid="sim-to-filing"]').isVisible(),
    `${where}: no Sim to the filing date on ${race.title}`,
  );

  // Announce: the campaign opens on the Campaign tab.
  await page.locator('[data-testid="announce"]').click();
  await page.locator('#sheet-tabs [data-tab="campaign"]').waitFor();
  await page.waitForTimeout(500);
  await shot("2-campaign-after-announcing");
  const announced = await page.evaluate(async () =>
    (await fetch("/api/government/local-races")).json(),
  );
  const after = announced.races.find((r) => r.contestId === race.contestId);
  assert.equal(after.announced, true, `${where}: not announced`);
  await openRace(race.contestId);
  await shot("3-race-page-announced");

  // Sim to the filing date, as many presses as the stops on the way take.
  let presses = 0;
  for (; presses < 40; presses += 1) {
    const now = await page.evaluate(async (id) => {
      const body = await (await fetch("/api/government/local-races")).json();
      return body.races.find((r) => r.contestId === id) ?? null;
    }, race.contestId);
    if (now?.filingOpen) break;
    const sim = page.locator('[data-testid="sim-to-filing"]');
    assert.ok(await sim.isVisible(), `${where}: no Sim to button`);
    const advanced = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/advance",
    );
    await sim.click();
    await advanced;
    await settled();
    // What stopped the run on the way is lived first, as a player does.
    if (await page.locator("#talk:not([hidden])").isVisible()) {
      await shot(`sim-stop-${presses + 1}`);
      await finishTalk(page);
      await settled();
    }
    await openRace(race.contestId);
  }
  console.log(
    `${where}: reached filing in ${presses} press(es) of Sim to, ${scenes} scene(s) played on the way`,
  );
  await openRace(race.contestId);
  await shot("4-race-page-filing-open");
  assert.ok(
    await page.locator('[data-testid="file-for-it"]').isVisible(),
    `${where}: no File for it once filing opened`,
  );
  await page.locator('[data-testid="file-for-it"]').click();
  await page.locator("#talk:not([hidden])").waitFor();
  await page.waitForTimeout(1000);
  await shot("5-counter");
  assert.deepEqual(errors, [], `${where}: page errors`);
  console.log(`PASS ${where}`);
} finally {
  await browser.close();
}
