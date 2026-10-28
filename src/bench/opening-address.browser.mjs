/* global process, console, URL */
// The opening (wire-opening-and-home, engine map line 1): a new life opens on
// the President's address in the talk box, staged by the director as the
// `address` scene at home, in the President's own recorded words, with one
// Continue and no talk. Run against a fresh bench:
// node src/bench/opening-address.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(600000);
    page.on("pageerror", (e) => errors.push(e.message));
    const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
    await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
    await ready;
    const made = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
    );
    await page.locator("#new-life").click();
    if (await page.locator("#new-advanced").isVisible())
      await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    const life = await (await made).json();
    console.log(
      "Seed:",
      new URL((await made).url()).searchParams.get("seed"),
      "Place:",
      life.placeName,
      "Scene:",
      life.sceneMomentId,
    );
    assert.ok(
      life.sceneMomentId,
      "the director staged no scene for the opening",
    );
    assert.match(life.sceneMomentId, /president\.address/);
    await page.locator("#talk").waitFor({ state: "visible" });
    const said = await page.locator("#talk").innerText();
    console.log(
      `${width}x${height}:`,
      said.slice(0, 300).replace(/\n/g, " | "),
    );
    assert.ok(said.length > 80, "the talk box says the address");
    if (shots)
      await page.screenshot({
        path: `${shots}/opening-address-${width}x${height}.png`,
      });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log("opening address: pass");
} finally {
  await browser.close();
}
