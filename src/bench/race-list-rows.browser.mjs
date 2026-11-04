/* global process, console, document, fetch, URL, URLSearchParams */
// The race list at the filing counter, in a real browser on the bench (npm run
// bench): a life in a drawn world (RACE_SEED, else a fresh one) plays week by
// week until the clerk's list offers two or more races, travels to the filing
// office, steps through the counter's talk to the races, and reads each race
// button's height at 1440x900, 1280x800 and 1024x768. Every race in the list
// is one height, even when a seat's label wraps (play.css,
// `#talk-choices:has(.reply-facts)`). RACE_SHOTS saves a picture per size.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { playOpening } from "./start-life.mjs";

const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const seed = process.env.RACE_SEED ?? `race-rows-${Date.now()}`;
const shots = process.env.RACE_SHOTS;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(`${base}/play`);
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#seed").fill(seed);
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-world").click();
  await playOpening(page, (await (await made).json()).sceneMomentId ?? null);
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  const place = await page.locator("#card-place").innerText();
  console.log(`Seed: ${seed} Place: ${place}`);
  // Weeks of play until the clerk's list holds two races or more.
  let weeks = 0;
  for (; weeks < 104; weeks += 1) {
    const open = await page.evaluate(
      async () =>
        ((await (await fetch("/api/government")).json()).contests ?? []).length,
    );
    if (open >= 2) break;
    await page.evaluate(async () => {
      let res = await fetch("/api/advance?mode=week", { method: "POST" });
      let body = await res.json();
      for (
        let stops = 0;
        res.ok &&
        body.packet &&
        !["complete", "choice"].includes(body.packet.kind) &&
        stops < 50;
        stops += 1
      ) {
        res = await fetch(
          `/api/resume?${new URLSearchParams({ pauseId: body.packet.pauseId ?? "" })}`,
          { method: "POST" },
        );
        body = await res.json();
      }
    });
  }
  assert.ok(weeks < 104, `${place}: no two races open in two years`);
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-clock")?.textContent.trim(),
  );
  // Travel, the filing office's card, then Go.
  await page
    .locator('[data-tab="travel"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".entries-tiles .entry-go").first().waitFor();
  await page
    .locator(".entry-go", { hasText: /Filing office/ })
    .first()
    .click();
  await page
    .locator("#sheet-body button", { hasText: /^\s*Go\s*$/ })
    .first()
    .click();
  await page.locator("#talk:not([hidden])").waitFor();
  // Through the counter's talk to the races.
  const talkState = () =>
    page.evaluate(
      () =>
        document.getElementById("talk-lines").textContent +
        document.getElementById("talk-choices").textContent,
    );
  for (let step = 0; step < 10; step += 1) {
    if (await page.locator("#talk-choices .reply-facts").count()) break;
    const before = await talkState();
    const replies = page.locator("#talk-choices .reply");
    if (!(await replies.count())) {
      await page
        .locator("#talk button:visible", { hasText: /Continue/ })
        .first()
        .click();
    } else {
      const texts = await replies.allInnerTexts();
      const pick = texts.findIndex((t) => /run|file|race|office/i.test(t));
      await replies.nth(Math.max(0, pick)).click();
    }
    // The talk moves on: its lines or replies change.
    await page.waitForFunction(
      (was) =>
        document.getElementById("talk-lines").textContent +
          document.getElementById("talk-choices").textContent !==
        was,
      before,
    );
  }
  const races = page.locator("#talk-choices .reply");
  assert.ok((await races.count()) >= 2, `${place}: the race list is short`);
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height });
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll("#talk-choices .reply")].map((b) => ({
        text: b.textContent.trim().slice(0, 60),
        height: Math.round(b.getBoundingClientRect().height),
      })),
    );
    console.log(`${width}x${height}`, rows.map((r) => r.height).join(" "));
    assert.equal(
      new Set(rows.map((r) => r.height)).size,
      1,
      `${place} at ${width}x${height}: ${JSON.stringify(rows)}`,
    );
    if (shots)
      await page.screenshot({ path: `${shots}/race-list-${width}.png` });
  }
  assert.deepEqual(errors, []);
  console.log("PASS every race in the list is one height at three sizes");
} finally {
  await browser.close();
}
