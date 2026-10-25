/* global process, URL, console, document */
// The ballot pager on election day (play-stop-21-ballot-stuck-on-first-page):
// Continue turns the ballot's pages to the player's own race; marking it
// records the vote. Honest UI drive on the bench: creator, party join,
// filing, calendar skip to election day, page the ballot.
// Run: BENCH_PORT=3001 BENCH_BROWSER=<chromium> node src/bench/polling.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
const PORT = process.env.BENCH_PORT ?? "3000";
const BASE = `http://localhost:${PORT}`;
const browser = await chromium.launch({
  executablePath:
    process.env.BENCH_BROWSER ??
    "/Users/lamontae/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let filedContest = "";
page.on("response", async (r) => {
  if (new URL(r.url()).pathname === "/api/filing/choose") {
    try {
      const j = await r.json();
      console.log(
        "CHOOSE RESULT:",
        JSON.stringify(j.result ?? null).slice(0, 300),
      );
      if (j.result?.status === "on-ballot")
        filedContest = j.result.filing.contestId;
    } catch {
      // Non-JSON filing response; the UI state below is the evidence.
    }
  }
});
const draws = [];
try {
  // A life with a parties module (tiny towns have none): redraw, all draws logged.
  let seed = "";
  let place = "";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const titled = page.waitForResponse((r) => r.url().endsWith("/api/title"));
    await page.goto(`${BASE}/play`);
    await titled;
    await page.locator("#new-life").click();
    await page.locator("#new-start").click();
    await page.locator('[data-testid="gender-male"]').click();
    await page.locator("#cr-given").fill("Test");
    await page.locator("#cr-family").fill("Voter");
    await page.locator("#cr-month").selectOption({ index: 1 });
    await page.locator("#cr-day").selectOption({ index: 1 });
    await page.waitForFunction(
      () => document.getElementById("cr-year").options.length > 1,
    );
    const years = await page.locator("#cr-year option").allInnerTexts();
    const grown =
      years.find((y) => Number(y) <= 1996) ?? years[years.length - 1];
    await page.locator("#cr-year").selectOption({ label: grown });
    await page.locator("#cr-character-next").click();
    await page.locator("#cr-states .item").first().waitFor();
    await page.evaluate(() => {
      const items = [...document.querySelectorAll("#cr-states .item")];
      items[Math.floor(Math.random() * items.length)].click();
    });
    await page.locator("#cr-towns .item").first().waitFor();
    await page.evaluate(() => {
      const items = [...document.querySelectorAll("#cr-towns .item")];
      items[Math.floor(Math.random() * items.length)].click();
    });
    const made = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 600000 },
    );
    await page.locator("#cr-begin").click();
    seed = new URL((await made).url()).searchParams.get("seed");
    await page
      .locator("#opening-box:not([hidden])")
      .waitFor({ timeout: 300000 });
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Skip opening", exact: true })
      .click();
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    place = await page.locator("#card-place").innerText();
    draws.push(`${place} (seed ${seed})`);
    console.log("Draw", attempt + 1, ":", place, seed);
    await page
      .locator('[data-tab="politics"]')
      .first()
      .evaluate((e) => e.click());
    await page
      .locator("#sheet-body")
      .waitFor({ timeout: 20000 })
      .catch(() => {});
    for (let w = 0; w < 10; w += 1) {
      await page.evaluate(() => {
        document.getElementById("sheet-body")?.scrollTo(0, 999999);
      });
      await page.waitForTimeout(1500);
      if (
        await page.locator("#sheet-body button", { hasText: /join/i }).count()
      )
        break;
    }
    if (await page.locator("#sheet-body button", { hasText: /join/i }).count())
      break;
    seed = "";
    place = "";
  }
  assert.ok(place, "no drawn town had a parties module in 6 draws");
  console.log("Draws:", draws.join(" | "));
  // The joinable parties, through the UI.
  const joinLabels = await page
    .locator("#sheet-body button", { hasText: /join/i })
    .evaluateAll((els) => els.map((e) => e.textContent.trim()));
  console.log("Parties:", joinLabels.join(" | "));
  assert.ok(joinLabels.length, "no joinable party");
  let filed = "";
  for (const joinLabel of joinLabels) {
    if (filed) break;
    await page
      .locator('[data-tab="politics"]')
      .first()
      .evaluate((e) => e.click());
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.getElementById("sheet-body")?.scrollTo(0, 999999);
    });
    await page.waitForTimeout(500);
    const jb = page.locator("#sheet-body button", { hasText: joinLabel });
    if (await jb.count()) {
      await jb.first().click();
      await page.waitForTimeout(2000);
      console.log("Joined:", joinLabel);
    }
    // File for a 2026 race first, a council seat if one is open.
    await page
      .locator('[data-tab="travel"]')
      .first()
      .evaluate((e) => e.click());
    const visited = new Set();
    for (let round = 0; round < 12 && !filed; round += 1) {
      await page
        .locator('[data-tab="travel"]')
        .first()
        .evaluate((e) => e.click());
      await page.waitForTimeout(1000);
      if (!(await page.locator("#sheet:not([hidden])").count())) continue;
      const labels = await page
        .locator("#sheet-body button", { hasText: /Go/ })
        .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))
        .catch(() => []);
      console.log("Travel round", round, "destinations:", labels.length);
      const label = labels.find((l) => !visited.has(l));
      if (!label) break;
      visited.add(label);
      await page
        .locator(`#sheet-body button[aria-label="${label}"]`)
        .evaluate((e) => e.click());
      const talked = await page
        .locator("#talk:not([hidden])")
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (!talked) continue;
      await page
        .locator("#talk-choices button")
        .first()
        .waitFor({ timeout: 10000 })
        .catch(() => {});
      for (let r = 0; r < 6 && !filed; r += 1) {
        const choices = page.locator("#talk-choices button");
        const n = await choices.count();
        if (!n) {
          await page.waitForTimeout(1500);
          continue;
        }
        const texts = [];
        for (let c = 0; c < n; c += 1)
          texts.push(await choices.nth(c).innerText());
        if (!texts.some((t) => /20\d\d/i.test(t))) {
          console.log("No dated race here, moving on");
          await page
            .locator("#talk-leave")
            .click()
            .catch(() => {});
          continue;
        }
        const order = [...Array(n).keys()].sort((a, b) => {
          const rank = (t) =>
            /council.*2025/i.test(t)
              ? 0
              : /council/i.test(t)
                ? 1
                : /mayor.*2025/i.test(t)
                  ? 2
                  : /mayor/i.test(t)
                    ? 3
                    : /2025/i.test(t)
                      ? 4
                      : /I want to run for/i.test(t)
                        ? 5
                        : 6;
          return rank(texts[a]) - rank(texts[b]);
        });
        let acted = false;
        for (const c of order) {
          if (!/I want to run for/i.test(texts[c])) continue;
          console.log("Filing as:", texts[c]);
          await page
            .locator("#talk-choices button", { hasText: texts[c] })
            .first()
            .click();
          await page.waitForTimeout(2000);
          console.log(
            "Overlay open:",
            await page.locator("#filing-overlay:not([hidden])").count(),
            "choices:",
            await page
              .locator("#talk-choices button")
              .allInnerTexts()
              .catch(() => []),
          );
          if (await page.locator("#filing-overlay:not([hidden])").count()) {
            await page
              .locator("#filing-party option")
              .nth(1)
              .waitFor({ timeout: 10000 })
              .catch(() => {});
            if ((await page.locator("#filing-party option").count()) > 1)
              await page.locator("#filing-party").selectOption({ index: 1 });
            const confirm = page.locator("#talk-choices button", {
              hasText: /file for this office/i,
            });
            if (await confirm.count()) {
              await confirm.first().click();
              await page.waitForTimeout(2000);
            }
          }
          acted = true;
          break;
        }
        if (acted) break;
        await choices.first().click();
        await page.waitForTimeout(1500);
      }
      const lines = await page
        .locator("#talk-lines")
        .innerText()
        .catch(() => "");
      if (/filed|thank you|congratulations|on the ballot/i.test(lines))
        filed = lines.slice(-120);
      if (filedContest) filed = `on-ballot ${filedContest}`;
      await page
        .locator("#talk-leave")
        .click()
        .catch(() => {});
    }
  }
  assert.ok(filed, "could not file for a seat through the UI");
  console.log("PASS filed:", filed);
  // The target election comes from the filed contest, not a fixed date.
  const targetDate = filedContest.split(":").pop();
  const [ty, tm, td] = targetDate.split("-").map(Number);
  const targetMonth = new Date(ty, tm - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const targetClock = new Date(ty, tm - 1, td).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  console.log("Target election:", targetDate, targetMonth, targetClock);
  // Run the clock to election day with the calendar's skip-forward.
  await page
    .locator('[data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  await page
    .locator(".calendar-heading h3")
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  for (let m = 0; m < 30; m += 1) {
    const heading = await page
      .locator(".calendar-heading h3")
      .innerText()
      .catch(() => "?");
    if (heading.includes(targetMonth)) break;
    await page.getByRole("button", { name: "Next month", exact: true }).click();
    await page.waitForTimeout(600);
  }
  console.log(
    "Calendar:",
    await page
      .locator(".calendar-heading h3")
      .innerText()
      .catch(() => "?"),
  );
  await page
    .locator(".month .day")
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  const day3 = page.locator(`.month button.day[data-date="${targetDate}"]`);
  assert.ok(await day3.count(), "no target day in view");
  await day3.first().click();
  await page.waitForTimeout(1000);
  console.log(
    "Clock:",
    await page
      .locator("#card-clock")
      .innerText()
      .catch(() => "?"),
  );
  await page.screenshot({
    path: "docs/reports/ballot-pages-2026-10-24/calendar-nov.png",
  });
  // Run time forward with the skip control; answer stops until the ballot shows.
  const skip = page.locator(".calendar-details .skip-forward");
  console.log("Skip-forward present:", await skip.count());
  if (await skip.count()) {
    await skip.first().click();
    await page.waitForTimeout(3000);
  }
  for (let leg = 0; leg < 48; leg += 1) {
    if (await page.locator("#ballot:not([hidden])").count()) {
      const clock = await page
        .locator("#card-clock")
        .innerText()
        .catch(() => "?");
      if (clock.includes(String(ty))) break;
      // An earlier election's ballot: leave it honestly and keep skipping.
      console.log("Earlier ballot at", clock, "— leaving it");
      await page.locator("#ballot-leave").click();
      await page.waitForTimeout(2000);
    }
    if (
      (
        await page
          .locator("#card-clock")
          .innerText()
          .catch(() => "?")
      ).includes(targetClock)
    )
      break;
    // Answer whatever stop is open.
    const talk = page.locator(
      "#talk:not([hidden]) #talk-choices button:visible",
    );
    if (await talk.count()) {
      console.log(
        "Stop: talk,",
        (
          await talk
            .first()
            .innerText()
            .catch(() => "?")
        ).slice(0, 60),
      );
      await talk.first().click();
      await page.waitForTimeout(2000);
    } else if (await page.locator("#talk:not([hidden])").count()) {
      console.log(
        "Stop: choiceless talk:",
        (
          (await page
            .locator("#talk-lines")
            .innerText()
            .catch(() => "?")) ?? ""
        ).slice(-160),
      );
      await page.screenshot({
        path: "docs/reports/ballot-pages-2026-10-24/stop.png",
      });
      const left = page.locator("#talk-leave:visible");
      if (await left.count()) await left.click().catch(() => {});
      else
        await page
          .locator("#talk-silent:visible")
          .click()
          .catch(() => {});
      await page.waitForTimeout(2000);
    } else if (await page.locator("#continue:not([hidden]):visible").count()) {
      console.log("Stop: player Continue");
      await page
        .locator("#continue:not([hidden]):visible")
        .click()
        .catch(() => {});
      await page.waitForTimeout(2000);
    }
    // A scene still playing covers the menu: wait it out fully, don't touch the calendar.
    if (await page.locator("#game.cinema").count()) {
      console.log("Stop: cinema scene playing, waiting it out");
      await page
        .locator("#game.cinema")
        .waitFor({ state: "detached", timeout: 90000 })
        .catch(() => {});
      await page.waitForTimeout(1000);
    }
    // Run the clock again from the calendar.
    await page
      .locator('[data-tab="calendar"]')
      .first()
      .evaluate((e) => e.click());
    await page
      .locator(".calendar-heading h3")
      .waitFor({ timeout: 15000 })
      .catch(() => {});
    for (let m = 0; m < 30; m += 1) {
      const heading = await page
        .locator(".calendar-heading h3")
        .innerText()
        .catch(() => "?");
      if (heading.includes(targetMonth)) break;
      await page
        .getByRole("button", { name: "Next month", exact: true })
        .click();
      await page.waitForTimeout(500);
    }
    await page
      .locator(".month .day")
      .first()
      .waitFor({ timeout: 15000 })
      .catch(() => {});
    const day3 = page.locator(`.month button.day[data-date="${targetDate}"]`);
    if (!(await day3.count())) {
      console.log("No day 3 in view; skipping leg");
      continue;
    }
    if (
      !(await day3
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      const cover = await day3
        .first()
        .evaluate((e) => {
          const r = e.getBoundingClientRect();
          const t = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
          return t
            ? `${t.tagName}#${t.id}.${t.className}`.slice(0, 120)
            : "none";
        })
        .catch(() => "?");
      console.log("Day 3 hidden; covering element:", cover);
      await page.screenshot({
        path: "docs/reports/ballot-pages-2026-10-24/covered.png",
      });
      // A scene may be ending: wait it out fully, then retry next leg.
      await page
        .locator("#game.cinema")
        .waitFor({ state: "detached", timeout: 90000 })
        .catch(() => {});
      continue;
    }
    await day3.first().click();
    await page.waitForTimeout(1000);
    const skip2 = page.locator(".calendar-details .skip-forward");
    if (await skip2.count()) {
      await skip2.first().click();
      await page.waitForTimeout(4000);
    }
    console.log(
      "Leg clock:",
      await page
        .locator("#card-clock")
        .innerText()
        .catch(() => "?"),
    );
  }
  console.log(
    "Clock:",
    await page
      .locator("#card-clock")
      .innerText()
      .catch(() => "?"),
  );
  // Election day arrived at midnight: play the day out until the polls stop
  // opens the ballot. Answer stops, wait out scenes, advance the day.
  // The last skip leg leaves the calendar sheet open over the day button.
  if (await page.locator("#sheet:not([hidden])").count()) {
    console.log("Election day: closing the calendar sheet");
    await page.locator("#sheet-close").click();
    await page.waitForTimeout(1000);
  }
  const arrived = (
    await page
      .locator("#card-clock")
      .innerText()
      .catch(() => "?")
  ).includes(targetClock);
  assert.ok(arrived, `legs never reached ${targetClock}`);
  for (let round = 0; round < 30; round += 1) {
    if (await page.locator("#ballot:not([hidden])").count()) break;
    console.log(
      "Round",
      round,
      await page
        .locator("#card-clock")
        .innerText()
        .catch(() => "?"),
    );
    const talk = page.locator(
      "#talk:not([hidden]) #talk-choices button:visible",
    );
    if (await talk.count()) {
      console.log("Election day stop: talk");
      await talk.first().click();
      await page.waitForTimeout(2000);
      continue;
    }
    if (await page.locator("#talk:not([hidden])").count()) {
      const left = page.locator("#talk-leave:visible");
      if (await left.count()) await left.click().catch(() => {});
      else
        await page
          .locator("#talk-silent:visible")
          .click()
          .catch(() => {});
      await page.waitForTimeout(2000);
      continue;
    }
    if (await page.locator("#continue:not([hidden]):visible").count()) {
      console.log("Election day stop: player Continue");
      await page
        .locator("#continue:not([hidden]):visible")
        .click()
        .catch(() => {});
      await page.waitForTimeout(2000);
      continue;
    }
    if (await page.locator("#game.cinema").count()) {
      console.log("Election day: cinema scene playing, waiting it out");
      await page
        .locator("#game.cinema")
        .waitFor({ state: "detached", timeout: 90000 })
        .catch(() => {});
      await page.waitForTimeout(1000);
      continue;
    }
    const day = page.locator("#day:not([disabled]):visible");
    if (await day.count()) {
      console.log("Election day: advancing the day");
      await day.first().click();
      await page.waitForTimeout(4000);
      continue;
    }
    console.log(
      "Election day: no ballot, no stops, no scenes, no day button; day count:",
      await page.locator("#day").count(),
      "disabled:",
      await page.locator("#day[disabled]").count(),
    );
    await page.waitForTimeout(3000);
  }
  console.log(
    "Ballot visible:",
    await page.locator("#ballot:not([hidden])").count(),
  );
  await page.screenshot({
    path: "docs/reports/ballot-pages-2026-10-24/election-day.png",
  });
  assert.ok(
    await page.locator("#ballot:not([hidden])").count(),
    "no ballot on election day",
  );
  const titles = () =>
    page.locator("#ballot-races .race:not(.paged-out) h3").allInnerTexts();
  const total = await page.locator("#ballot-races .race").count();
  console.log("Races on ballot:", total);
  const page1 = await titles();
  console.log("Page 1:", page1.join(" | "));
  await page.screenshot({
    path: "docs/reports/ballot-pages-2026-10-24/before-ballot.png",
  });
  // Continue must turn the ballot's pages.
  const pagerNext = page.locator("#ballot-pager button").nth(1);
  assert.ok(await pagerNext.count(), "no ballot pager Continue");
  await pagerNext.evaluate((e) => e.click());
  await page.waitForTimeout(1500);
  const page2 = await titles();
  console.log("Page 2:", page2.join(" | "));
  assert.notDeepEqual(page2, page1, "Continue did not turn the ballot page");
  console.log("PASS ballot: Continue turns the pages");
  // Page on until the player's own race (candidate "Test Voter") shows.
  // The pager hides (not disables) its ends, so stop at a hidden Continue.
  let found = false;
  for (let p = 0; p < 20; p += 1) {
    console.log(`Ballot page ${p + 1}:`, (await titles()).join(" | "));
    console.log(
      `Ballot page ${p + 1} choices:`,
      (
        await page
          .locator("#ballot-races .race:not(.paged-out) button")
          .allInnerTexts()
          .catch(() => [])
      )
        .join(" || ")
        .slice(0, 600),
    );
    if (
      await page
        .locator("#ballot-races .race:not(.paged-out) button", {
          hasText: "Test Voter",
        })
        .count()
    ) {
      found = true;
      break;
    }
    const next = page.locator("#ballot-pager button").nth(1);
    if (!(await next.count()) || !(await next.isVisible().catch(() => false)))
      break;
    await next.evaluate((e) => e.click());
    await page.waitForTimeout(1500);
  }
  assert.ok(found, "own race (Test Voter) never paged into view");
  console.log("PASS ballot: paged to own race");
  await page.screenshot({
    path: "docs/reports/ballot-pages-2026-10-24/own-race.png",
  });
  // Mark the own race; the mark response carries the ballot (visit) id.
  const marked = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/polling-place/mark",
    { timeout: 30000 },
  );
  await page
    .locator("#ballot-races .race:not(.paged-out) button", {
      hasText: "Test Voter",
    })
    .first()
    .click();
  const record = (await (await marked).json()).record ?? {};
  console.log("Ballot id:", record.id ?? "?");
  assert.ok(record.id, "mark response carried no ballot id");
  console.log("PASS marking: vote recorded with ballot id", record.id);
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: "docs/reports/ballot-pages-2026-10-24/after-mark.png",
  });
} finally {
  await browser.close();
}
