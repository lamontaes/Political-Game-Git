/* global document, console, URL, process, window, MutationObserver */
// Every unemployment rate the player sees on the first night names where it
// applies: the nation, or the state or region it covers. Run with
// BENCH_PORT and BENCH_BROWSER; BENCH_SHOT names a screenshot prefix.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const port = process.env.BENCH_PORT ?? "3000";
const shot = process.env.BENCH_SHOT;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const heard = [];
let openingJson;
page.on("response", async (r) => {
  if (new URL(r.url()).pathname === "/api/opening")
    openingJson = await r.json().catch(() => undefined);
});
page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${port}/play`);
  await ready;
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  if (await page.locator("#new-advanced").isVisible())
    await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const r = await response;
  assert.equal(r.status(), 200);
  const seed = new URL(r.url()).searchParams.get("seed");
  await page.locator("#opening-box:not([hidden])").waitFor({ timeout: 120000 });
  // Read each sentence as it is put up in the speech box.
  await page.exposeFunction("heardLine", (text) => heard.push(text));
  await page.evaluate(() => {
    const box = document.getElementById("opening-speech");
    new MutationObserver(() => window.heardLine(box.textContent)).observe(box, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    window.heardLine(box.textContent);
  });
  // Click through the address and the night's news.
  let shotTaken = false;
  for (let i = 0; i < 400; i += 1) {
    if (await page.locator("#opening-box").isHidden()) break;
    // The sentence with the rate on screen, as the player sees it.
    if (
      shot &&
      !shotTaken &&
      /unemployment/i.test(await page.locator("#opening-speech").innerText())
    ) {
      shotTaken = true;
      await page.screenshot({ path: `${shot}-rate.png` });
    }
    await page
      .locator("#opening-box")
      .click({ timeout: 2000 })
      .catch(() => {});
    await page.waitForTimeout(150);
  }
  await page.locator("#card-name").waitFor();
  const place = await page.locator("#card-place").innerText();
  console.log("Place:", place, "Seed:", seed);
  // The frames the opening carried, for the lines the player did not click to.
  const lines = new Set(heard);
  for (const frame of openingJson?.frames ?? [])
    for (const line of frame.lines) lines.add(line.text);
  // The night's news: the broadcast the player can pick up at home.
  for (const story of openingJson?.news?.stories ?? [])
    for (const line of story.broadcast ?? []) lines.add(line.text);
  const rates = [...lines].filter((t) => /unemployment/i.test(t));
  console.log("Unemployment lines on the first night:", rates);
  assert.ok(rates.length > 0, "the first night mentions an unemployment rate");
  const state = place.split(",").pop().trim();
  const scoped = (t) =>
    /\b(?:national|nationwide|across the country|in the country)\b/i.test(t) ||
    t.includes(place.split(",")[0].trim()) ||
    t.includes(state) ||
    /\bin the .+ area\b/.test(t);
  const unscoped = rates.filter((t) => /\d/.test(t) && !scoped(t));
  assert.deepEqual(
    unscoped,
    [],
    `rates that name no place: ${unscoped.join(" | ")}`,
  );
  if (shot) {
    await page.screenshot({ path: `${shot}-night.png` });
    await page.locator("#news-surface").click();
    await page.locator("#news-reader").waitFor();
    const visibleRates = (
      await page
        .locator("#news-reader .prose, #news-reader .speech")
        .allInnerTexts()
    ).filter((text) => /unemployment/i.test(text) && /\d/.test(text));
    assert.ok(visibleRates.length > 0, "the first-night reader shows a rate");
    assert.deepEqual(
      visibleRates.filter((text) => !scoped(text)),
      [],
    );
    console.log("Visible first-night reader rates:", visibleRates);
    await page.screenshot({ path: `${shot}-news.png` });
  }
  console.log("PASS every unemployment rate names its place");
} finally {
  await browser.close();
}
