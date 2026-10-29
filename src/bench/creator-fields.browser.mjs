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
  // The gold name is set apart from the first control by a drawn rule and a
  // gap, on the title menu, the New game choice and the creator.
  const header = (first) =>
    page.evaluate((sel) => {
      const title = document.querySelector("#front .title");
      const rule = document.querySelector("#front .title-rule");
      const control = document.querySelector(sel);
      const t = title.getBoundingClientRect();
      const r = rule.getBoundingClientRect();
      const c = control.getBoundingClientRect();
      return {
        ruleDrawn: getComputedStyle(rule).borderTopWidth !== "0px",
        above: r.top - t.bottom,
        below: c.top - r.bottom,
        gap: c.top - t.bottom,
      };
    }, first);
  const checkHeader = async (name, first) => {
    const h = await header(first);
    console.log(`${name}: rule above ${h.above}, below ${h.below}`);
    assert.ok(h.ruleDrawn, `${name}: no rule is drawn`);
    assert.ok(h.above >= 8 && h.below >= 12, `${name}: the rule has no room`);
    if (process.env.SHOT_DIR)
      await page.screenshot({ path: `${process.env.SHOT_DIR}/${name}.png` });
  };
  await checkHeader("title-menu", "#new-life");
  await page.locator("#new-life").click();
  await checkHeader("new-game", "#new-start");
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
  await checkHeader("creator", "#cr-character button, #cr-character input");
  // One grid: the headings and labels share a left edge, and the name fields
  // and the birthday fields share the field column's left edge.
  const edges = await page.evaluate(() => {
    const left = (sel) =>
      document.querySelector(sel).getBoundingClientRect().left;
    return {
      labels: [
        "#cr-character > h2.label",
        "#cr-gender-label, [data-testid=gender-choices] > legend",
        "#cr-character .group:not(.row) > .label",
        "#cr-birthday-label, [data-testid=creator-birthday] > legend",
        "#cr-character .field",
      ].map(left),
      fields: ["#cr-given", "#cr-family", "#cr-month"].map(left),
    };
  });
  console.log("label edges", edges.labels, "field edges", edges.fields);
  assert.equal(
    new Set(edges.labels.map((x) => x.toFixed(0))).size,
    1,
    "headings and labels do not share one left edge",
  );
  assert.equal(
    new Set(edges.fields.map((x) => x.toFixed(0))).size,
    1,
    "the name and birthday fields do not share one left edge",
  );
  // Picking a gender changes no button's size.
  const sizes = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("[data-gender]")].map((b) => {
        const r = b.getBoundingClientRect();
        return `${r.width.toFixed(1)}x${r.height.toFixed(1)}`;
      }),
    );
  const before = await sizes();
  for (const gender of ["female", "male", "nonbinary"]) {
    await page.locator(`[data-gender=${gender}]`).click();
    assert.deepEqual(
      await sizes(),
      before,
      `picking ${gender} resized a gender button`,
    );
  }
  await page.locator("[data-gender=male]").click();
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  assert.deepEqual(errors, []);
  console.log(
    "PASS the birthday fields line up and every creator field shows its box",
  );
} finally {
  await browser.close();
}
