/* global process, console, document, MutationObserver, window */
// The loading card shows the loading messages, not one changing line (owner, Nov 16 playtest;
// issue #9995 stop 9). A new world is started in a real browser; the card's lines are collected
// as the build runs, and every build step's message must have been listed by the end, in the
// build's order, with no step skipped because it finished between two polls.
// Run against a fresh bench: node src/bench/loading-messages.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import controls from "./data/controls.json" with { type: "json" };

const shots = process.argv[2];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(300000);
const errors = [];
// Story writes the real pools into controls.json; this check serves its own so it proves the
// cycling whatever the bank holds, and no test line ships.
const TEST_POOL = ["test line one", "test line two", "test line three"];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.route("**/api/controls", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.loadingLines = { ...body.loadingLines, warmup: TEST_POOL };
    await route.fulfill({ response, json: body });
  });
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const wanted = Object.values(controls.loading);
  await page.evaluate(() => {
    window.__seen = [];
    window.__quips = [];
    window.__most = 0;
    new MutationObserver(() => {
      const lines = [
        ...document.querySelectorAll("#front-status span:not(.quip)"),
      ].map((n) => n.textContent);
      for (const q of document.querySelectorAll("#front-status .quip"))
        if (!window.__quips.includes(q.textContent))
          window.__quips.push(q.textContent);
      window.__most = Math.max(window.__most, lines.length);
      for (const line of lines)
        if (!window.__seen.includes(line)) window.__seen.push(line);
    }).observe(document.getElementById("front-status"), {
      childList: true,
      subtree: true,
    });
  });
  await page.locator("#new-life").click();
  if (await page.locator("#new-advanced").isVisible())
    await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  // Mid-build: more than one message is on the card at once.
  await page.waitForFunction(() => window.__most >= 3);
  // The card is named for the game until the world names a place, never a leftover panel name.
  const heading = (
    await page.locator("#front > .title").innerText()
  ).toLowerCase();
  assert.notEqual(heading, "advanced", "the loading card still says Advanced");
  assert.notEqual(heading, "new game", "the loading card still says New game");
  if (shots) await page.screenshot({ path: `${shots}/loading-messages.png` });
  await page.locator("#front-status .quip").first().waitFor();
  if (shots) await page.screenshot({ path: `${shots}/loading-quip.png` });
  await page.waitForFunction(() =>
    document.querySelector("#loading-story:not([hidden])"),
  );
  const seen = await page.evaluate(() => window.__seen);
  console.log(seen.join(" | "));
  assert.ok(wanted.length >= 10, "the loading messages were not read");
  assert.deepEqual(
    seen,
    wanted,
    "the card must list every loading message in order",
  );
  // The dry lines (controls.loadingLines): the two-months step shows its own, never twice.
  const quips = await page.evaluate(() => window.__quips);
  const pool = TEST_POOL;
  assert.ok(quips.length >= 1, "the two-months step showed no dry line");
  assert.equal(new Set(quips).size, quips.length, "a dry line showed twice");
  for (const line of quips)
    assert.ok(pool.includes(line), `${line} not in pool`);
  assert.deepEqual(errors, []);
  console.log("loading-messages: ok");
} finally {
  await browser.close();
}
