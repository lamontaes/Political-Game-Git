/* global process, console, document */
// Dev mode: a sentence of a life story opens its record in the Trace (pool item
// life-sentences-open-the-trace-in-dev-mode). Run against the bench (npm run bench) at 1440x900
// in a place drawn from all 56; the run prints its seed and place. Three sentences of My life
// ("Your life") open the Trace with dev mode on, and none takes a click with dev mode off.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const setDev = (on) =>
  page.evaluate((value) => {
    document.body.classList.toggle("dev", value);
  }, on);

/** Opens the first dock menu ("You") and its "Your life" tab. */
async function openMyLife() {
  await page.locator("#dock button").first().click();
  await page.locator("#sheet button", { hasText: "Your life" }).first().click();
}

try {
  const { seed, placeName } = await startLife(page, { fresh: true });
  console.log(`LIFE TRACE BROWSER: ${placeName}, seed ${seed}`);
  await setDev(false);
  await openMyLife();
  const sentences = page.locator("[data-record]");
  await sentences.first().waitFor();
  const total = await sentences.count();
  assert.ok(total >= 1, "My life tells at least one sentence");
  assert.equal(
    await page.locator(".dev-trace").count(),
    0,
    "no Trace with dev mode off",
  );
  assert.equal(
    await sentences.first().getAttribute("role"),
    null,
    "a sentence takes a click with dev mode off",
  );
  await page.keyboard.press("Escape");
  await setDev(true);
  await openMyLife();
  await sentences.first().waitFor();
  const opened = Math.min(3, await sentences.count());
  for (let i = 0; i < opened; i++) {
    const sentence = sentences.nth(i);
    const record = await sentence.getAttribute("data-record");
    await sentence.click();
    await page.waitForFunction(
      (id) =>
        document.querySelector(".dev-trace h4")?.textContent?.includes(id),
      record,
    );
  }
  await page.screenshot({
    path: process.argv[2] ?? "test-results/life-trace.png",
  });
  console.log(`PASS ${opened} sentences opened the Trace on their records`);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
