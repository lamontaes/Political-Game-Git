/* global process, console, document, URL */
// Buttons in a row share one size (owner, Oct 24), in a real browser on the
// bench (npm run bench) at 1440x900: the title menu, New game, the creator, a
// menu sheet and the talk box at a filing counter, in a place drawn from all
// 56. Every visible button that shares a row with others has their height.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const shots = process.env.BUTTON_SHOTS;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const found = [];
/** Each row of visible buttons (one parent) with its distinct heights. */
async function rows(screen) {
  const read = await page.evaluate(() => {
    const byParent = new Map();
    // The game's controls: actions, menu entries, title items, sheet buttons.
    for (const b of document.querySelectorAll(
      "button.action, button.item, button.nav-item, #sheet-body button, #talk button",
    )) {
      if (!b.checkVisibility() || b.closest("[hidden]")) continue;
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const row = byParent.get(b.parentElement) ?? [];
      row.push({
        text: b.textContent.trim().slice(0, 24),
        h: Math.round(r.height),
      });
      byParent.set(b.parentElement, row);
    }
    return [...byParent.values()]
      .filter((row) => row.length > 1)
      .map((row) => ({
        heights: [...new Set(row.map((b) => b.h))],
        texts: row.map((b) => `${b.text} ${b.h}`),
      }));
  });
  for (const row of read)
    if (row.heights.length > 1)
      found.push(`${screen}: ${row.texts.join(" | ")}`);
  console.log(`${screen}: ${read.length} rows`);
  if (shots)
    await page.screenshot({
      path: `${shots}/${screen.replace(/\W+/g, "-").toLowerCase()}.png`,
    });
}
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  await rows("Title");
  await page.locator("#new-life").click();
  await page.waitForTimeout(300);
  await rows("New game");
  await page.locator("#new-start").click();
  await page.locator("#cr-character:not([hidden])").waitFor();
  await rows("Creator");
  await page.goto(`${base}/play`);
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  console.log("Seed:", new URL((await made).url()).searchParams.get("seed"));
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  await rows("Home");
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet-body").waitFor();
  await page.waitForTimeout(800);
  await rows("Politics");
  await page
    .locator('[data-tab="travel"]')
    .first()
    .evaluate((e) => e.click());
  const go = page.locator("#sheet-body button", { hasText: /Go/ });
  await go.first().waitFor();
  for (let i = 0; i < (await go.count()); i++) {
    await go.nth(i).click();
    if (
      await page
        .locator("#talk:not([hidden])")
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false)
    )
      break;
  }
  await page.waitForTimeout(800);
  await rows("Talk box");
  for (const line of found) console.log(line);
  assert.deepEqual(found, [], "buttons in one row differ in height");
  assert.deepEqual(errors, []);
  console.log("PASS every row of buttons shares one height");
} finally {
  await browser.close();
}
