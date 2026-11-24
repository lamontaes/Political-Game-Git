/* global process, console, fetch, URL */
// Another state's changes and their roll calls (play-states-screen-opens-any-state),
// on the bench (npm run bench): a new life in a drawn place, 240 days run with
// dev mode, then Politics, Government, State, and two other states in turn:
// each chamber's Recent votes lists that state's changes with their counts; a
// row opens its roll call, whose yes and no lists add up to the row's count
// and show the same names when opened again. Then News, the Nation paper's
// lead story, "How they voted" opens the same kind of page. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/states.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { playOpening } from "./start-life.mjs";
import { devModeOn } from "./dev-setup.mjs";

const [shots] = process.argv.slice(2);
/** Days run before looking, and per dev-mode run (run lengths). */
const DAYS = 240;
/** The world named: Rock Cave, West Virginia, where the Nation paper has a lead that opens a roll call. */
const PLACE = "5469244";
const SEED = process.env.STATES_SEED ?? "rockcave-a";
const STEP = 60;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(180000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) =>
  shots ? page.screenshot({ path: `${shots}/${name}.png` }) : null;
const run = (days) =>
  page.evaluate(
    async (days) =>
      (
        await fetch("/api/dev/run-until", {
          method: "POST",
          body: JSON.stringify({ days, cap: days }),
        })
      ).json(),
    days,
  );
/** The counts a row says ("… · Yes 37, No 23"). */
const counts = (text) => {
  const [yes, no] = [...text.matchAll(/(\d+)/g)].map((m) => Number(m[1]));
  return { yes, no };
};
try {
  // A new life in the named world: the page loads first, then the new-life call is steered to
  // the place and seed (steering before the page loads stops the title from answering).
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
  const response = await made;
  assert.equal(response.status(), 200, await response.text());
  const body = await response.json();
  await playOpening(page, body.sceneMomentId ?? null);
  console.log("Place:", body.placeName, "Seed:", SEED);
  await devModeOn(page);
  for (let day = 0; day < DAYS; day += STEP) await run(STEP);
  const openGovernment = async () => {
    await page.keyboard.press("Escape");
    await page
      .locator('#rings [data-tab="politics"]')
      .first()
      .evaluate((e) => e.click());
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: "Government", exact: true })
      .click();
    await page.locator('[data-level="state"]').first().click();
    // The level redraws the screen; a state chosen before that is lost.
    await page.locator("select.government-state").waitFor();
    await page.waitForTimeout(1500);
  };
  await openGovernment();
  const options = await page
    .locator("select.government-state option")
    .evaluateAll((os) => os.map((o) => [o.value, o.textContent]));
  const others = options.filter(([value]) => value);
  let opened = 0;
  for (const [value, name] of others) {
    if (opened >= 2) break;
    await page.locator("select.government-state").selectOption(value);
    await page.waitForTimeout(1500);
    const rows = page.locator(".vote-rows .open-row");
    if (!(await rows.count())) continue;
    const rowText = await rows.first().innerText();
    const want = counts(rowText.split("·").pop());
    const start = Date.now();
    await rows.first().click();
    await page
      .getByText(/^Yes \(\d+\)/)
      .first()
      .waitFor();
    console.log(
      `${name}: ${rowText.replace(/\s+/g, " ")} (opened in ${Date.now() - start} ms)`,
    );
    const lines = (await page.locator("#sheet-body").innerText()).split("\n");
    const yesLine = lines.find((l) => /^Yes \(\d+\)/i.test(l.trim()));
    const noLine = lines.find((l) => /^No \(\d+\)/i.test(l.trim()));
    const got = {
      yes: Number(/\((\d+)\)/.exec(yesLine)[1]),
      no: Number(/\((\d+)\)/.exec(noLine)[1]),
    };
    assert.deepEqual(got, want, `${name}: the roll call adds up to its row`);
    const first = await page.locator("#sheet-body").innerText();
    if (opened === 0) await shot("roll-call");
    // The Government tab (it keeps the same state; no menu has a Back), and
    // opened again: the same names.
    const backToGovernment = async () => {
      await page
        .locator("#sheet-tabs")
        .getByRole("button", { name: "Government", exact: true })
        .click();
      await page.locator(".vote-rows .open-row").first().waitFor();
      await page.waitForTimeout(800);
    };
    await backToGovernment();
    if (opened === 0) await shot("state-recent-votes");
    await page.locator(".vote-rows .open-row").first().click();
    await page
      .getByText(/^Yes \(\d+\)/)
      .first()
      .waitFor();
    assert.equal(
      await page.locator("#sheet-body").innerText(),
      first,
      `${name}: the same roll call when opened again`,
    );
    await backToGovernment();
    opened += 1;
  }
  assert.equal(opened, 2, "two other states opened with a change each");
  // The news: the Nation paper's lead opens its roll call.
  await page.keyboard.press("Escape");
  await page
    .locator('#rings [data-tab="news"]')
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(800);
  const nation = page.locator('[data-outlet="nation"]');
  // The Nation heading tells the laws another state passed in the last two weeks that reach this
  // reader. At Rock Cave on seed rockcave-a day 240 is 2025-09-17, and Pennsylvania's groundwater law
  // takes effect on 2025-11-06, so 56 days on (2025-11-12) the Nation heading has its story. The whole
  // check measured 71 and 73 s on the bench (cloud container, Nov 15); no step waits on a draw or a scan.
  await page.keyboard.press("Escape");
  await run(56);
  await playOpening(page, null);
  await page
    .locator('#rings [data-tab="news"]')
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(800);
  assert.ok(await nation.count(), "the named world has a Nation paper");
  {
    await nation.first().click();
    const how = page.getByRole("button", { name: "How they voted" });
    await how.first().waitFor();
    await shot("news-nation");
    await how.first().click();
    await page
      .getByText(/^Yes \(\d+\)/)
      .first()
      .waitFor();
    await shot("news-roll-call");
    console.log("The Nation lead opened its roll call");
  }
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS another state's changes and roll calls");
} finally {
  await browser.close();
}
