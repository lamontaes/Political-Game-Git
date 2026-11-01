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
  await page.locator("#sheet-body .issue-cards .entry").first().waitFor();
  // Every subject on the rail, each opened in turn: its cards, and the panel
  // never scrolling.
  const subjects = await page
    .locator("#sheet-body [data-subject]")
    .evaluateAll((tabs) => tabs.map((t) => t.dataset.subject));
  const list = { groups: [], cards: [], text: "" };
  for (const subject of subjects) {
    await page.locator(`#sheet-body [data-subject="${subject}"]`).click();
    await page.waitForTimeout(200);
    const seen = await page.evaluate(() => {
      const body = document.getElementById("sheet-body");
      return {
        group: document
          .querySelector("#sheet-body [data-subject].on")
          ?.textContent.trim(),
        scrolls: body.scrollHeight > body.clientHeight + 1,
        cards: [...document.querySelectorAll("#sheet-body .entry")].map(
          (e) => ({
            title: e.querySelector("h3")?.textContent.trim() ?? "",
            value: e.querySelector(".entry-value")?.textContent.trim() ?? "",
            line: e.querySelector(".entry-line")?.textContent.trim() ?? "",
            series: e.dataset.series ?? "",
            clickable: e.tagName === "BUTTON",
          }),
        ),
        text: body.innerText,
      };
    });
    assert.ok(!seen.scrolls, `${seen.group}: the Issues panel scrolls`);
    assert.ok(seen.cards.length, `${seen.group}: no cards`);
    list.groups.push(seen.group);
    list.cards.push(...seen.cards);
    list.text += seen.text;
  }
  console.log(
    `${list.groups.length} subjects (${list.groups.slice(0, 5).join(", ")}...), ${list.cards.length} issues; first: ${list.cards
      .slice(0, 3)
      .map((c) => `${c.title} = ${c.value} (${c.line})`)
      .join(" | ")}`,
  );
  assert.ok(list.groups.length >= 2, "the issues are not grouped by subject");
  assert.ok(list.cards.length >= 10, "fewer than ten issues");
  for (const c of list.cards) {
    assert.ok(c.clickable, `${c.title}: not clickable`);
    assert.ok(c.series, `${c.title}: no series record`);
  }
  assert.doesNotMatch(
    list.text,
    /\d{4}-\d{2}-\d{2}|us-policy-positions|undefined/,
  );
  assert.doesNotMatch(list.text, new RegExp(`State · ${stateName}`));
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/21-issues-cards.png`,
    });
  // Open the first issue with a value (the minimum wage where it leads),
  // from its subject's page.
  const pick =
    list.cards.find((c) => /^minimum wage$/i.test(c.title)) ??
    list.cards.find((c) => c.value);
  const box = page.locator('#sheet-body input[type="search"]');
  await box.fill(pick.title);
  await page
    .locator(`#sheet-body .entry[data-series="${pick.series}"]`)
    .click();
  await page.locator("#sheet-body .law-page").waitFor();
  await page.waitForTimeout(400);
  const law = await page.evaluate(() => ({
    name: document
      .querySelector("#sheet-body .law-page .heading")
      ?.textContent.trim(),
    // Each plate (in force, coming, changed, votes) and its facts: the
    // in-force plates and every labeled row.
    sections: [...document.querySelectorAll("#sheet-body .law-page .plate")]
      .filter((s) => !s.classList.contains("fact-plate"))
      .map((s) => ({
        title: s.querySelector("h3")?.textContent.trim() ?? "",
        facts: [
          ...[...s.querySelectorAll(".fact-plate")].map((f) => ({
            label: f.querySelector(".label")?.textContent.trim() ?? "",
            value: f.querySelector(".fact-value")?.textContent.trim() ?? "",
          })),
          ...[...s.querySelectorAll(".record-value")].map((v) => ({
            label: v.previousElementSibling?.textContent.trim() ?? "",
            value: v.textContent.trim(),
          })),
        ],
      })),
    text: document.getElementById("sheet-body").innerText,
  }));
  console.log(
    `${law.name}: ${law.sections
      .map(
        (s) =>
          `${s.title}: ${s.facts.map((f) => `${f.label} = ${f.value}`).join(", ")}`,
      )
      .join(" | ")}`,
  );
  assert.equal(law.name, pick.title, "the law screen is not the issue clicked");
  assert.ok(
    law.sections.length >= 1 && law.sections[0].facts.length >= 1,
    "no law in force shown",
  );
  for (const s of law.sections)
    for (const f of s.facts) {
      assert.notEqual(
        f.label,
        stateName,
        `${s.title}: the state named as a row`,
      );
      assert.doesNotMatch(
        f.label,
        /\s·\s.*\d{4}/,
        `${s.title}: level, place and date in one label`,
      );
    }
  assert.doesNotMatch(law.text, /\d{4}-\d{2}-\d{2}|undefined|null/);
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/21-issues-law.png`,
    });
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: Issues are cards by subject, each opening the law itself");
} finally {
  await browser.close();
}
