/* global process, console, document, performance, URL */
// Faces are on screen the moment a menu opens (owner, Oct 29: "It shouldn't
// take 5 seconds after you open a menu for it to load. It should be there
// instantly"), on the bench (npm run bench): a new life in a place drawn from
// all 56. People and Politics → Government are opened as soon as the rail
// shows; 300 milliseconds after each sheet's faces are placed, every face
// must have its picture.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shots = process.env.FACE_SHOTS;
const WITHIN = 300;
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await ready;
  // Every picture the page loads is kept in the timings, not only the first 250.
  await page.evaluate(() => performance.setResourceTimingBufferSize(100000));
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  console.log("Seed:", new URL((await made).url()).searchParams.get("seed"));
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  await page.locator("#rings").waitFor({ state: "visible" });
  for (const tab of ["people", "politics"]) {
    await page.locator(`#rings [data-tab="${tab}"]`).click();
    // The sheet is open when its faces are placed.
    await page.waitForFunction(
      () => document.querySelector("#sheet:not([hidden]) .headshot") !== null,
    );
    await page.waitForTimeout(WITHIN);
    const faces = await page.evaluate(() => {
      const loaded = new Set(
        performance.getEntriesByType("resource").map((e) => new URL(e.name)),
      );
      return [...document.querySelectorAll("#sheet .headshot")]
        .map((h) => h.style.backgroundImage.match(/url\("(.*)"\)/)?.[1])
        .filter(Boolean)
        .map((url) => ({
          url,
          loaded: [...loaded].some(
            (e) => e.pathname + e.search === url.replace(/&amp;/g, "&"),
          ),
        }));
    });
    const missing = faces.filter((face) => !face.loaded);
    console.log(
      `${tab}: ${faces.length - missing.length} of ${faces.length} faces drawn ${WITHIN} ms after the sheet opened`,
    );
    if (shots) await page.screenshot({ path: `${shots}/faces-${tab}.png` });
    assert.deepEqual(
      missing.map((face) => face.url),
      [],
      `${tab}: faces still loading ${WITHIN} ms after the sheet opened`,
    );
    await page.locator('[data-testid="sheet-close"]').click();
    await page.locator("#sheet").waitFor({ state: "hidden" });
  }
  assert.deepEqual(errors, [], "page errors");
} finally {
  await browser.close();
}
