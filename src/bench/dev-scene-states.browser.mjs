/* global process, console, document, fetch, URL */
// Dev mode's Scenes panel says what it can do for every kind of scene
// (play-dev-scene-list-does-not-say-what-it-can-cause), on the bench (npm run
// bench): a new life in a drawn place (or PLACE_KEY), Dev mode on, the
// Calendar: every kind is under one of three headings (plays now, waits for a
// record, cannot be caused yet) in the numbers /api/dev/scenes gives; the
// kinds that cannot be caused cannot be picked; one waiting kind (SCENE, else
// the first) is started and its result line names the record and the days
// run, never "Begun for". Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/dev-scene-states.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(1800000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
if (process.env.PLACE_KEY)
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("placeKey", process.env.PLACE_KEY);
    return route.continue({ url: url.toString() });
  });
try {
  const life = await startLife(page, { fresh: true });
  console.log("Place:", life.placeName, "Seed:", life.seed);
  // Dev mode on, in Options (Escape).
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "On", exact: true }).last().click();
  await page.locator("#sheet-close").click();
  await page
    .locator('#rings [data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".dev-scene").waitFor();
  const scenes = await page.evaluate(async () =>
    (await fetch("/api/dev/scenes")).json(),
  );
  const shown = await page.evaluate(() =>
    Object.fromEntries(
      ["plays", "waits", "none"].map((state) => [
        state,
        [
          ...document.querySelectorAll(
            `.dev-scene [data-state="${state}"] button`,
          ),
        ].map((b) => ({ key: b.dataset.scene, disabled: b.disabled })),
      ]),
    ),
  );
  for (const state of ["plays", "waits", "none"]) {
    const want = scenes.filter((row) => row.state === state).length;
    console.log(
      `${state}: ${shown[state].length} shown, ${want} by the records`,
    );
    assert.equal(shown[state].length, want, `${state} count`);
  }
  assert.ok(
    shown.none.every((b) => b.disabled),
    "a kind that cannot be caused can be picked",
  );
  await page.locator(".dev-scene").scrollIntoViewIfNeeded();
  if (shots)
    await page.locator(".dev-scene").screenshot({ path: `${shots}/panel.png` });
  // One waiting kind, run until its cause record comes or the cap.
  const kind = process.env.SCENE ?? shown.waits.map((b) => b.key).sort()[0];
  await page.locator(`.dev-scene [data-scene="${kind}"]`).click();
  await page.locator('[data-testid="dev-scene"]').click();
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="dev-scene"]').disabled,
  );
  await page.waitForTimeout(500);
  const line = await page
    .locator(".dev-scene .status, .dev-scene [role=status]")
    .last()
    .innerText()
    .catch(async () =>
      page.evaluate(
        () => document.querySelector(".dev-scene").lastElementChild.textContent,
      ),
    );
  console.log(`${kind}: ${line}`);
  assert.doesNotMatch(line, /^Begun for/, "a waited-for kind says Begun for");
  assert.match(line, /\d+ days/, "the line names the days run");
  if (shots)
    await page
      .locator(".dev-scene")
      .screenshot({ path: `${shots}/result.png` });
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS the Scenes panel says what it can do for every kind");
} finally {
  await browser.close();
}
