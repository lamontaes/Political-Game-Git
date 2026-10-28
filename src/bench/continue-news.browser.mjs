/* global document, console, URL, URLSearchParams, process */
// Continue on the opening evening keeps the first night's paper on the table:
// a new life's reader, then the same life reloaded and continued at the same
// date, reads the same kept stories and every unemployment rate they carry. Run with
// BENCH_PORT and BENCH_BROWSER; BENCH_SHOT names a screenshot prefix and
// BENCH_SEED a world to replay.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const port = process.env.BENCH_PORT ?? "3000";
const shot = process.env.BENCH_SHOT;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
/** The reader's sentences that give a rate, as the player sees them. */
const readRates = async () => {
  await page.locator("#news-surface").click();
  await page.locator("#news-reader:not([hidden])").waitFor();
  const lines = await page
    .locator("#news-reader .prose, #news-reader .speech")
    .allInnerTexts();
  return lines.filter((text) => /unemployment/i.test(text) && /\d/.test(text));
};
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${port}/play`);
  await ready;
  let seed = process.env.BENCH_SEED;
  let fresh;
  let clock;
  if (seed) {
    // A named world (the observed Juntura, Oregon life), built as Continue
    // finds it: the opening evening, the paper never picked up.
    const made = await page.request.post(
      `http://localhost:${port}/api/newlife?${new URLSearchParams({ seed })}`,
      { timeout: 300000 },
    );
    assert.equal(made.status(), 200);
  } else {
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 300000 },
    );
    await page.locator("#new-life").click();
    if (await page.locator("#new-advanced").isVisible())
      await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    const r = await response;
    assert.equal(r.status(), 200);
    seed = new URL(r.url()).searchParams.get("seed");
    await page.locator("#news-surface:not([hidden])").waitFor();
    clock = await page.locator("#card-clock").innerText();
    fresh = await readRates();
    console.log("Fresh reader rates:", fresh);
    assert.ok(fresh.length > 0, "the first-night reader gives a rate");
    if (shot) await page.screenshot({ path: `${shot}-fresh.png` });
  }

  // The same life, reloaded and continued at the same date.
  const again = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.reload();
  await again;
  await page.locator("#front-continue:not([disabled])").waitFor();
  const opening = page
    .waitForResponse((r) => new URL(r.url()).pathname === "/api/opening", {
      timeout: 15000,
    })
    .catch(() => null);
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-clock").textContent.trim(),
  );
  const place = await page.locator("#card-place").innerText();
  const continuedClock = await page.locator("#card-clock").innerText();
  console.log("Place:", place, "Seed:", seed, "Date:", continuedClock);
  if (clock) assert.equal(continuedClock, clock, "Continue keeps the date");
  const onTable = await page
    .locator("#news-surface:not([hidden])")
    .waitFor({ timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (shot) await page.screenshot({ path: `${shot}-continued.png` });
  assert.ok(onTable, "the first night's paper is on the table after Continue");
  const kept = await (await opening)?.json();
  const continued = await readRates();
  console.log("Continued reader rates:", continued);
  assert.ok(continued.length > 0, "the continued reader gives a rate");
  if (fresh) assert.deepEqual(continued, fresh, "the same kept rates");
  // Each sentence the reader shows is the kept opening's record: the lead
  // story's printed paragraphs (or its broadcast and the address), then each
  // later story's headline.
  const [lead, ...later] = kept?.news?.stories ?? [];
  const headlineOf = (story) =>
    story.headline ?? story.lede ?? story.broadcast?.[0]?.text;
  const recorded = new Set(
    [
      ...(lead?.paragraphs ?? [
        ...(lead?.broadcast ?? []).map((line) => line.text),
        ...(kept?.news?.address ?? []),
      ]),
      ...later.map(headlineOf),
    ].filter(Boolean),
  );
  for (const text of continued)
    assert.ok(recorded.has(text), `kept in the opening record: ${text}`);
  // Every rate the kept paper carries is back: the nation's, and the
  // region's where the paper has one.
  const keptRates = [...recorded].filter(
    (text) => /unemployment/i.test(text) && /\d/.test(text),
  );
  for (const text of keptRates)
    assert.ok(
      continued.some((shown) => shown.includes(text) || text.includes(shown)),
      `the kept rate is shown again: ${text}`,
    );
  if (shot) await page.screenshot({ path: `${shot}-continued-reader.png` });
  console.log("PASS Continue keeps the first night's news on the table");
} finally {
  await browser.close();
}
