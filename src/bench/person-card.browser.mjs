/* global console, document, process, URL */
// Run against the bench; fresh runs draw a world, later runs reuse its life.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const title = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/title",
  );
  await page.goto(process.env.BENCH_URL ?? "http://localhost:3000/play");
  await title;
  if (await page.locator("#front-continue").isEnabled())
    await page.locator("#front-continue").click();
  else {
    const life = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 300000 },
    );
    await page.locator("#new-life").click();
    await page.locator("#new-world").click();
    const response = await life;
    assert.equal(response.status(), 200);
    console.log("Seed:", new URL(response.url()).searchParams.get("seed"));
    await page
      .locator("#opening-box:not([hidden])")
      .waitFor({ timeout: 120000 });
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Skip opening", exact: true })
      .click();
  }
  await page.waitForFunction(
    () =>
      document.getElementById("card-name").textContent.trim() &&
      document.getElementById("card-clock").textContent.trim(),
  );
  const clock = await page.locator("#card-clock").innerText();
  console.log(
    "Player:",
    await page.locator("#card-name").innerText(),
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  const figure = page.locator("#people .talkable").first();
  await figure.waitFor();
  const name = await figure.getAttribute("aria-label");
  const known = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/known",
  );
  await figure.focus();
  await page.keyboard.press("Enter");
  const card = await (await known).json();
  await page.locator("#person:not([hidden])").waitFor();
  assert.equal(await page.locator("#person-name").innerText(), name);
  assert.equal(
    await page.locator("#person-figure").getAttribute("src"),
    card.figureUrl,
  );
  assert.equal(
    await page.locator("#person-background").getAttribute("src"),
    null,
  );
  const text = await page.locator("#person").innerText();
  assert.ok(!text.includes("undefined"));
  if (card.tie?.lastContactDate)
    assert.ok(!text.includes(card.tie.lastContactDate));
  await page.waitForFunction(
    () => document.getElementById("person-figure").complete,
  );
  const image = await page.locator("#person-figure").boundingBox();
  assert.ok(image.height > 600 && image.width > 250, "large side figure");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: process.argv[2] ?? "test-results/person-card.png",
  });
  console.log(
    "Person:",
    name,
    "PASS large record-driven figure, no sample background or raw contact date",
  );
  await page.keyboard.press("Escape");
  await page.locator("#person").waitFor({ state: "hidden" });
  assert.equal(
    await figure.evaluate((e) => document.activeElement === e),
    true,
  );
  assert.equal(await page.locator("#card-clock").innerText(), clock);
  assert.equal(await page.locator("#sheet").isVisible(), false);
  await figure.press("Enter");
  await page.locator("#person:not([hidden])").waitFor();
  await page.locator("#person-talk").click();
  await page.locator("#talk:not([hidden])").waitFor();
  assert.equal(await page.locator("#person").isVisible(), false);
  await page.locator("#talk-leave").click();
  console.log(
    "PASS keyboard entry, Escape/focus return, unchanged browsing time, Talk opens conversation",
  );
  // Presentation contract only: deliberately omit artwork without altering the world.
  await page.route("**/api/known?*", async (route) => {
    const r = await route.fetch();
    const json = await r.json();
    await route.fulfill({
      json: {
        ...json,
        presentation: { portraitUrl: null, backgroundUrl: null },
      },
    });
  });
  await page.locator("#people .talkable").first().press("Enter");
  await page.locator("#person:not([hidden])").waitFor();
  assert.equal(await page.locator("#person-figure").getAttribute("src"), null);
  assert.equal(await page.locator("#person-figure").isVisible(), false);
  await page.setViewportSize({ width: 1024, height: 768 });
  const panel = await page.locator("#person").boundingBox();
  assert.ok(
    panel.x >= 0 &&
      panel.y >= 0 &&
      panel.x + panel.width <= 1024 &&
      panel.y + panel.height <= 768,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS null-artwork contract leaves clear slots and panel fits smaller viewport",
  );
} finally {
  await browser.close();
}
