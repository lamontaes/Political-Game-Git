/* global process, console, document, localStorage */
// Inline glossary help, in a real browser on the bench (npm run bench): a civic term inside a
// sentence is underlined, hovering shows its short definition with Mark as learned, and marking
// it learned takes the underline off (owner, Nov 8: "I've never seen any of the inline helping
// stuff for the glossary").
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem("ocd-learned-terms");
    } catch {
      // Storage is optional.
    }
  });
  const guide = page.waitForResponse((r) => r.url().includes("/api/guide"));
  await page.goto(`${base}/play`);
  await guide;
  // Player text from the game's own screens is marked as it draws; the title's patch notes and
  // the Guide are the places a sentence can hold a term. Here one sentence is drawn on the title.
  await page.evaluate(() => {
    const line = document.createElement("p");
    line.id = "term-check";
    line.textContent =
      "The governor may use a veto after presentment, and a veto override needs more votes.";
    document.getElementById("front").append(line);
  });
  await page.locator("#term-check .term").first().waitFor();
  const marked = await page.locator("#term-check .term").allInnerTexts();
  console.log(`underlined: ${marked.join(" | ")}`);
  assert.ok(marked.length >= 2, "civic terms in a sentence are underlined");
  assert.ok(
    marked.some((text) => /veto override/i.test(text)),
    "the longest term wins: Veto override, not Veto",
  );
  const first = page.locator("#term-check .term").first();
  await first.hover();
  await page.locator("#tip:not([hidden])").waitFor();
  const tip = await page.locator("#tip").innerText();
  assert.ok(
    tip.trim().length > 30,
    "the tip shows the term and its definition",
  );
  assert.ok(
    await page.locator("#tip-learned").isVisible(),
    "Mark as learned is offered",
  );
  const before = await page.locator("#term-check .term").count();
  await page.locator("#tip-learned").click();
  const after = await page.locator("#term-check .term").count();
  assert.ok(after < before, "marking a term learned takes its underline off");
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  assert.deepEqual(errors, [], errors.join("; "));
  console.log(
    "PASS inline glossary: underline, definition on hover, Mark as learned",
  );
} finally {
  await browser.close();
}
