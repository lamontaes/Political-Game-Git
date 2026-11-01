/* global process, console, document, URL */
// Politics → Government never opens blank (pool: play-politics-local-first-page-blank). A place
// with no local government of its own (the District, an unincorporated place) opens on the
// level that governs it, and its Local tab says so instead of showing nothing. BENCH_SEEDS
// (comma list) replays worlds; the default is the two places that opened blank:
// Washington, District of Columbia (51b9c804-2828-4b4b-a184-0110c81c88ba) and Mendeltna, Alaska
// (370d25dd-1c82-4e55-aabc-cbd001df3795), then one drawn place.
// Run against a fresh bench: node src/bench/government-first-page.browser.mjs [shot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const seeds = (
  process.env.BENCH_SEEDS ??
  "51b9c804-2828-4b4b-a184-0110c81c88ba,370d25dd-1c82-4e55-aabc-cbd001df3795,"
).split(",");
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const errors = [];
try {
  for (const [run, seed] of seeds.entries()) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => errors.push(e.message));
    if (seed)
      await page.route("**/api/newlife*", (route) => {
        const url = new URL(route.request().url());
        url.searchParams.set("seed", seed);
        return route.continue({ url: url.toString() });
      });
    const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
    await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
    await ready;
    const built = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 600000 },
    );
    await page.locator("#new-life").click();
    if (await page.locator("#new-advanced").isVisible())
      await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    const drawn = new URL((await built).url()).searchParams.get("seed");
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    const place = await page.locator("#card-place").innerText();
    await page
      .locator('#rings [data-tab="politics"]')
      .first()
      .evaluate((e) => e.click());
    await page.locator(".government-screen").waitFor();
    // The first page shows at least one member, or a body's own page.
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          "#sheet-body .member-name, #sheet-body .chamber",
        ).length > 0,
    );
    const first = await page
      .locator("#sheet-body .member-name")
      .allInnerTexts();
    console.log(
      `${place} (seed ${drawn}): first page shows ${first.length} members`,
    );
    assert.ok(first.length > 0, `${place}: the first page shows no member`);
    if (shots) await page.screenshot({ path: `${shots}/first-${run + 1}.png` });
    // Local stays a tab; with no local government it says so.
    await page.locator('[data-level="local"]').click();
    await page.waitForTimeout(600);
    const members = await page.locator("#sheet-body .member-name").count();
    const said = (
      await page.locator(".government-screen").innerText()
    ).includes("no local government of its own");
    assert.ok(
      members > 0 || said,
      `${place}: Local shows neither members nor why it has none`,
    );
    if (shots && said)
      await page.screenshot({ path: `${shots}/local-none-${run + 1}.png` });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS Government opens with members, and Local explains when it has none",
  );
} finally {
  await browser.close();
}
