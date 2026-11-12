/* global console, process, URL */
// Run against a fresh bench: node src/bench/path.browser.mjs <screenshot.png>
// Starts a life in a place drawn from all 56, turns on Dev mode and opens the Calendar, whose golden
// path section draws every step with its status and evidence record, and every world piece with its
// modules (the bench's own reading, /api/progress).
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const base = process.env.BENCH_URL ?? "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1672, height: 941 },
  });
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { seed, placeName } = await startLife(page, {
    url: `${base}/play`,
    fresh: true,
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "On", exact: true }).last().click();
  await page.locator("#sheet-close").click();

  const progress = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/progress",
  );
  // The calendar is the third button in the dock.
  await page.locator("#dock button").nth(2).click();
  // Watch is the Calendar's second tab in dev mode.
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Watch" })
    .click();
  const read = await (await progress).json();
  assert.ok(
    new URL((await progress).url()).searchParams.get("id"),
    "the section reads the player's own progress",
  );
  // The path's two tables are the last two in the watch section.
  const tables = page.locator(".dev-watch table");
  await tables.nth(5).waitFor();
  const total = await tables.count();
  const steps = tables.nth(total - 2);
  const stepRows = steps.locator("tr");
  assert.equal(await stepRows.count(), read.steps.length + 1);
  for (const [i, step] of read.steps.entries()) {
    const cells = stepRows.nth(i + 1).locator("td");
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
  const worldRows = tables.nth(total - 1).locator("tr");
  assert.equal(await worldRows.count(), read.world.length + 1);
  for (const [i, piece] of read.world.entries())
    assert.equal(
      await worldRows
        .nth(i + 1)
        .locator("td")
        .nth(1)
        .innerText(),
      piece.status,
    );
  console.log(
    `PASS Golden path section: ${read.steps.length} steps, ${read.world.length} world pieces, furthest ${read.furthestReachedStep ?? "none"}, in ${placeName}, seed ${seed}`,
  );
  if (process.argv[2])
    await page.screenshot({ path: process.argv[2], fullPage: true });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
