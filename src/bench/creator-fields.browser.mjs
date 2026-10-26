/* global process, console, document, getComputedStyle */
// The creator in a real browser, on the bench (npm run bench): New game →
// Start a life at 1440x900. Month, day and year share one top and bottom
// edge, and every text field and menu shows its box at rest, empty or filled.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-character:not([hidden])").waitFor();
  await page.mouse.move(1400, 880); // nothing hovered
  await page.waitForTimeout(500);
  const fields = await page.evaluate(() =>
    ["cr-given", "cr-family", "cr-month", "cr-day", "cr-year"].map((id) => {
      const node = document.getElementById(id);
      const r = node.getBoundingClientRect();
      const color = getComputedStyle(node).borderTopColor;
      const alpha = Number(
        (color.match(/rgba?\(([^)]+)\)/)?.[1].split(",")[3] ?? "1").trim(),
      );
      return { id, top: r.top, bottom: r.bottom, alpha, value: node.value };
    }),
  );
  for (const f of fields)
    console.log(
      `${f.id}: top ${f.top.toFixed(1)}, bottom ${f.bottom.toFixed(1)}, box ${f.alpha}, "${f.value}"`,
    );
  const date = fields.filter((f) => /month|day|year/.test(f.id));
  assert.equal(
    new Set(date.map((f) => f.top.toFixed(1))).size,
    1,
    "month, day and year do not share a top edge",
  );
  assert.equal(
    new Set(date.map((f) => f.bottom.toFixed(1))).size,
    1,
    "month, day and year do not share a bottom edge",
  );
  for (const f of fields)
    assert.ok(f.alpha > 0, `${f.id} shows no box at rest`);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  assert.deepEqual(errors, []);
  console.log(
    "PASS the birthday fields line up and every creator field shows its box",
  );
} finally {
  await browser.close();
}
