/* global process, URL, console, document */
// The player card never says "A law took effect" (owner, Oct 27: "Why am I
// getting a notification that a law took effect?"): play two weeks in a place
// drawn from all 56, answering each stop as a player would, and read the card's
// line after every turn.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  console.log("Seed:", new URL((await made).url()).searchParams.get("seed"));
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  const lines = [];
  const read = async () =>
    lines.push((await page.locator("#card-why").innerText()).trim());
  for (let week = 0; week < 2; week++) {
    const moved = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/advance",
      { timeout: 600000 },
    );
    await page.locator("#week").click();
    await moved;
    await page.waitForTimeout(1500);
    await read();
    for (let stop = 0; stop < 20; stop++) {
      if (await page.locator("#talk-leave").isVisible())
        await page.locator("#talk-leave").click();
      if (await page.locator("#job-offer-turn").isVisible())
        await page.locator("#job-offer-turn").click();
      if (!(await page.locator("#continue").isVisible())) break;
      const resumed = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/api/resume",
        { timeout: 600000 },
      );
      await page.locator("#continue").click();
      await resumed;
      await page.waitForTimeout(1500);
      await read();
    }
  }
  console.log("Card lines:", lines.filter(Boolean).join(" | ") || "(none)");
  for (const line of lines)
    assert.doesNotMatch(line, /law took effect/i, "the card's law notice");
  assert.deepEqual(errors, []);
  console.log("PASS two weeks, no law notice on the card");
} finally {
  await browser.close();
}
