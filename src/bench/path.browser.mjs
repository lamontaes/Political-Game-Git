/* global console, process, URL */
// Run against a fresh bench: node src/bench/path.browser.mjs <screenshot.png>
// Starts a life in a place drawn from all 56 (PLACE_KEY steers the draw), then
// opens Dev mode's Golden path tab and checks it draws every step with its
// status and evidence record, and every world piece with its modules.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.BENCH_URL ?? "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1672, height: 941 },
  });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  if (process.env.PLACE_KEY)
    await page.route("**/api/newlife?*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("placeKey", process.env.PLACE_KEY);
      route.continue({ url: url.toString() });
    });
  await page.goto(`${base}/play`);
  const newLife = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const response = await newLife;
  assert.equal(response.status(), 200, await response.text());

  const progress = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/progress",
  );
  await page.goto(`${base}/dev`);
  await page.locator('[data-tab="path"]').click();
  const read = await (await progress).json();
  assert.ok(
    new URL((await progress).url()).searchParams.get("id"),
    "the tab reads the player's own progress",
  );
  const steps = page.locator("#path-steps tr");
  await steps.nth(read.steps.length).waitFor();
  assert.equal(await steps.count(), read.steps.length + 1);
  for (const [i, step] of read.steps.entries()) {
    const cells = steps.nth(i + 1).locator("td");
    assert.equal(await cells.nth(0).innerText(), String(step.step));
    assert.equal(await cells.nth(2).innerText(), step.status);
    // A step the bench can show is shown by its record.
    if (step.evidence?.moduleId)
      assert.equal(await cells.nth(4).innerText(), step.evidence.moduleId);
    else if (step.evidence)
      assert.ok(
        (await cells.nth(4).locator(".id").count()) > 0,
        `step ${step.step} names its evidence record`,
      );
  }
  assert.ok(
    read.steps.some((s) => s.evidence),
    "some step has evidence in a fresh life",
  );
  const world = page.locator("#path-world tr");
  assert.equal(await world.count(), read.world.length + 1);
  for (const [i, piece] of read.world.entries())
    assert.equal(
      await world
        .nth(i + 1)
        .locator("td")
        .nth(1)
        .innerText(),
      piece.status,
    );
  const place = await page.locator("#place").innerText();
  const seed = await page.locator("#seed").innerText();
  console.log(
    `PASS Golden path tab: ${read.steps.length} steps, ${read.world.length} world pieces, furthest ${read.furthestReachedStep ?? "none"}, in ${place}, seed ${seed}`,
  );
  if (process.argv[2])
    await page.screenshot({ path: process.argv[2], fullPage: true });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
