/* global process, URLSearchParams, console, document */
// News after months of play (npm run bench): a grown player in a place drawn
// from all 56 jumps the calendar to NEWS_DATE (default June 1, 2025), past
// every stop as a player would, then opens News. Every story an outlet
// printed is listed under that outlet as a headline and a first sentence;
// none is a record kind. Photographed at 1440x900 into NEWS_SHOTS. Run with
// NEWS_SEED to replay a place; BENCH_PORT picks the server.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { drawPlace } from "../../scripts/core2-year/place.ts";

const runSeed = process.env.NEWS_SEED ?? String(Date.now());
const place = drawPlace(`${runSeed}:0`, "printed-news");
const target = process.env.NEWS_DATE ?? "2025-06-01";
const shots = process.env.NEWS_SHOTS;
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Reader",
    gender: "female",
    birthYear: 1985,
    birthMonth: 6,
    birthDay: 1,
  });
  const made = await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed: place.seed, placeKey: place.key, person })}`,
    { timeout: 600000 },
  );
  assert.equal(made.status(), 200);
  console.log(
    `Place: ${place.name} (${place.key}), run seed ${runSeed}:0, place seed ${place.seed}`,
  );
  // The calendar jump stops only for what needs the player; each stop is
  // continued past and the jump taken again, a choice left to the character.
  for (let step = 0; step < 200; step += 1) {
    const r = await page.request.post(
      `${base}/api/advance?${new URLSearchParams({ mode: "calendar", date: target })}`,
      { timeout: 600000 },
    );
    const body = await r.json().catch(() => ({}));
    // Already there: the jump has nowhere left to go.
    if (/can't go backward/.test(JSON.stringify(body))) break;
    if (!r.ok()) {
      // At the polls on election day: leave, as a player who isn't voting would.
      if (/polling place/.test(JSON.stringify(body))) {
        await page.request.post(`${base}/api/polling-place/leave`);
        continue;
      }
      throw new Error(`advance failed: ${JSON.stringify(body).slice(0, 300)}`);
    }
    const packet = body.packet;
    if (packet?.kind === "stop") {
      // Resume answers with the next packet, which may be another stop: each
      // is continued past, as a player presses Continue. The same stop coming
      // back (a held deadline) cannot be waived, so the run names it and fails.
      let stop = packet;
      for (let guard = 0; stop?.kind === "stop"; guard += 1) {
        const resumed = await page.request.post(
          `${base}/api/resume?${new URLSearchParams({ pauseId: stop.pauseId })}`,
        );
        const answer = await resumed.json().catch(() => ({}));
        const next = answer.packet;
        if (!resumed.ok() || guard > 200 || next?.pauseId === stop.pauseId)
          throw new Error(
            `a stop stays open after its resume: ${stop.stop?.modules?.[0]?.kind ?? "stop"} on ${stop.at?.date}, record ${stop.stop?.modules?.[0]?.recordId ?? "none"}`,
          );
        stop = next;
      }
      continue;
    }
    if (packet?.at?.date >= target || packet?.kind === "complete") break;
  }
  await page.reload();
  await page
    .locator("#front-continue")
    .click()
    .catch(() => {});
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    "Player:",
    await page.locator("#card-name").innerText(),
    "·",
    await page.locator("#card-clock").innerText(),
  );
  await page
    .locator('[data-tab="news"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".news-board").waitFor();
  await page.evaluate(() => document.fonts.ready);
  const outlets = await page.locator(".news-board .tab").allInnerTexts();
  console.log("Outlets:", outlets.join(" | "));
  const read = async () => ({
    masthead:
      (await page.locator(".news-masthead h2").allInnerTexts())[0] ?? "",
    headlines: await page.locator(".news-headline").allInnerTexts(),
    ledes: await page.locator(".news-text .intro").allInnerTexts(),
    text: await page.locator(".story-text").allInnerTexts(),
  });
  const front = await read();
  console.log(JSON.stringify(front, null, 1));
  if (shots) await page.screenshot({ path: `${shots}/news-front.png` });
  // Each outlet's own page: the second one photographed too.
  if (outlets.length > 1) {
    await page.locator(".news-board .tab").nth(1).click();
    const second = await read();
    console.log(JSON.stringify(second, null, 1));
    if (shots) await page.screenshot({ path: `${shots}/news-outlet-2.png` });
  }
  for (const text of [...front.headlines, ...front.ledes, ...front.text])
    assert.doesNotMatch(text, /Press\.|press\.printed|[{}_]|\b[a-z]+:[a-z]/);
  assert.ok(front.headlines.length > 0, "News lists no story");
  // A front page: the lead story is printed with its text, and no record row
  // with a kind, series or jurisdiction label is on it (owner, Oct 27).
  assert.ok(
    (await page.locator(".news-story.lead .news-text .intro").count()) > 0,
    "the lead story has no text",
  );
  assert.equal(await page.locator(".paper-records").count(), 0);
  assert.doesNotMatch(
    await page.locator(".news-board").innerText(),
    /\bSeries\b|\bJurisdiction\b|Public record/,
  );
  assert.deepEqual(errors, []);
  console.log("PASS");
} finally {
  await browser.close();
}
