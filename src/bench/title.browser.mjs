/* global console, process, document, URL, getComputedStyle */
// Run against a fresh bench: node src/bench/title.browser.mjs [screenshot-dir]
// New game shows Start a life first and largest, and exactly one world choice
// beneath it, the Advanced link; the world modes live only under Advanced.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.BENCH_URL ?? "http://localhost:3000/play");
  // Every dimmed entry says why, in visible text from the controls data.
  const dimmedReasons = async (panel) => {
    await page.waitForFunction(
      (id) =>
        [...document.querySelectorAll(`#${id} button:disabled`)].every((b) =>
          b.querySelector(".reason")?.textContent.trim(),
        ),
      panel,
    );
    const rows = await page
      .locator(`#${panel} button:disabled`)
      .evaluateAll((buttons) =>
        buttons
          .filter((b) => b.offsetParent !== null)
          .map((b) => {
            const reason = b.querySelector(".reason");
            return {
              id: b.id,
              reason: reason?.textContent.trim() ?? "",
              shown: Boolean(reason && reason.offsetParent !== null),
            };
          }),
      );
    for (const row of rows) {
      assert.ok(row.reason && row.shown, `${row.id} is dimmed with no reason`);
      console.log(`  ${row.id}: ${row.reason}`);
    }
    return rows;
  };
  const dimmed = await dimmedReasons("front-main");
  assert.ok(dimmed.length >= 2, "the title has dimmed entries to explain");
  console.log("PASS every dimmed title entry says why");
  if (shots) await page.screenshot({ path: `${shots}/after-title.png` });
  await page.locator("#new-life").click();

  // The New game menu: every visible control, in order.
  const menu = page.locator("#front-new");
  await menu.waitFor();
  const visible = await menu.evaluate((root) =>
    [...root.querySelectorAll("button")]
      .filter((b) => b.offsetParent !== null)
      .map((b) => ({
        id: b.id,
        text: b.textContent.trim(),
        size: parseFloat(getComputedStyle(b.querySelector("b") ?? b).fontSize),
      })),
  );
  assert.equal(visible[0].id, "new-start", "Start a life is first");
  const largest = Math.max(...visible.map((v) => v.size));
  assert.equal(visible[0].size, largest, "Start a life is the largest");
  // One world choice: Advanced. Neither world mode is at the top level.
  const worldModes = ["new-custom", "new-world", "front-watch"];
  for (const id of worldModes)
    assert.equal(
      await menu.locator(`#${id}`).count(),
      0,
      `${id} is not in the New game menu`,
    );
  assert.deepEqual(
    visible.map((v) => v.id),
    ["new-start", "new-advanced", "new-back"],
    "New game offers Start a life, one Advanced link and Back",
  );
  await page.waitForFunction(
    () => document.getElementById("new-advanced").textContent.trim() !== "",
  );
  console.log("PASS New game: Start a life first and largest, one world link");
  if (shots) await page.screenshot({ path: `${shots}/after-new-game.png` });

  // Advanced holds the world modes, and Back returns to New game.
  await page.locator("#new-advanced").click();
  const advanced = page.locator("#front-advanced");
  await advanced.waitFor();
  for (const id of worldModes)
    assert.equal(await advanced.locator(`#${id}`).isVisible(), true, id);
  const watch = await dimmedReasons("front-advanced");
  assert.ok(
    watch.some((r) => r.id === "front-watch"),
    "Watch says why",
  );
  assert.equal(await page.locator("#new-start").isVisible(), false);
  console.log("PASS Advanced holds Custom world, New world, Watch the world");
  if (shots) await page.screenshot({ path: `${shots}/after-advanced.png` });
  await page.locator("#advanced-back").click();
  await menu.waitFor();

  // A world mode still works from Advanced: New world draws a place and seed.
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const r = await response;
  assert.equal(r.status(), 200, await r.text());
  console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
  await page.locator("#opening-box:not([hidden])").waitFor({ timeout: 120000 });
  const body = await r.json();
  console.log(
    "Place:",
    body.placeName ??
      body.packet?.placeName ??
      body.me?.placeName ??
      Object.keys(body).join(","),
  );
  console.log("PASS New world starts a life from Advanced");
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
