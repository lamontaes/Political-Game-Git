/* global process, console, document */
// The Issues tab in a real browser on the bench (npm run bench) with a life
// in progress: the laws in force as cards, one subject at a time on the rail,
// paged inside a plate so the panel never scrolls (owner, Oct 29), each card
// opening the law's own page (what is in force at each level and since when,
// the statute, the measure), with no row repeating the state or printing a
// record date (owner, Oct 28 sitting, point 21).
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
  const stateName = title.life.placeName.split(", ").at(-1);
  await page.locator("#front-continue:not([disabled])").click();
  await page.locator("#front").waitFor({ state: "hidden" });
  await page.waitForTimeout(1200);
  for (const sel of ["#news-reader-close", "#talk-next"]) {
    const b = page.locator(sel);
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator('#sheet-tabs [data-tab="issues"]').click();
  await page.locator("#sheet-body .issues-laws .roster-row").first().waitFor();
  // Every subject in the list, each opened in turn: its laws, and the panel never scrolling.
  const laws = [];
  let text = "";
  let count = 0;
  await eachSubject(page, async () => {
    count += 1;
    const seen = await page.evaluate(() => {
      const body = document.getElementById("sheet-body");
      return {
        scrolls: body.scrollHeight > body.clientHeight + 1,
        laws: [
          ...document.querySelectorAll("#sheet-body .issues-laws .roster-row"),
        ].map((e) => ({
          title: e.querySelector("b")?.textContent.trim() ?? "",
          value: e.querySelector("span")?.textContent.trim() ?? "",
          series: e.dataset.series ?? "",
          clickable: e.tagName === "BUTTON",
        })),
        text: body.innerText,
      };
    });
    assert.ok(!seen.scrolls, "the Issues panel scrolls");
    assert.ok(seen.laws.length, "a subject with no laws");
    laws.push(...seen.laws);
    text += seen.text;
  });
  assert.ok(count >= 2, "the issues are not grouped by subject");
  console.log(`${count} subjects, ${laws.length} laws on the first pages`);
  assert.ok(laws.length >= 10, "fewer than ten issues");
  for (const c of laws) {
    assert.ok(c.clickable, `${c.title}: not clickable`);
    assert.ok(c.series, `${c.title}: no series record`);
  }
  assert.doesNotMatch(text, /\d{4}-\d{2}-\d{2}|us-policy-positions|undefined/);
  assert.doesNotMatch(text, new RegExp(`State · ${stateName}`));
  // Open a law with a value: its page names the level that sets it, and no label carries a
  // level, place and date together.
  const pick =
    laws.find((c) => /^minimum wage$/i.test(c.title)) ??
    laws.find((c) => c.value);
  let opened = false;
  await eachSubject(page, async () => {
    const row = page.locator(
      `#sheet-body .issues-laws .roster-row[data-series="${pick.series}"]`,
    );
    if (!opened && (await row.count())) {
      opened = true;
      await row.click();
      return true;
    }
  });
  await page.locator("#sheet-body .issues-laws .roster-title").waitFor();
  const law = await page.evaluate(() => ({
    name: document
      .querySelector("#sheet-body .issues-laws .roster-title")
      ?.textContent.trim(),
    labels: [
      ...document.querySelectorAll(
        "#sheet-body .issues-laws .roster-page .row",
      ),
    ].map((r) => r.firstElementChild?.textContent.trim() ?? ""),
    text: document.querySelector("#sheet-body .issues-laws .roster-page")
      .innerText,
  }));
  assert.equal(law.name, pick.title, "the law screen is not the issue clicked");
  assert.ok(law.labels.length >= 1, "no law in force shown");
  for (const label of law.labels) {
    assert.notEqual(label, stateName, "the state named as a row");
    assert.doesNotMatch(
      label,
      /\s·\s.*\d{4}/,
      "level, place and date in one label",
    );
  }
  assert.doesNotMatch(law.text, /\d{4}-\d{2}-\d{2}|undefined|null/);
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: Issues are subjects and laws, each opening the law itself");
} finally {
  await browser.close();
}

// The Subject filter's choices; visit each subject.
async function eachSubject(page, visit) {
  {
    const bar = page.locator("#sheet-body .tab-rail.issue-filter").nth(2);
    const subjects = await bar
      .locator(".tab")
      .evaluateAll((all) =>
        all.map((t) => t.dataset.subject).filter((v) => v !== "all"),
      );
    for (const subject of subjects) {
      await bar.locator(`.tab[data-subject="${subject}"]`).click();
      await page
        .locator("#sheet-body .issues-laws .roster-row")
        .first()
        .waitFor();
      if ((await visit()) === true) return;
    }
  }
}
