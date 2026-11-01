/* global process, console, document */
// Politics > Government, Leaders (owner, Oct 28 point 18: "printed text out of order"): each
// leader's chamber and state is one line inside that leader's own row, directly under the
// name, never a line that floats between two rows. Run against a bench with a life in
// progress: node src/bench/politics-leaders.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  const title = await (await ready).json();
  assert.ok(title.life, "no life in progress on the bench");
  console.log(`life: ${title.life.name} · ${title.life.placeName}`);
  await page.locator("#front-continue:not([disabled])").click();
  await page.locator("#front").waitFor({ state: "hidden" });
  await page
    .waitForFunction(
      () => !document.getElementById("week").disabled,
      undefined,
      { timeout: 120000 },
    )
    .catch(() => {});
  await page.evaluate(() =>
    document.querySelector('#rings [data-tab="politics"]').click(),
  );
  await page.locator("#sheet-body .person-row").first().waitFor();
  await page.waitForTimeout(1200);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll("#sheet-body .person-row-sub")].map((sub) => {
      const row = sub.closest(".person-row");
      const name = row?.querySelector(".member-name");
      const s = sub.getBoundingClientRect();
      const n = name?.getBoundingClientRect();
      const r = row?.getBoundingClientRect();
      return {
        text: sub.textContent.trim(),
        inRow: Boolean(row),
        under: Boolean(n) && s.top >= n.bottom - 2 && s.top - n.bottom < 12,
        inside: Boolean(r) && s.bottom <= r.bottom + 1,
        aligned: Boolean(n) && Math.abs(s.left - n.left) < 4,
      };
    }),
  );
  console.log(rows.map((r) => r.text).join(" | "));
  assert.ok(rows.length >= 3, "the leaders carry their chamber lines");
  for (const row of rows) {
    assert.ok(row.inRow, `${row.text}: not inside a leader's row`);
    assert.ok(row.under, `${row.text}: not directly under the name`);
    assert.ok(row.inside, `${row.text}: spills out of its row`);
    assert.ok(row.aligned, `${row.text}: not aligned with the name`);
  }
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: each leader's chamber and state sit under their own name");
} finally {
  await browser.close();
}
