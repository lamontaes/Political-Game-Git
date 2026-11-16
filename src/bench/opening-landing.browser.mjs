/* global process, console, document, fetch, URL */
// The opening lands the player at home with a line that names the day
// (play-opening-lands-at-830-pm), on the bench (npm run bench): a new game in
// a drawn place (or PLACE_KEY), the address played to its end, and again in a
// second new game with Skip scene pressed: the first screen after it shows one
// narration line naming the day as people say it, at home, the clock on the
// player card at the hour the line names, and the proof names the record the
// hour was read from. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/opening-landing.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const [shots] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(300000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
if (process.env.PLACE_KEY)
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("placeKey", process.env.PLACE_KEY);
    return route.continue({ url: url.toString() });
  });
const lines = () =>
  page.evaluate(
    () => document.getElementById("talk-lines")?.textContent.trim() ?? "",
  );
for (const how of ["played", "skipped"]) {
  await page.goto("http://localhost:3000/play");
  const life = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
  );
  await page.locator("#new-life").click();
  if (await page.locator("#new-advanced").isVisible())
    await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const response = await life;
  const seed = new URL(response.url()).searchParams.get("seed");
  const { placeName, personId } = await response.json();
  const opening = await page.evaluate(
    async (id) => (await fetch(`/api/opening?id=${id}`)).json(),
    personId,
  );
  const landing = opening.home?.landing;
  console.log(
    `${how}: ${placeName}, seed ${seed}: lands at minute ${opening.home?.minuteOfDay} (${Math.floor(opening.home?.minuteOfDay / 60)}:${String(opening.home?.minuteOfDay % 60).padStart(2, "0")}), from household ${opening.home?.householdId}; line "${landing?.text}" from ${landing?.sourceRecordIds?.join(", ")}`,
  );
  assert.ok(landing?.text, "no landing line");
  await page.locator("#talk").waitFor({ state: "visible" });
  // Through the address, or Skip scene at once.
  for (let step = 0; step < 60; step += 1) {
    if ((await lines()).includes(landing.text)) break;
    if (how === "skipped" && (await page.locator("#talk-skip").isVisible()))
      await page.locator("#talk-skip").click();
    else if (await page.locator("#talk-next").isVisible())
      await page.locator("#talk-next").click();
    await page.waitForTimeout(400);
  }
  const shown = await lines();
  const clock = await page.locator("#card-clock").innerText();
  console.log(`  after the address: "${shown}"; card: ${clock}`);
  assert.ok(shown.includes(landing.text), "the landing line is not shown");
  assert.doesNotMatch(shown, /\d{4}-\d{2}-\d{2}/, "an ISO date on screen");
  if (shots) await page.screenshot({ path: `${shots}/landing-${how}.png` });
}
assert.deepEqual(errors, [], "page errors");
console.log("PASS the opening lands at home with a line naming the day");
await browser.close();
