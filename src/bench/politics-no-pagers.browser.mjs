/* global process, console, document */
// The Politics menus in a real browser on the bench (npm run bench) with a
// life in progress: no Back or Continue inside any of them. Government shows
// every body and every member at once, side by side, on each level; Parties
// shows every seat; the sheet's own page-turner stays hidden because the
// screen fits (owner, Oct 28 sitting, point 22: "Remove every Continue and
// Back from every menu. They serve no purpose").
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
const controls = () =>
  page.evaluate(() => ({
    pagers: document.querySelectorAll("#sheet-body .record-pager").length,
    sheetPager: !document.getElementById("sheet-pager").hidden,
    words: [...document.querySelectorAll("#sheet-body button")]
      .map((b) => b.textContent.trim())
      .filter((t) => /^(Back|Continue|Next)$/.test(t)),
    bodies: document.querySelectorAll("#sheet-body .record-section").length,
    rows: document.querySelectorAll("#sheet-body .person-row").length,
    hidden: [...document.querySelectorAll("#sheet-body .paged-out")].length,
    // A row or face past the box's edge is clipped: shown to nobody.
    outside: (() => {
      const box = document.getElementById("sheet-body").getBoundingClientRect();
      return [
        ...document.querySelectorAll("#sheet-body .person-row, .face-cell"),
      ].filter((row) => {
        const r = row.getBoundingClientRect();
        return r.right > box.right + 1 || r.bottom > box.bottom + 1;
      }).length;
    })(),
  }));
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
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator("#sheet-body .screen-grid").waitFor();
  await page.waitForTimeout(1200);
  const seen = [];
  for (const level of ["local", "state", "federal"]) {
    await page
      .locator(`.government-picker .tab[data-level="${level}"]`)
      .click();
    await page.waitForTimeout(1200);
    await page.locator("#sheet-body .person-row:visible").first().waitFor();
    const c = await controls();
    seen.push({ screen: `Government ${level}`, ...c });
  }
  await page.locator('#sheet-tabs [data-tab="parties"]').click();
  await page.locator("#sheet-body .person-row").first().waitFor();
  await page.waitForTimeout(600);
  seen.push({ screen: "Parties", ...(await controls()) });
  if (process.env.SHOT_DIR) {
    await page.screenshot({ path: `${process.env.SHOT_DIR}/22-parties.png` });
    await page.locator('#sheet-tabs [data-tab="government"]').click();
    for (const level of ["state", "local"]) {
      await page
        .locator(`.government-picker .tab[data-level="${level}"]`)
        .click();
      await page.waitForTimeout(900);
      await page.screenshot({
        path: `${process.env.SHOT_DIR}/22-government-${level}.png`,
      });
    }
  }
  for (const s of seen) {
    console.log(
      `${s.screen}: ${s.bodies} sections, ${s.rows} rows, ${s.pagers} pagers, sheet pager ${s.sheetPager ? "shown" : "hidden"}, ${s.hidden} rows paged out, ${s.outside} clipped${s.words.length ? `, words ${s.words.join("/")}` : ""}`,
    );
    assert.equal(
      s.pagers,
      0,
      `${s.screen}: a Back and Continue pair inside the menu`,
    );
    assert.deepEqual(
      s.words,
      [],
      `${s.screen}: a Back, Continue or Next button`,
    );
    assert.ok(
      !s.sheetPager,
      `${s.screen}: the screen does not fit the window and pages`,
    );
    assert.equal(s.hidden, 0, `${s.screen}: rows kept off the page`);
    assert.equal(s.outside, 0, `${s.screen}: rows clipped past the box`);
  }
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: no Back or Continue in the Politics menus, everything fits");
} finally {
  await browser.close();
}
