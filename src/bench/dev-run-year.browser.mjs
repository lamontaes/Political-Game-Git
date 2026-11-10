/* global process, console, fetch */
// Dev mode's "Skip years" in a real browser on the bench (npm run bench) at 1440x900: press
// "Skip 1 year", read the year line, the seconds and the verdict, and see the date move a year.
// SKIP_SHOT_BEFORE / SKIP_SHOT_AFTER name the screenshot files.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const browser = await chromium.launch(
  process.env.BENCH_BROWSER
    ? { executablePath: process.env.BENCH_BROWSER }
    : {},
);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(180000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const date = () =>
  page.evaluate(
    async () => (await (await fetch("/api/dev/state")).json()).date,
  );
try {
  const { seed, placeName } = await startLife(page, { fresh: true });
  console.log(`DEV SKIP BROWSER: ${placeName}, seed ${seed}`);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "On", exact: true }).last().click();
  await page.locator("#sheet-close").click();
  await page.locator("#dock button").nth(2).click();
  await page.locator('[data-testid="dev-skip-1"]').waitFor();
  await page.evaluate(async () => {
    await fetch("/api/dev/run-until", {
      method: "POST",
      body: JSON.stringify({ days: 3, cap: 4 }),
    });
  });
  const before = await date();
  if (process.env.SKIP_SHOT_BEFORE)
    await page
      .locator(".dev-skip")
      .screenshot({ path: process.env.SKIP_SHOT_BEFORE });
  await page.locator('[data-testid="dev-skip-1"]').click();
  await page
    .getByText(/Every count stayed possible|Some counts could not be/)
    .waitFor({ timeout: 90000 })
    .catch(async (e) => {
      console.log(await page.locator(".dev-skip").innerText());
      throw e;
    });
  if (process.env.SKIP_SHOT_AFTER)
    await page
      .locator(".dev-skip")
      .screenshot({ path: process.env.SKIP_SHOT_AFTER });
  const text = await page.locator(".dev-skip").innerText();
  console.log(text);
  const after = await date();
  assert.equal(
    Date.parse(after) - Date.parse(before),
    365 * 864e5,
    `${placeName}, seed ${seed}: ${before} to ${after}`,
  );
  assert.match(text, /Year 1 of 1 done/);
  assert.match(text, /Took [\d.]+ seconds/);
  assert.match(text, /born/);
  assert.doesNotMatch(text, /\d{4}-\d{2}-\d{2}/, "no ISO dates");
  assert.deepEqual(errors, []);
  console.log("DEV SKIP BROWSER: passed");
} finally {
  await browser.close();
}
