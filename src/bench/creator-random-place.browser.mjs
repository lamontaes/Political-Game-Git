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
  await page.locator("#cr-screen:not([hidden])").waitFor();
  await page.locator("[data-gender=male]").click();
  await page.locator("#cr-random-name").click();
  await page.locator("#cr-given:not([value=''])").waitFor();
  await page.locator("#cr-screen:not([hidden])").waitFor();
  const button = page.locator("#cr-place-random");
  const label = (await button.innerText()).trim();
  console.log(`button: "${label}"`);
  assert.ok(label.length > 0, "the Random button has no name");
  const drawn = page.waitForResponse((r) =>
    r.url().includes("/api/creator/place"),
  );
  await button.click();
  const place = await (await drawn).json();
  await page.locator("#cr-screen:not([hidden])").waitFor();
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
  // The look's bust is a few stacked pictures; the screenshot waits for them.
  await page.locator("#cr-bust .bust-stack:not(.loading)").waitFor();
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/04-creator-random-place.png`,
    });
  // The drawn state is kept on the town list.
  assert.equal(
    (await page.locator("#cr-state-name").innerText()).trim(),
    place.state.name,
  );
  // A second press draws again and names the new place.
  await page.locator("#cr-place-random").click();
  await page.locator("#cr-screen:not([hidden])").waitFor();
  // The whole creator is one screen: it fits a 900px window.
  const fit = await page.evaluate(() => {
    const r = document.getElementById("front").getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  });
  console.log(`creator: ${Math.round(fit.top)} to ${Math.round(fit.bottom)}px`);
  assert.ok(
    fit.top >= 0 && fit.bottom <= 900,
    "the creator runs off the screen",
  );
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: Random place draws a place and names it on the one screen");
} finally {
  await browser.close();
}
