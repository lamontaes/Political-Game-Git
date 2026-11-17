/* global process, console, document, fetch */
// Politics > Metrics, Layout A (owner, Nov 12: "go with A plus the years
// table"; a measure opens "one thin line over the years with each value
// written on it"). Starts a life in a drawn place, opens Metrics, and in each
// area reads the years table: every figure the row's own years. Then a row
// with years opens its timeline, a brass line with one point and one written
// value for each year, and the close returns to the table.
// Run against the bench: node src/bench/metrics-timeline.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const port = process.env.BENCH_PORT ?? 3000;
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
  const { seed, placeName } = await startLife(page, {
    url: `http://localhost:${port}/play`,
    fresh: true,
  });
  console.log("Seed:", seed, "Place:", placeName);
  const view = await page.evaluate(async () =>
    (await fetch("/api/metrics")).json(),
  );
  await page.locator('#rings [data-tab="politics"]').evaluate((e) => e.click());
  await page
    .locator('#sheet-tabs [data-tab="metrics"]')
    .evaluate((e) => e.click());
  await page.locator(".roster-screen.metrics-board .metrics-years").waitFor();
  if (shots) await page.screenshot({ path: `${shots}/metrics.png` });
  let opened = null;
  for (const section of view.sections) {
    await page
      .locator(
        `.roster-screen.metrics-board .roster [data-key="${section.key}"]`,
      )
      .click();
    await page
      .locator(
        `.roster-screen.metrics-board .roster-page[data-key="${section.key}"] .metrics-years`,
      )
      .waitFor();
    const table = await page.evaluate(() => {
      const head = [
        ...document.querySelectorAll(".metrics-yhead .metrics-ycell"),
      ].map((c) => Number(c.textContent));
      return {
        years: head,
        rows: [...document.querySelectorAll("button.metrics-yrow")].map(
          (b) => ({
            key: b.dataset.measure,
            filled: [...b.querySelectorAll(".metrics-ycell")].map(
              (c) => c.textContent !== "",
            ),
            opens: !b.disabled,
          }),
        ),
      };
    });
    for (const row of section.rows) {
      const drawn = table.rows.find((r) => r.key === row.key);
      assert.ok(drawn, `${section.key}: ${row.key} is not in the years table`);
      const recorded = new Set(row.years.map((y) => y.year));
      table.years.forEach((year, at) =>
        assert.equal(
          drawn.filled[at],
          recorded.has(year),
          `${section.key}: ${row.key} in ${year} does not match its record`,
        ),
      );
      assert.equal(
        drawn.opens,
        row.years.length > 1,
        `${row.key}: opens wrongly`,
      );
      if (!opened && row.years.length >= 3) opened = { section, row };
    }
  }
  assert.ok(opened, "no figure in this place has three years on record");
  const { section, row } = opened;
  await page
    .locator(`.roster-screen.metrics-board .roster [data-key="${section.key}"]`)
    .click();
  await page.locator(`button.metrics-yrow[data-measure="${row.key}"]`).click();
  await page.locator(".metrics-timeline svg.trend-line").waitFor();
  if (shots) await page.screenshot({ path: `${shots}/timeline.png` });
  const line = await page.evaluate(() => ({
    points: document.querySelectorAll(".metrics-timeline .trend-point").length,
    values: [
      ...document.querySelectorAll(".metrics-timeline .trend-value"),
    ].map((t) => t.textContent),
    years: [...document.querySelectorAll(".metrics-timeline .trend-year")].map(
      (t) => Number(t.textContent),
    ),
    path: Boolean(document.querySelector(".metrics-timeline .trend-path")),
  }));
  const shown = row.years.slice(-10);
  console.log(
    `${section.key} · ${row.key}: ${line.years.join(", ")} → ${line.values.join(", ")}`,
  );
  assert.ok(line.path, "the timeline has no line");
  assert.equal(line.points, shown.length);
  assert.deepEqual(
    line.years,
    shown.map((y) => y.year),
  );
  assert.ok(
    line.values.every((v) => v.trim()),
    "a year's value is not written",
  );
  await page.locator(".metrics-tl-close").click();
  await page.locator(".metrics-years").waitFor();
  assert.equal(await page.locator(".metrics-timeline").count(), 0);
  assert.deepEqual(errors, []);
  console.log("metrics timeline: pass");
} finally {
  await browser.close();
}
