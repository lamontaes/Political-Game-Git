/* global process, console, document, URL */
// Options, the pause Escape opens, stays open when the opening's scene comes due, and Quit to
// title returns to the title (the desktop smoke test's step, desktop/scripts/smoke-test.mjs).
// A scene closes the cards left open while the day ran (owner, Nov 16: "I think I'm stuck...
// I pressed escape"), never the pause the player asked for. Fails if Options is gone once the
// opening's talk opens, if Quit to title does not reach the title, or on a page error. On a
// fresh bench (npm run bench); BENCH_SEED replays a world. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/options-stays-over-scene.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const [shots] = process.argv.slice(2);
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(240000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
if (process.env.BENCH_SEED)
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("seed", process.env.BENCH_SEED);
    return route.continue({ url: url.toString() });
  });

try {
  const title = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/title",
  );
  await page.goto(`${base}/play`);
  await title;
  const built = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
  );
  // The smoke test's road: New game, Advanced, a new world.
  await page.getByTestId("new-game").click();
  await page.getByTestId("advanced").click();
  await page.getByTestId("new-world").click();
  console.log("Seed:", new URL((await built).url()).searchParams.get("seed"));
  await page.waitForFunction(() => document.getElementById("front")?.hidden);
  // Escape the moment play shows, before the opening's scene has come due.
  await page.keyboard.press("Escape");
  await page.locator("#sheet:not([hidden])").waitFor();
  // The opening's talk is staged while Options is up (it shows once Options closes).
  await page.locator("#talk:not([hidden])").waitFor({ state: "attached" });
  await page.waitForTimeout(1500);
  const sheetOpen = await page.evaluate(
    () => !document.getElementById("sheet").hidden,
  );
  if (shots) await page.screenshot({ path: `${shots}/options-over-scene.png` });
  assert.ok(sheetOpen, "the opening's scene closed Options");
  await page.getByTestId("quit-to-title").click();
  await page.getByTestId("title-menu").waitFor();
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "PASS Options stays over the opening's scene, and Quit to title works",
  );
} finally {
  await browser.close();
}
