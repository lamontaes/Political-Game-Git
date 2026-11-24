/* global process, console, document */
// The Journal's pop-up never shows a line alone that follows another, in a real browser on the
// bench (npm run bench) (owner, Nov 23, P20: "this strip at the bottom that says here, and then it
// says 2 years after that. What is this random stuff popping up?"). A life is started in a drawn
// place; the journal's answer then ends in one more line that links to the line before it (an
// edge case made by hand, as the real Journal links its lines by `link.earlierId`); the pop-up
// must carry the earlier line first.
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
  let earlierText = "";
  const ending = "Two years after that, my son was born.";
  await page.route("**/api/journal*", async (route) => {
    const chapters = await (await route.fetch()).json();
    const lines = chapters.at(-1).lines;
    earlierText = lines.at(-1).text;
    lines.push({
      ...lines.at(-1),
      id: "pop-up-lead-in-edge-case",
      text: ending,
      link: { by: "time", earlierId: lines.at(-1).id, days: 730 },
    });
    await route.fulfill({ json: chapters });
  });
  // Any play step makes the game ask the Journal again.
  await page.locator("#hour").click();
  await page.waitForFunction(
    (text) =>
      document.getElementById("journal-line").textContent.endsWith(text),
    ending,
  );
  const shown = await page.locator("#journal-line").innerText();
  assert.equal(
    shown,
    `${earlierText} ${ending}`,
    "the pop-up shows the line alone",
  );
  // A failed read of the Journal leaves the waiting pop-up in place (N16-24).
  await page.unroute("**/api/journal*");
  await page.route("**/api/journal*", (route) => route.abort());
  await page.locator("#hour").click();
  await page.waitForTimeout(1500);
  assert.equal(
    await page.locator("#journal-line").innerText(),
    shown,
    "a failed Journal read changed the pop-up",
  );
  console.log("ok: the pop-up carries the line it follows");
} finally {
  await browser.close();
}
