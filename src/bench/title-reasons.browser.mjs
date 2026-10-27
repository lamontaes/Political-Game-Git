/* global console, process, document */
// Every dimmed entry on the title says why, in visible text from the controls
// data; an entry that is available shows no reason.
// Run against a fresh bench: node src/bench/title-reasons.browser.mjs [screenshot-dir]
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
  const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
  await page.goto(`${base}/play`);
  const controls = await (
    await page.request.get(`${base}/api/controls`)
  ).json();
  await page.waitForFunction(() =>
    [...document.querySelectorAll("#front-main button:disabled")].every((b) =>
      b.querySelector(".reason")?.textContent.trim(),
    ),
  );
  const rows = await page.locator("#front-main button").evaluateAll((buttons) =>
    buttons
      .filter((b) => b.offsetParent !== null)
      .map((b) => {
        const reason = b.querySelector(".reason");
        return {
          id: b.id,
          disabled: b.disabled,
          reason: reason?.textContent.trim() ?? "",
          shown: Boolean(reason && reason.offsetParent !== null),
        };
      }),
  );
  const dimmed = rows.filter((row) => row.disabled);
  assert.ok(dimmed.length >= 2, "the title has dimmed entries to explain");
  const names = {
    "front-continue": "continue",
    "front-saves": "saves",
    "front-patch-notes": "patchNotes",
  };
  for (const row of dimmed) {
    assert.ok(row.shown, `${row.id} is dimmed and shows no reason`);
    assert.equal(
      row.reason,
      controls.titleUnavailable[names[row.id]],
      `${row.id} reason is not the controls data's`,
    );
    console.log(`  ${row.id}: ${row.reason}`);
  }
  for (const row of rows.filter((r) => !r.disabled))
    assert.equal(row.shown, false, `${row.id} is available but shows a reason`);
  if (shots) await page.screenshot({ path: `${shots}/title-reasons.png` });
  assert.deepEqual(errors, []);
  console.log("PASS every dimmed title entry says why");
} finally {
  await browser.close();
}
