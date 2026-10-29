/* global process, URLSearchParams, console, document, fetch */
// The campaign season in the bench (npm run bench): a grown player in a place
// drawn from all 56 files for the first race at least two months out, then
// plays week by week. Each scene that stops the day after filing is read and
// photographed at 1440x900 (SEASON_SHOTS), until SEASON_SCENES scenes. Run
// with SEASON_SEED to replay the place src/director/campaign-season.test.ts drew.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { drawPlace } from "../../scripts/core2-year/place.ts";

const runSeed = process.env.SEASON_SEED ?? String(Date.now());
const place = drawPlace(`${runSeed}:0`, "campaign-season");
const shots = process.env.SEASON_SHOTS;
const want = Number(process.env.SEASON_SCENES ?? 3);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Candidate",
    gender: "female",
    birthYear: 1985,
    birthMonth: 6,
    birthDay: 1,
  });
  const made = await page.request.post(
    `http://localhost:3000/api/newlife?${new URLSearchParams({ seed: place.seed, placeKey: place.key, person })}`,
    { timeout: 600000 },
  );
  assert.equal(made.status(), 200);
  console.log(
    `Place: ${place.name} (${place.key}), run seed ${runSeed}:0, place seed ${place.seed}`,
  );
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  const filed = await page.evaluate(async () => {
    const gov = await (await fetch("/api/government")).json();
    const soon = new Date(Date.parse("2025-01-20") + 60 * 86400000)
      .toISOString()
      .slice(0, 10);
    const contests = (gov.contests ?? [])
      .map((row) => row.contest)
      .filter((c) => c.electionDate >= soon)
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      );
    for (const contest of contests) {
      const r = await fetch(
        `/api/file?${new URLSearchParams({ contestId: contest.id })}`,
        { method: "POST" },
      );
      const body = await r.json().catch(() => ({}));
      if (
        r.ok &&
        ["petitioning", "on-ballot"].includes(body.filing?.status ?? "")
      )
        return contest.id;
    }
    return null;
  });
  console.log("Filed for:", filed);
  assert.ok(filed, "no race two months out the player could enter");
  await page.reload();
  await page
    .locator("#front-continue")
    .click()
    .catch(() => {});
  let taken = 0;
  for (let week = 0; week < 60 && taken < want; week += 1) {
    const talk = page.locator("#talk:not([hidden])");
    if (await talk.isVisible().catch(() => false)) {
      await page
        .locator("#talk-choices button")
        .first()
        .waitFor({ timeout: 15000 })
        .catch(() => {});
      const text = await page.locator("#talk").innerText();
      const when = await page
        .locator("#card-date, #card-place")
        .allInnerTexts();
      taken += 1;
      console.log(`SCENE ${taken} (${when.join(" · ")}):\n${text}\n`);
      if (shots)
        await page.screenshot({ path: `${shots}/season-scene-${taken}.png` });
      // Open the exchange (Talk), read and photograph it, then answer with
      // the first reply until the talk closes.
      for (let turn = 0; turn < 5; turn += 1) {
        const reply = page.locator("#talk-choices button").first();
        if (!(await reply.isVisible().catch(() => false))) break;
        await reply.click();
        await page.waitForTimeout(900);
        if (turn === 0) {
          console.log(
            `EXCHANGE ${taken}:\n${await page.locator("#talk").innerText()}\n`,
          );
          if (shots)
            await page.screenshot({
              path: `${shots}/season-scene-${taken}-talk.png`,
            });
        }
      }
      if (await talk.isVisible().catch(() => false))
        await page
          .locator("#talk-leave")
          .click()
          .catch(() => {});
      await page.waitForTimeout(700);
      continue;
    }
    const advanced = page
      .waitForResponse((r) => /\/api\/(advance|resume|play)\b/.test(r.url()), {
        timeout: 60000,
      })
      .catch(() => null);
    // A stop that is not a scene (the day's other business) is continued
    // past, as the player would; otherwise a week goes by.
    const resume = page.locator("#continue:not([hidden])");
    if (await resume.isVisible().catch(() => false)) await resume.click();
    else await page.locator("#week").click();
    if (!(await advanced)) {
      if (shots) await page.screenshot({ path: `${shots}/stuck-${week}.png` });
      throw new Error(`Week did not advance (week ${week})`);
    }
    await page.waitForTimeout(1000);
  }
  assert.ok(taken > 0, "no scene in sixty weeks");
  assert.deepEqual(errors, []);
  console.log("PASS");
} finally {
  await browser.close();
}
