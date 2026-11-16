/* global process, URL, console */
// Dev mode's scene trace in a played life (src/bench/dev-views/scene-trace.ts): a new life at Sheridan
// WY (5669845), seed 7, dev mode on, the Calendar's dev panels. The panel lists every scene the
// director stages with its staged count, opens one scene's lines with the register's tie class, and
// names the scene dev mode cannot cause. Run against a fresh bench:
//   node src/bench/dev-scene-trace.browser.mjs [screenshot.png]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { devModeOn } from "./dev-setup.mjs";
import { playOpening } from "./start-life.mjs";

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("seed", "7");
    url.searchParams.set("placeKey", "5669845");
    return route.continue({ url: url.toString() });
  });
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  await playOpening(page, (await (await made).json()).sceneMomentId ?? null);
  await devModeOn(page);
  await page
    .locator('[data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  const panel = page.locator(".dev-scene-trace");
  await panel.waitFor();
  console.log("Title:", await panel.locator("h4").innerText());
  const types = panel.locator(".dev-scene-types");
  await types.locator("summary").first().click();
  const summary = await types.locator("summary").first().innerText();
  console.log("Types:", summary);
  assert.match(summary, /\(87\)/);
  const unreachable = await types.locator("p").first().innerText();
  console.log(unreachable);
  assert.match(unreachable, /polling-place/);
  // One scene's lines, each with its tie class.
  const first = types.locator("li").first();
  await first.locator("details > summary").click();
  await first.locator("details ul li").first().waitFor();
  const lines = await first.locator("details ul li").allInnerTexts();
  console.log(`First scene's lines: ${lines.length}; first three:`);
  for (const line of lines.slice(0, 3)) console.log(" -", line);
  assert.ok(lines.length > 0 && lines.every((l) => /\[.*\]/.test(l)));
  await panel.locator(".dev-scene-moments summary").click();
  console.log(
    "Staged:",
    await panel.locator(".dev-scene-moments summary").innerText(),
  );
  if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
  assert.deepEqual(errors, []);
  console.log("PASS the scene trace lists every scene and ties its lines");
} finally {
  await browser.close();
}
