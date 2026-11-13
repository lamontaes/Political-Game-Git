/* global process, console, document, URLSearchParams */
// The journal is one cream page: "My life", the chapter's place and years, the story in
// paragraphs, paged by chapter without a scroll. A drawn place by default; PLACE_KEY and
// BENCH_SEED replay one. Run against a fresh bench: node src/bench/journal-page.browser.mjs [shot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const params = new URLSearchParams({
    seed: process.env.BENCH_SEED ?? `journal-${Date.now()}`,
  });
  if (process.env.PLACE_KEY) params.set("placeKey", process.env.PLACE_KEY);
  const made = await page.request.post(`${base}/api/newlife?${params}`, {
    timeout: 600000,
  });
  assert.equal(made.status(), 200, await made.text());
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    "Place:",
    await page.locator("#card-place").innerText(),
    "Seed:",
    params.get("seed"),
  );
  await page
    .locator('#rings [data-tab="journal"]')
    .first()
    .evaluate((e) => e.click());
  // The Nov 8 play mock (pl-journal): "My story" lists the chapters, the chosen chapter is
  // its title over the story in prose.
  await page.locator(".journal-text").waitFor();
  assert.equal(
    await page.locator("#sheet-body .sechead").first().textContent(),
    "My story",
  );
  assert.ok(
    (await page.locator(".journal-text .intro").count()) > 0,
    "the chapter tells the story",
  );
  // Nothing scrolls as a page.
  const scrolls = await page.evaluate(() => {
    const body = document.getElementById("sheet-body");
    return body.scrollHeight > body.clientHeight + 1;
  });
  assert.equal(scrolls, false, "the sheet body scrolls");
  if (shots) await page.screenshot({ path: `${shots}/journal.png` });
  const chapters = page.locator("#sheet-body .roster-row");
  if ((await chapters.count()) > 1) {
    const first = await page.locator(".journal-text").innerText();
    await chapters.first().click();
    assert.notEqual(await page.locator(".journal-text").innerText(), first);
    if (shots) await page.screenshot({ path: `${shots}/journal-earlier.png` });
  }
  assert.deepEqual(errors, []);
  console.log("PASS the journal lists its chapters and tells the chosen one");
} finally {
  await browser.close();
}
