/* global process, console, document */
// A budget department's row keeps its whole name and its head, in a real browser on the bench
// (npm run bench) (carryover N16-66: "a cut-off budget label; heads on only some rows"): in the
// department list a name as long as "Housing and community development" with a head under it
// is not cut off and the head does not run out of its row.
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
  await page.locator("#sheet button", { hasText: "Budgets" }).first().click();
  await page.locator(".bsdept").first().waitFor();
  const shape = await page.evaluate(() => {
    const model = document.querySelector(".bsdept");
    const row = model.cloneNode(true);
    row.classList.remove("sel");
    row.querySelector("b").textContent = "Housing and community development";
    row.querySelector("em").textContent = "$1.5 billion";
    const head = row.querySelector("span") ?? document.createElement("span");
    head.textContent = "Jeffrey Summers";
    row.append(head);
    model.parentElement.append(row);
    const name = row.querySelector("b");
    const result = {
      clipped: name.scrollHeight > name.clientHeight + 1,
      headOut:
        head.getBoundingClientRect().bottom >
        row.getBoundingClientRect().bottom + 1,
      grew:
        row.scrollHeight <= Math.ceil(row.getBoundingClientRect().height) + 1,
    };
    row.remove();
    return result;
  });
  assert.equal(shape.clipped, false, "the department name is cut off");
  assert.equal(shape.headOut, false, "the head runs out of its row");
  assert.equal(shape.grew, true, "the row does not grow to its content");
  console.log("ok: a long department name with a head is whole inside its row");
} finally {
  await browser.close();
}
