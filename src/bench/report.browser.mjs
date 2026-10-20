/* global console, process */
// Run against a fresh bench: node src/bench/report.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1672, height: 941 },
    acceptDownloads: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let sent = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/report/send")) sent += 1;
  });
  await page.goto(process.env.BENCH_URL ?? "http://localhost:3000/play");
  await page.locator("#front-options").click();
  const sheet = page.locator("#sheet");
  await sheet.waitFor();
  await page.getByTestId("report-bug").click();
  const shown = sheet.locator("pre.option-report");
  await shown.waitFor();
  const body = JSON.parse(await shown.textContent());
  assert.deepEqual(Object.keys(body).sort(), [
    "gameDate",
    "placeKey",
    "problems",
  ]);
  assert.equal(sent, 0, "nothing is sent before the player presses save");
  const download = page.waitForEvent("download");
  await sheet.getByRole("button", { name: "Save the report" }).click();
  const file = await download;
  assert.match(
    file.suggestedFilename(),
    /^bug-report-\d{4}-\d{2}-\d{2}\.json$/,
  );
  assert.equal(sent, 1);
  await sheet.getByRole("button", { name: "Cancel" }).click();
  await sheet.getByRole("button", { name: "Report a bug" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS report a bug: shown first, nothing sent until save, file saved",
    file.suggestedFilename(),
  );
} finally {
  await browser.close();
}
