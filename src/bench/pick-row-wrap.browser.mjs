/* global process, console, document */
// A list row with a long name and an aside keeps its words whole, in a real browser on the bench
// (npm run bench) (owner, Nov 16, N16-58: "it's squished right here"): in a 290 px list, "Council
// member (District 2) · County office" with "Filing opens April 3, 2026" takes at most two lines
// and the aside sits under it, rather than the name breaking down to one word a line.
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
    .evaluate((tab) => tab.click());
  await page.locator("#sheet button", { hasText: "Elections" }).first().click();
  await page.locator("#sheet-body .pick-list").first().waitFor();
  const shape = await page.evaluate(() => {
    const list = document.createElement("nav");
    list.className = "pick-list";
    list.style.width = "290px";
    const row = document.createElement("button");
    row.className = "pick";
    row.innerHTML =
      "<b>Council member (District 2) · County office</b><span>Filing opens April 3, 2026</span>";
    list.append(row);
    document.getElementById("sheet-body").append(list);
    const name = row.querySelector("b").getBoundingClientRect();
    const aside = row.querySelector("span").getBoundingClientRect();
    const line =
      parseFloat(getComputedStyle(row.querySelector("b")).fontSize) * 1.3;
    const result = {
      lines: Math.round(name.height / line),
      under: aside.top >= name.bottom - 2,
    };
    list.remove();
    return result;
  });
  assert.ok(shape.lines <= 2, `the name takes ${shape.lines} lines`);
  assert.ok(shape.under, "the aside does not sit under the name");
  console.log(
    "ok: a long list row keeps its name whole and its aside under it",
  );
} finally {
  await browser.close();
}
