/* global process, console, document, window */
// Patch notes read like real patch notes (crew line, Nov 16: "This is not
// structured like a real patch note."): the newest build's notes by area,
// one short line each, across the sheet's full width, with nothing that
// scrolls. Opens Patch notes from the title at 1440 by 900.
// Run against the bench: node src/bench/patch-notes-fit.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await ready;
  await page.locator("#front-patch-notes").click();
  await page
    .locator(".roster-screen.patch-notes .patch-lines li")
    .first()
    .waitFor();
  await page.waitForTimeout(800);
  if (shots) await page.screenshot({ path: `${shots}/patch-notes.png` });
  const m = await page.evaluate(() => {
    // The sheet, cut to the window: a note past either is out of sight.
    const box = document.getElementById("sheet").getBoundingClientRect();
    const sheet = {
      bottom: Math.min(box.bottom, window.innerHeight),
      right: Math.min(box.right, window.innerWidth),
    };
    const notes = [...document.querySelectorAll(".patch-lines li")];
    const lineOf = (li) =>
      parseFloat(getComputedStyle(li).lineHeight) ||
      li.getBoundingClientRect().height;
    // The notes and every box around them; the builds list beside them is
    // the long-list box the menu look allows to scroll in itself.
    const notesPage = document.querySelector(
      ".roster-screen.patch-notes .roster-page",
    );
    const around = [];
    for (let n = notesPage; n && n.id !== "game"; n = n.parentElement)
      around.push(n);
    const scrolls = [...around, ...notesPage.querySelectorAll("*")].filter(
      (e) =>
        e.scrollHeight > e.clientHeight + 1 &&
        /auto|scroll/.test(getComputedStyle(e).overflowY),
    );
    const page = document.querySelector(
      ".roster-screen.patch-notes .roster-page",
    );
    return {
      build: document.querySelector(".roster [aria-pressed=true]")?.textContent,
      notes: notes.length,
      multiLine: notes.filter(
        (li) => li.getBoundingClientRect().height > lineOf(li) * 1.6,
      ).length,
      below: notes.filter(
        (li) => li.getBoundingClientRect().bottom > sheet.bottom + 1,
      ).length,
      right: notes.filter(
        (li) => li.getBoundingClientRect().right > sheet.right + 1,
      ).length,
      scrolls: scrolls.map((e) => e.className || e.id),
      areas: [...page.querySelectorAll(".sechead")].map((h) => h.textContent),
      columns: getComputedStyle(page).columnCount,
    };
  });
  console.log(JSON.stringify(m));
  assert.ok(m.notes > 0, "the newest build has no notes");
  assert.equal(m.multiLine, 0, `${m.multiLine} notes run past one line`);
  assert.equal(m.below, 0, `${m.below} notes sit below the sheet`);
  assert.equal(m.right, 0, `${m.right} notes run off its right edge`);
  assert.deepEqual(m.scrolls, [], "something on the notes scrolls");
  assert.ok(
    !m.areas.some((a) => /^(Added|Improved|Fixed|Changed)$/.test(a)),
    `the notes are grouped by kind of change, not by area: ${m.areas.join(", ")}`,
  );
  assert.deepEqual(errors, []);
  console.log("patch notes fit: pass");
} finally {
  await browser.close();
}
