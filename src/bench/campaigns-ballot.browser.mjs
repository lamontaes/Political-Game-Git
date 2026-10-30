/* global process, console, document */
// The Campaigns tab in a real browser on the bench (npm run bench) with a
// life in progress: the coming ballot's real races, each opening to who runs
// (person rows with headshots, their filed views) and File for it taking the
// player to the office that takes the filing, on that race (owner, Oct 28
// sitting, point 19). No "Trustee, No one has filed" rows printed three times.
import assert from "node:assert/strict";
import { chromium } from "playwright";
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
  const title = await (await ready).json();
  assert.ok(title.life, "no life in progress on the bench");
  console.log(`life: ${title.life.name} · ${title.life.placeName}`);
  await page.locator("#front-continue:not([disabled])").click();
  await page.locator("#front").waitFor({ state: "hidden" });
  await page.waitForTimeout(1200);
  for (const sel of ["#news-reader-close", "#talk-next"]) {
    const b = page.locator(sel);
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  const ballot = await (
    await page.request.get(`${base}/api/government/local-races`)
  ).json();
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator('#sheet-tabs [data-tab="campaigns"]').click();
  await page.locator("#sheet-body .entry").first().waitFor();
  // The ballot is race cards on a plate, paged (owner, Oct 29: every menu
  // like Government); each card opens its race's page.
  const seen = [];
  for (;;) {
    seen.push(
      ...(await page.evaluate(() =>
        [...document.querySelectorAll("#sheet-body .race-cards .entry")].map(
          (e) => ({
            title: e.querySelector("h3")?.textContent.trim() ?? "",
            value: e.querySelector(".entry-value")?.textContent.trim() ?? "",
            contest: e.dataset.contest ?? "",
            opens: e.tagName === "BUTTON",
            text: e.innerText,
          }),
        ),
      )),
    );
    const next = page.locator("#sheet-body .race-cards .pager-arrow").nth(1);
    if (!(await next.isVisible()) || !(await next.isEnabled())) break;
    await next.click();
  }
  console.log(
    `${ballot.date}: ${ballot.races.length} races on the ballot; ${seen.length} cards: ${seen.map((s) => `${s.title} (${s.value})`).join(" | ")}`,
  );
  assert.equal(seen.length, ballot.races.length, "a card per race");
  const titles = seen.map((s) => s.title);
  assert.equal(new Set(titles).size, titles.length, "a race printed twice");
  for (const s of seen) {
    assert.ok(s.opens, `${s.title}: not clickable`);
    assert.ok(s.contest, `${s.title}: no contest record`);
    assert.doesNotMatch(
      s.text,
      /\d{4}-\d{2}-\d{2}|contest:|official:|undefined/,
    );
  }
  // Open the first race with candidates, else the first race: its page shows
  // who runs as face cards, and File for it when the player may file.
  const race = ballot.races.find((r) => r.filers.length > 0) ?? ballot.races[0];
  // Back to the first page, then forward to the race's card.
  const back = page.locator("#sheet-body .race-cards .pager-arrow").first();
  while ((await back.isVisible()) && (await back.isEnabled()))
    await back.click();
  for (;;) {
    const card = page.locator(
      `#sheet-body .race-cards .entry[data-contest="${race.contestId}"]`,
    );
    if (await card.count()) {
      await card.click();
      break;
    }
    await page.locator("#sheet-body .race-cards .pager-arrow").nth(1).click();
  }
  await page.locator("#sheet-body .race-page").waitFor();
  const page2 = await page.evaluate(() => ({
    people: document.querySelectorAll("#sheet-body .race-page .member-card")
      .length,
    faces: [
      ...document.querySelectorAll("#sheet-body .race-page .member-face"),
    ].filter((f) => f.style.backgroundImage).length,
    file: document.querySelectorAll(
      '#sheet-body .race-page [data-testid="file-for-it"]',
    ).length,
    text: document.getElementById("sheet-body").innerText,
  }));
  console.log(
    `${race.title}: ${page2.people} running (${page2.faces} with a face), ${page2.file} File for it`,
  );
  assert.equal(page2.people, race.filers.length, `${race.title}: who runs`);
  assert.equal(
    page2.file,
    race.filingOpen && race.playerMayFile && race.filedWith ? 1 : 0,
    `${race.title}: File for it`,
  );
  assert.doesNotMatch(page2.text, /\d{4}-\d{2}-\d{2}|contest:|undefined/);
  await page.waitForTimeout(400);
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/19-campaigns-ballot.png`,
    });
  // File for it takes the player to the filing office, on that race.
  const file = page.locator('[data-testid="file-for-it"]:visible').first();
  if (await file.count()) {
    const opening = page.waitForResponse((r) =>
      r.url().includes("/api/filing/open"),
    );
    await file.click();
    await opening;
    await page.locator("#talk:not([hidden])").waitFor();
    await page.waitForTimeout(800);
    const counter = await page.evaluate(() => ({
      sheet: document.getElementById("sheet").hidden,
      name: document.getElementById("talk-name").textContent.trim(),
      text: document.getElementById("talk").innerText,
    }));
    console.log(
      `at the counter: ${counter.name}; sheet closed ${counter.sheet}`,
    );
    assert.ok(counter.sheet, "the menu stayed open");
    assert.ok(counter.name.length > 0, "nobody at the counter");
    if (process.env.SHOT_DIR)
      await page.screenshot({
        path: `${process.env.SHOT_DIR}/19-file-for-it.png`,
      });
  } else console.log("no race takes a filing today; the hot link is not shown");
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "ok: Campaigns is the coming ballot as race cards, a race opens its page",
  );
} finally {
  await browser.close();
}
