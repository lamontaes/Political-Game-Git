/* global process, console, document */
// The Issues tab in a real browser on the bench (npm run bench) with a life
// in progress: the laws in force as cards by subject, each opening the law's
// own screen (what is in force at each level and since when, the statute, the
// measure), with no row repeating the state or printing a record date
// (owner, Oct 28 sitting, point 21).
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
  await page.locator("#sheet-body .entries-cards .entry").first().waitFor();
  const list = await page.evaluate(() => ({
    groups: [...document.querySelectorAll("#sheet-body .record-section > h3")]
      .map((h) => h.textContent.trim())
      .filter(Boolean),
    cards: [...document.querySelectorAll("#sheet-body .entry")].map((e) => ({
      title: e.querySelector("h3")?.textContent.trim() ?? "",
      value: e.querySelector(".entry-value")?.textContent.trim() ?? "",
      line: e.querySelector(".entry-line")?.textContent.trim() ?? "",
      series: e.dataset.series ?? "",
      clickable: e.tagName === "BUTTON",
    })),
    text: document.getElementById("sheet-body").innerText,
  }));
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
  // Open the first issue with a value (the minimum wage where it leads).
  const pick =
    list.cards.find((c) => /^minimum wage$/i.test(c.title)) ??
    list.cards.find((c) => c.value);
  await page
    .locator(`#sheet-body .entry[data-series="${pick.series}"]`)
    .click();
  await page.locator("#sheet-body .screen-heading").waitFor();
  await page.waitForTimeout(400);
  const law = await page.evaluate(() => ({
    name: document
      .querySelector("#sheet-body .screen-heading .name")
      ?.textContent.trim(),
    meta:
      document.querySelector("#sheet-body .screen-meta")?.textContent.trim() ??
      "",
    lede:
      document.querySelector("#sheet-body .screen-lede")?.textContent.trim() ??
      "",
    sections: [...document.querySelectorAll("#sheet-body .record-section")].map(
      (s) => ({
        title: s.querySelector("h3")?.textContent.trim() ?? "",
        facts: [...s.querySelectorAll(".record-fact")].map((f) => ({
          label: f.querySelector(".label")?.textContent.trim() ?? "",
          value: f.querySelector("strong")?.textContent.trim() ?? "",
        })),
      }),
    ),
    text: document.getElementById("sheet-body").innerText,
  }));
  console.log(
    `${law.name} (${law.meta}): ${law.lede}; ${law.sections
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
