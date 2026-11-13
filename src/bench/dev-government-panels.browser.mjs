/* global console, URL, process, document */
// With Dev mode on, Government carries the Bills and Bribe panels whole: no .dev-only box overlaps a
// member card or runs past the sheet, at the town's body and at the state legislature.
// Run against a fresh bench: node src/bench/dev-government-panels.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
import { devModeOn } from "./dev-setup.mjs";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (new URL(r.url()).pathname === "/api/newlife")
    console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
});
const check = async (when) => {
  await page.locator(".dev-bills").waitFor();
  await page.waitForTimeout(1500);
  const bad = await page.evaluate(() => {
    const box = (n) => n.getBoundingClientRect();
    const sheet = box(document.querySelector("#sheet"));
    // A card shows only inside its pager box, which scrolls the rest out of sight.
    const cards = [...document.querySelectorAll(".member-card")]
      .map((n) => {
        const c = box(n);
        const p = n.closest(".pager") ? box(n.closest(".pager")) : null;
        return p
          ? {
              left: c.left,
              right: c.right,
              top: Math.max(c.top, p.top),
              bottom: Math.min(c.bottom, p.bottom),
            }
          : c;
      })
      .filter((c) => c.bottom > c.top);
    const out = [];
    for (const node of document.querySelectorAll(".dev-only")) {
      const b = box(node);
      if (b.bottom > sheet.bottom + 1 || b.right > sheet.right + 1)
        out.push(`${node.className} runs past the sheet`);
      for (const c of cards)
        if (
          b.left < c.right &&
          c.left < b.right &&
          b.top < c.bottom &&
          c.top < b.bottom
        )
          out.push(`${node.className} overlaps a member card`);
    }
    return out;
  });
  if (bad.length && shots) await page.screenshot({ path: `${shots}/fail.png` });
  assert.deepEqual(bad, [], `${when}: ${bad.join("; ")}`);
};
try {
  await startLife(page, { fresh: true });
  await devModeOn(page);
  console.log("Place:", await page.locator("#card-place").innerText());
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await check("the town's body");
  if (shots)
    await page.screenshot({ path: `${shots}/dev-government-town.png` });
  await page
    .locator("#sheet-body button", { hasText: /^State$/ })
    .first()
    .click();
  await check("the state legislature");
  if (shots)
    await page.screenshot({ path: `${shots}/dev-government-state.png` });
  assert.deepEqual(errors, []);
  console.log(
    "PASS Bills and Bribe sit whole beside the members at the town and the state",
  );
} finally {
  await browser.close();
}
