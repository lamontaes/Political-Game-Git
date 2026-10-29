/* global process, console, document, getComputedStyle */
// News is the paper itself (owner, Oct 28 sitting, points 24 and 25): no
// economy rows above it, the sheet is the page in the paper's stock and type,
// every story the outlet has is on the front page, nothing turns a page, and
// a story opened to read sits under the same masthead with no "Back to front
// page" button (point 26): the masthead returns. Run against a bench with a
// life in progress: node src/bench/news-paper.browser.mjs
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
  const stories = (
    await (
      await page.request.get(
        `${base}/api/news?id=${encodeURIComponent(title.life.personId)}`,
      )
    ).json()
  ).filter((r) => r.headline || r.lede);
  await page.locator('.ring[data-tab="news"]').click();
  await page.locator("#sheet-body .paper-stories").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const front = await page.evaluate(() => {
    const sheet = document.getElementById("sheet");
    const body = document.getElementById("sheet-body");
    const words = [...body.querySelectorAll("button")]
      .map((b) => b.textContent.trim())
      .filter((t) => /^(Back|Continue|Next|Back to front page)$/.test(t));
    return {
      paperSheet: sheet.classList.contains("paper-sheet"),
      background: getComputedStyle(sheet).backgroundColor,
      ink: getComputedStyle(body.querySelector(".paper")).color,
      titleShown: getComputedStyle(document.getElementById("sheet-title"))
        .display,
      rowsAbove: body.querySelectorAll(":scope > .row").length,
      masthead: body.querySelector(".paper-masthead-name")?.textContent.trim(),
      dateline: body.querySelector(".paper-dateline")?.textContent.trim(),
      headlines: body.querySelectorAll(".paper-story .story-headline").length,
      lead: body
        .querySelector(".paper-story.lead .story-headline")
        ?.textContent.trim(),
      pagers: body.querySelectorAll(".paper-pager, .record-pager").length,
      words,
    };
  });
  console.log(
    `front page: ${front.headlines} headlines of ${stories.length} stories; masthead "${front.masthead}"; ${front.dateline}; page ${front.background}, ink ${front.ink}; ${front.rowsAbove} rows above; ${front.pagers} pagers${front.words.length ? `; words ${front.words.join("/")}` : ""}`,
  );
  assert.ok(front.paperSheet, "the sheet is not the paper");
  assert.equal(front.rowsAbove, 0, "rows above the paper (the economy rows)");
  assert.equal(front.titleShown, "none", "the sheet's own title shows");
  assert.notEqual(
    front.background,
    "rgba(0, 0, 0, 0)",
    "the page has no stock of its own",
  );
  // Ink on paper: a dark text color, not the panel's light one.
  const [r, g, b] = front.ink.match(/\d+/g).map(Number);
  assert.ok(r + g + b < 200, `the type is not ink: ${front.ink}`);
  assert.ok(front.masthead, "no masthead");
  assert.ok(front.dateline, "no dateline");
  assert.equal(
    front.headlines,
    stories.length,
    "not every story is on the front page",
  );
  assert.equal(front.pagers, 0, "a pager on the paper");
  assert.deepEqual(front.words, [], "a Back or Continue on the paper");
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/24-news-front-page.png`,
    });

  // Every story's printed text is on the page: a story with a body shows all its paragraphs.
  const onPage = await page.evaluate(
    () => document.getElementById("sheet-body").textContent,
  );
  const wanted = stories.flatMap((row) => row.paragraphs ?? []);
  for (const paragraph of wanted)
    assert.ok(onPage.includes(paragraph), `body not printed: ${paragraph}`);
  console.log(`${wanted.length} body paragraphs, all on the page`);
  // A story opens in place: it takes the lead on the same page, under the same masthead.
  const second = page
    .locator("#sheet-body .paper-story:not(.lead) .story-headline")
    .first();
  const name = (await second.textContent()).trim();
  await second.click();
  const story = await page.evaluate(() => {
    const body = document.getElementById("sheet-body");
    return {
      masthead: Boolean(body.querySelector(".paper-masthead-name")),
      lead: body
        .querySelector(".paper-story.lead .story-headline")
        ?.textContent.trim(),
      headlines: body.querySelectorAll(".paper-story .story-headline").length,
      page: Boolean(body.querySelector(".paper-article")),
      back: [...body.querySelectorAll("button")].filter((b) =>
        /^\s*(back|continue)/i.test(b.textContent),
      ).length,
    };
  });
  console.log(
    `opened "${name}": lead now "${story.lead}", ${story.headlines} headlines`,
  );
  assert.ok(story.masthead, "the page lost its masthead");
  assert.equal(story.lead, name, "the story did not take the lead in place");
  assert.equal(story.headlines, stories.length, "a story left the page");
  assert.ok(!story.page, "the story opened as a page of its own");
  assert.equal(story.back, 0, "a Back or Continue on the paper");
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/25-news-story.png`,
    });
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "ok: News is the paper, every story printed on it, a story opens in place",
  );
} finally {
  await browser.close();
}
