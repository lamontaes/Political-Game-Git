/* global process, console, fetch */
// Dev mode's "The country in 20 years", from the Calendar in a real browser on the bench
// (npm run bench) at 1440x900, in a place drawn from all 56 (the run prints its seed and place):
// press the button, read the took line, the verdict and the table (Today, then years 1, 5, 10,
// 15, 20), and see that the game's date did not move.
// Run against a fresh bench: node src/bench/dev-outlook.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const { seed, placeName } = await startLife(page, { fresh: true });
  console.log(`DEV OUTLOOK BROWSER: ${placeName}, seed ${seed}`);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "On", exact: true }).last().click();
  await page.locator("#sheet-close").click();
  await page.locator("#dock button").nth(2).click();
  await page.locator('[data-testid="dev-outlook"]').waitFor();
  // On a new game's first day the economy has not opened: the section says so in words.
  await page.locator('[data-testid="dev-outlook"]').click();
  await page.locator(".dev-outlook").getByText("Run one day").waitFor();
  console.log(await page.locator(".dev-outlook").innerText());
  await page.evaluate(async () => {
    await fetch("/api/dev/run-until", {
      method: "POST",
      body: JSON.stringify({ days: 1, cap: 2 }),
    });
  });
  const dateBefore = await page.evaluate(
    async () => (await (await fetch("/api/dev/state")).json()).date,
  );
  await page.locator('[data-testid="dev-outlook"]').click();
  await page.locator('[data-testid="dev-outlook-table"]').waitFor();
  // A picture of the section when the caller names a file for it.
  if (process.env.OUTLOOK_SHOT)
    await page
      .locator(".dev-outlook")
      .screenshot({ path: process.env.OUTLOOK_SHOT });
  const text = await page.locator(".dev-outlook").innerText();
  console.log(text);
  const rows = await page
    .locator('[data-testid="dev-outlook-table"] tr')
    .allInnerTexts();
  assert.equal(rows.length, 7, `${placeName}, seed ${seed}: header + 6 rows`);
  assert.match(text, /Took [\d.]+ seconds/);
  assert.match(text, /Every count stayed possible\./);
  assert.doesNotMatch(text, /\d{4}-\d{2}-\d{2}/, "no ISO dates");
  const dateAfter = await page.evaluate(
    async () => (await (await fetch("/api/dev/state")).json()).date,
  );
  assert.equal(dateAfter, dateBefore, "the game's date did not move");
  assert.deepEqual(errors, []);
  console.log("DEV OUTLOOK BROWSER: passed");
} finally {
  await browser.close();
}
