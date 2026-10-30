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
  await page.locator(".journal-page").waitFor();
  assert.equal(await page.locator(".journal-page h2").innerText(), "My life");
  assert.match(
    await page.locator(".journal-chapter").innerText(),
    /^Chapter \w+ ·/,
  );
  assert.ok(
    (await page.locator(".journal-page p:not(.journal-chapter)").count()) > 0,
    "the page tells the story",
  );
  // Nothing scrolls as a page: the page and its pager sit inside the sheet body.
  const fit = await page.evaluate(() => {
    const body = document.getElementById("sheet-body");
    const paper = document.querySelector(".journal-page");
    return {
      scrolls: body.scrollHeight > body.clientHeight + 1,
      inside: paper.scrollHeight <= paper.clientHeight + 1,
    };
  });
  assert.equal(fit.scrolls, false, "the sheet body scrolls");
  assert.equal(fit.inside, true, "the chapter overflows its page");
  if (shots) await page.screenshot({ path: `${shots}/journal.png` });
  const chapters = await page.locator(".journal-pager:visible").count();
  if (chapters) {
    const first = await page.locator(".journal-page").innerText();
    await page.getByRole("button", { name: "Earlier chapter" }).click();
    assert.notEqual(await page.locator(".journal-page").innerText(), first);
    if (shots) await page.screenshot({ path: `${shots}/journal-earlier.png` });
  }
  assert.deepEqual(errors, []);
  console.log("PASS the journal is one page of story, paged by chapter");
} finally {
  await browser.close();
}
