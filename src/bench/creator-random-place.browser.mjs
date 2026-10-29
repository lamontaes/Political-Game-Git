/* global process, console, document */
// Random place in the creator, in a real browser on the bench (npm run bench):
// the button on "Where are you from?" draws a state and town from all 56 and
// goes on to the look, which names the place; Change returns to the place
// stage (owner, Oct 28 sitting, point 4).
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
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-character:not([hidden])").waitFor();
  await page.locator("[data-gender=male]").click();
  await page.locator("#cr-random-name").click();
  await page.locator("#cr-given:not([value=''])").waitFor();
  await page.locator("#cr-character-next").click();
  await page.locator("#cr-place:not([hidden])").waitFor();
  const button = page.locator("#cr-place-random");
  const label = (await button.innerText()).trim();
  console.log(`button: "${label}"`);
  assert.ok(label.length > 0, "the Random button has no name");
  const drawn = page.waitForResponse((r) =>
    r.url().includes("/api/creator/place"),
  );
  await button.click();
  const place = await (await drawn).json();
  await page.locator("#cr-look:not([hidden])").waitFor();
  const named = (
    await page.locator("#cr-place-summary-name").innerText()
  ).trim();
  console.log(
    `drawn: ${place.town.name}, ${place.state.name}; look says "${named}"`,
  );
  assert.equal(
    named,
    place.town.name.includes(place.state.name)
      ? place.town.name
      : `${place.town.name}, ${place.state.name}`,
  );
  // The figure's preview is drawn by the server; the picture waits for it.
  await page.locator("#cr-portrait").evaluate((img) =>
    img.complete && img.naturalHeight > 0
      ? true
      : new Promise((done) => {
          img.onload = img.onerror = () => done(true);
        }),
  );
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/04-creator-random-place.png`,
    });
  // Change returns to the place stage, with the drawn state kept.
  await page.locator("#cr-place-summary").click();
  await page.locator("#cr-place:not([hidden])").waitFor();
  assert.equal(
    (await page.locator("#cr-state-name").innerText()).trim(),
    place.state.name,
  );
  // A second press draws again and reaches the look.
  await page.locator("#cr-place-random").click();
  await page.locator("#cr-look:not([hidden])").waitFor();
  // The panel grows with its content: the place line is paid for by the
  // figure's preview, which was 260px tall before it, so the stage is no
  // taller than it was (it already ran past a 900px window with ten rows).
  const fit = await page.evaluate(() => {
    const r = document.getElementById("front").getBoundingClientRect();
    return {
      height: r.height,
      line: document.getElementById("cr-place-summary").getBoundingClientRect()
        .height,
      preview: document.getElementById("cr-portrait").getBoundingClientRect()
        .height,
    };
  });
  console.log(
    `look stage: ${Math.round(fit.height)}px tall, the place line ${Math.round(fit.line)}px, the preview ${Math.round(fit.preview)}px (260px before)`,
  );
  assert.ok(
    fit.line <= 260 - fit.preview,
    "the place line made the look stage taller than it was",
  );
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: Random place draws a place and names it over the look");
} finally {
  await browser.close();
}
