/* global process, console, document */
// Metrics never scrolls as a page, and clicking a measure opens its timeline (owner, Nov 12 and
// Nov 16: "Metrics scrolls; no graphs on click"), in a drawn place at 1440x900: every area's
// page fits the panel, and every measure with a history draws a thin line with each value
// written on it, and no bars or pies.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
try {
  await startLife(page, { fresh: true });
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((b) => b.click());
  await page.locator("#sheet button", { hasText: "Metrics" }).first().click();
  const areas = page.locator(".roster-screen.metrics .roster-row");
  await areas.first().waitFor();
  const total = await areas.count();
  let timelines = 0;
  for (let area = 0; area < total; area++) {
    await areas.nth(area).click();
    const rows = page.locator(".metric-rows .metric-row");
    await rows.first().waitFor();
    const fit = await page.evaluate(() => {
      const body = document.getElementById("sheet-body");
      return { all: body.scrollHeight, shown: body.clientHeight };
    });
    assert.ok(
      fit.all <= fit.shown + 1,
      `area ${area} scrolls as a page: ${fit.all} over ${fit.shown}`,
    );
    for (let at = 0; at < (await rows.count()); at++) {
      const key = await rows.nth(at).getAttribute("data-key");
      await rows.nth(at).click();
      await page.waitForSelector(`.metrics-page[data-measure="${key}"]`);
      const drawn = await page.evaluate(() => ({
        values: document.querySelectorAll(".metric-timeline text.trend-value")
          .length,
        years: document.querySelectorAll(".metric-timeline text.trend-year")
          .length,
        lines: document.querySelectorAll(".metric-timeline polyline").length,
        bars: document.querySelectorAll(
          ".metric-timeline rect, .metric-timeline path[d], .metric-timeline circle:not(.trend-dot)",
        ).length,
      }));
      assert.equal(drawn.bars, 0, `${key}: bars or pies drawn`);
      if (drawn.lines) {
        timelines++;
        assert.ok(
          drawn.values >= 2 && drawn.values === drawn.years,
          `${key}: each year needs its value written on the line`,
        );
      }
    }
  }
  assert.ok(timelines > 0, "no measure opened a timeline");
  console.log(
    `metrics-timeline: ${total} areas fit, ${timelines} timelines drawn`,
  );
} finally {
  await browser.close();
}
