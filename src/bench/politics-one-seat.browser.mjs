/* global process, console, document */
// The Politics menu's State level in a real browser on the bench (npm run
// bench) with a life in progress: a one-seat office (the governor) shows no
// line repeating the state under its title and no party bar with a 1 on it
// (owner, Oct 28 sitting, points 16 and 17).
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
const sections = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("#sheet-body .record-section")]
      .filter((s) => s.querySelector(".person-row, .row"))
      .map((s) => ({
        title: s.querySelector("h3")?.textContent.trim() ?? "",
        place: s.querySelector(".record-place")?.textContent.trim() ?? "",
        rows: s.querySelectorAll(".person-row").length,
        bars: s.querySelectorAll(".chart, .bar-chart, [class*='chart']").length,
      })),
  );
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
  await page.locator('.government-picker .tab[data-level="state"]').click();
  await page.waitForTimeout(800);
  await page.locator("#sheet-body .person-row").first().waitFor();
  const seen = await sections();
  console.log(
    seen
      .map(
        (s) => `${s.title}: place "${s.place}", ${s.rows} rows, ${s.bars} bars`,
      )
      .join("; "),
  );
  assert.ok(seen.length > 0, "no office section on the State level");
  for (const s of seen) {
    assert.notEqual(s.place, stateName, `${s.title}: the state named again`);
    assert.equal(
      s.place,
      "",
      `${s.title}: a government line on a state office`,
    );
    if (s.rows === 1) assert.equal(s.bars, 0, `${s.title}: a bar for one seat`);
  }
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/16-politics-one-seat.png`,
    });
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: no state line under a state office, no bar for one seat");
} finally {
  await browser.close();
}
