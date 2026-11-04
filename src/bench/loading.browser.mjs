/* global process, console, document, URL, window, getComputedStyle */
// Loading worth watching, in a real browser on the bench (npm run bench):
// New Game in a place chosen in the creator (LOAD_PLACE "State|Town", default
// Storrs, Connecticut, the fixed town for path 3) shows, while the first scene is drawn, the world's story panel: a
// year counter that moves, journal lines and headlines that appear, and a
// state map whose counties fill in. At 1440x900, 1280x800 and 1024x768 the
// panel sits inside the window, nothing is drawn past it and nothing in it
// scrolls. LOAD_SHOTS saves a
// picture per size.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
// The place, as the creator names it: state, then town.
const [state, town] = (process.env.LOAD_PLACE ?? "Connecticut|Storrs").split(
  "|",
);
const shots = process.env.LOAD_SHOTS;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(300000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(`${base}/play`);
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-character:not([hidden])").waitFor();
  await page.locator("[data-gender=female]").click();
  await page.locator("#cr-random-name").click();
  await page.waitForFunction(() => document.getElementById("cr-given").value);
  await page.locator("#cr-character-next").click();
  await page.locator('[data-testid="state-search"]').fill(state);
  await page.locator("#cr-states button", { hasText: state }).first().click();
  await page.locator('[data-testid="place-search"]').fill(town);
  await page.locator("#cr-towns button", { hasText: town }).first().click();
  await page.locator("#cr-look:not([hidden])").waitFor();
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#cr-begin").click();
  await page.locator("#loading-story:not([hidden])").waitFor();
  const firstYear = await page.locator("#loading-year").innerText();
  // Two journal entries written, then the counter has moved.
  await page.waitForFunction(
    () => document.querySelectorAll("#loading-journal p").length >= 2,
  );
  const sizes = [
    [1440, 900],
    [1280, 800],
    [1024, 768],
  ];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    const fit = await page.evaluate(() => {
      const panel = document.getElementById("loading-story");
      const box = panel.getBoundingClientRect();
      const journal = document.getElementById("loading-journal");
      return {
        inside:
          box.left >= 0 &&
          box.top >= 0 &&
          box.right <= window.innerWidth &&
          box.bottom <= window.innerHeight,
        journalScrollbar: getComputedStyle(journal).overflowY !== "hidden",
        counties: document.querySelectorAll("#loading-map .county").length,
        filled: document.querySelectorAll("#loading-map .county:not(.unfilled)")
          .length,
        lines: document.querySelectorAll("#loading-journal p").length,
        year: document.getElementById("loading-year").textContent,
        // Anything drawn past the panel's foot or sides (the journal lets
        // its oldest lines go off the top by design).
        over: [...panel.querySelectorAll("*")]
          .filter((n) => {
            const r = n.getBoundingClientRect();
            // A shape's hover title has no box.
            if (!r.width && !r.height) return false;
            return (
              r.bottom > box.bottom + 0.5 ||
              r.right > box.right + 0.5 ||
              r.left < box.left - 0.5
            );
          })
          .map((n) => `${n.tagName}.${n.getAttribute("class")}`),
      };
    });
    console.log(`${width}x${height}`, JSON.stringify(fit));
    if (shots) await page.screenshot({ path: `${shots}/loading-${width}.png` });
    assert.ok(fit.inside, `${width}x${height}: the panel leaves the window`);
    assert.deepEqual(fit.over, [], `${width}x${height}: drawn past the panel`);
    assert.ok(!fit.journalScrollbar, `${width}x${height}: the journal scrolls`);
    assert.ok(fit.counties > 0, "no map");
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const place = (await (await made).json()).placeName;
  await page.locator("#loading-story").waitFor({ state: "hidden" });
  const lastYear = await page.locator("#loading-year").innerText();
  console.log(`Place: ${place} Years: ${firstYear} to ${lastYear}`);
  assert.notEqual(firstYear, lastYear, "the year counter never moved");
  assert.deepEqual(errors, []);
  console.log("PASS the loading screen plays the world's story at three sizes");
} finally {
  await browser.close();
}
