/* global process, URLSearchParams, console, document */
// News after months of play (npm run bench): a grown player in a place drawn
// from all 56 jumps the calendar to NEWS_DATE (default June 1, 2025), past
// every stop as a player would, then opens News. Every story an outlet
// printed is listed under that outlet as a headline and a first sentence;
// none is a record kind. Photographed at 1440x900 into NEWS_SHOTS. Run with
// NEWS_SEED to replay a place; BENCH_PORT picks the server. A player who
// follows no outlet hears no printed story (in each age band the share that
// follows a kind of outlet, the most engaged first: press.ts audienceOfKind),
// and one whose last story is no longer news by the date sees none either,
// so such a place is passed over by name and the next drawn, up to DRAWS.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { drawPlace } from "../../scripts/core2-year/place.ts";

const runSeed = process.env.NEWS_SEED ?? String(Date.now());
const DRAWS = 5;
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
  const passed = [];
  let place;
  for (let draw = 0; draw < DRAWS && !place; draw += 1) {
    const drawn = drawPlace(`${runSeed}:${draw}`, "printed-news");
    await newLifeAndJump(drawn, draw);
    // A player who follows no outlet hears no printed story: pass the place
    // over by name and draw the next.
    const life = await (await page.request.get(`${base}/api/title`)).json();
    const heard = await (
      await page.request.get(
        `${base}/api/news?${new URLSearchParams({ id: life.life.personId })}`,
      )
    ).json();
    // News lists what is still news on its date (play.mjs nightsNews; the
    // archive keeps the rest), so the case is a printed story the player
    // heard that is still fresh.
    const printed = heard.filter((row) => row.kind === "press.printed");
    if (printed.some((row) => row.fresh !== false)) place = drawn;
    else
      passed.push(
        `${drawn.name} (${drawn.key}, run seed ${runSeed}:${draw}): ${printed.length ? `the ${printed.length} printed stories the player heard were no longer news on ${target}` : `the player heard no printed story by ${target}, following no outlet`}`,
      );
  }
  if (!place)
    throw new Error(
      `No drawn player heard a printed story in ${DRAWS} draws: ${passed.join("; ")}`,
    );
  if (passed.length) console.log(`Passed over: ${passed.join("; ")}`);
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
  // The front page is read before another outlet's tab is opened: a home
  // outlet that has printed nothing yet has a tab of its own, and its page
  // has no lead story.
  const frontLead = await page
    .locator(".news-story.lead .news-text .intro")
    .count();
  const frontRecords = await page.locator(".paper-records").count();
  const frontBoard = await page.locator(".news-board").innerText();
  // Each outlet's own page: the second one photographed too.
  if (outlets.length > 1) {
    await page.locator(".news-board .tab").nth(1).click();
    const second = await read();
    console.log(JSON.stringify(second, null, 1));
    assert.doesNotMatch(
      await page.locator(".news-board").innerText(),
      /\bSeries\b|\bJurisdiction\b|Public record/,
    );
    if (shots) await page.screenshot({ path: `${shots}/news-outlet-2.png` });
  }
  for (const text of [...front.headlines, ...front.ledes, ...front.text])
    assert.doesNotMatch(text, /Press\.|press\.printed|[{}_]|\b[a-z]+:[a-z]/);
  assert.ok(front.headlines.length > 0, "News lists no story");
  // A front page: the lead story is printed with its text, and no record row
  // with a kind, series or jurisdiction label is on it (owner, Oct 27).
  assert.ok(frontLead > 0, "the lead story has no text");
  assert.equal(frontRecords, 0);
  assert.doesNotMatch(frontBoard, /\bSeries\b|\bJurisdiction\b|Public record/);
  assert.deepEqual(errors, []);
  console.log("PASS");
} finally {
  await browser.close();
}

/** A new life in the drawn place, the calendar jumped to the target date past every stop. */
async function newLifeAndJump(drawn, draw) {
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Reader",
    gender: "female",
    birthYear: 1985,
    birthMonth: 6,
    birthDay: 1,
  });
  const made = await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed: drawn.seed, placeKey: drawn.key, person })}`,
    { timeout: 600000 },
  );
  assert.equal(made.status(), 200);
  console.log(
    `Place: ${drawn.name} (${drawn.key}), run seed ${runSeed}:${draw}, place seed ${drawn.seed}`,
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
        // A resume carries the jump on to the next stop, as an advance does.
        const resumed = await page.request.post(
          `${base}/api/resume?${new URLSearchParams({ pauseId: stop.pauseId })}`,
          { timeout: 600000 },
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
}
