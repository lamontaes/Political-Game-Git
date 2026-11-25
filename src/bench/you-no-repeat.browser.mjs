/* global process, console, document */
// The You screen has no section that repeats its own Your life tab, in a real browser on the
// bench (npm run bench) (owner, Nov 23, C15: "My life" repeats the "Your life" tab word for
// word): none of You's section headings names the life.
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
    .locator('#rings [data-tab="who"]')
    .first()
    .evaluate((tab) => tab.click());
  await page.locator("#sheet-body .secbody").first().waitFor();
  const you = await page.evaluate(() => ({
    headings: [...document.querySelectorAll("#sheet-body .sechead")].map((h) =>
      h.textContent.trim(),
    ),
    text: document.getElementById("sheet-body").innerText,
  }));
  for (const heading of you.headings)
    assert.ok(!/\blife\b/i.test(heading), `You has a heading "${heading}"`);
  console.log(
    `ok: You has ${you.headings.length} sections, none repeating its Your life tab`,
  );
} finally {
  await browser.close();
}
