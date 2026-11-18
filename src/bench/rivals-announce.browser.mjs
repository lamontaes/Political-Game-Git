/* global console, document, process, fetch */
// Other candidates announce before filing opens (owner, Nov 17: "Of course,
// other people should be able to do it early"; CTO line on #9995). On the
// bench (npm run bench) at 1440x900: a new life in a drawn place plays on, two
// weeks at a time, until a rival in one of the race page's races says they are
// running. The race's page then lists them under who's running, marked
// Announced. A life whose races see no announcement in 240 days is passed over
// by name, three lives at most (skill drawn-place-tests). Screenshots go to
// the first argument.
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/rivals-announce.browser.mjs [shots dir]
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
const shot = (name) =>
  shots ? page.screenshot({ path: `${shots}/${name}.png` }) : undefined;
const log = (line) =>
  console.log(`${new Date().toISOString().slice(11, 19)} ${line}`);
const races = () =>
  page.evaluate(
    async () =>
      (await (await fetch("/api/government/local-races")).json()).races,
  );
const announcedRival = (list) => {
  for (const race of list)
    for (const filer of race.filers)
      if (filer.announced && filer.name) return { race, filer };
  return null;
};

/** Politics, Elections, and the race's own page, as a player opens it. */
async function openRace(contestId) {
  await page.reload();
  await page
    .locator("#front-continue")
    .click()
    .catch(() => {});
  await page.waitForFunction(() =>
    document.getElementById("card-name")?.textContent.trim(),
  );
  const ring = page.locator('.ring[data-tab="politics"]');
  for (let tries = 0; !(await ring.isVisible()) && tries < 80; tries += 1)
    await finishTalk(page);
  await ring.click();
  await page.locator("#sheet:not([hidden])").waitFor({ timeout: 30000 });
  await page.locator('#sheet-tabs [data-tab="campaigns"]').click();
  await page.locator("#sheet-body .roster-row").first().waitFor();
  await page.locator(`.roster-row[data-contest="${contestId}"]`).click();
  await page.locator(`.roster-page[data-key="${contestId}"]`).waitFor();
}

const passedOver = [];
try {
  let found = null;
  let where = "";
  for (let draw = 0; draw < 3 && !found; draw += 1) {
    const life = await startLife(page, { fresh: true });
    where = `${life.placeName} (seed ${life.seed})`;
    log(`draw ${draw}: ${where}`);
    for (let day = 0; day <= 240; day += 14) {
      found = announcedRival(await races());
      if (found) break;
      await page.evaluate(async () =>
        fetch("/api/dev/run-until", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ days: 14, cap: 14 }),
        }),
      );
    }
    if (!found) passedOver.push(`${where}: no rival announced in 240 days`);
  }
  assert.ok(found, `No rival announced: ${passedOver.join("; ")}`);
  const { race, filer } = found;
  log(`${where}: ${filer.name} announced for ${race.title}`);
  await openRace(race.contestId);
  const card = page
    .locator(`.roster-page[data-key="${race.contestId}"] .candidate`)
    .filter({ hasText: filer.name });
  await card.first().waitFor();
  const text = await card.first().innerText();
  assert.match(text, /Announced/, `${where}: ${filer.name}'s card: ${text}`);
  await shot("race-page-rival-announced");
  assert.deepEqual(errors, [], `${where}: page errors`);
  log(
    `PASS ${where}: ${filer.name} shows as announced on ${race.title}'s page; passed over: ${passedOver.join("; ") || "none"}`,
  );
} finally {
  await browser.close();
}
