/* global process, URL, console, document */
// Every sheet of a new game, at the start and after a day, fits the window
// without scrolling (owner, M6-02: no scrolling on main screens).
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  if (await page.locator("#front-continue").isEnabled()) {
    await page.locator("#front-continue").click();
  } else {
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 300000 },
    );
    await page.locator("#new-life").click();
    await page.locator("#new-world").click();
    const r = await response;
    assert.equal(r.status(), 200);
    console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
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
  console.log(
    "Player:",
    await page.locator("#card-name").innerText(),
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  const tabs = await page
    .locator(".nav-item[data-tab]")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.tab));
  const over = [];
  const scan = async (when) => {
    for (const tab of tabs) {
      await page
        .locator(`.nav-item[data-tab="${tab}"]`)
        .first()
        .evaluate((e) => e.click());
      await page.waitForTimeout(1500);
      // A main screen shows all it has without scrolling: the sheet body and
      // the page itself fit the window (the pager pages what does not).
      const size = await page.evaluate(() => {
        const body = document.getElementById("sheet-body");
        const pager = document.getElementById("sheet-pager");
        const hidden = (e) => getComputedStyle(e).overflowY === "hidden";
        // Content taller than the window is paged by the pager (it moves the
        // box itself), which is fine while the player cannot scroll it
        // freely (overflow hidden) and a pager shows to move between pages.
        const tall = body.scrollHeight > body.clientHeight + 8;
        return {
          body:
            tall && !hidden(body) ? body.scrollHeight - body.clientHeight : 0,
          pagerMissing:
            tall && pager.hidden ? body.scrollHeight - body.clientHeight : 0,
          page:
            document.documentElement.scrollHeight >
            document.documentElement.clientHeight + 8
              ? document.documentElement.scrollHeight -
                document.documentElement.clientHeight
              : 0,
        };
      });
      if (size.body || size.pagerMissing || size.page)
        over.push(`${when} · ${tab}: ${JSON.stringify(size)}`);
      await page.keyboard.press("Escape");
    }
  };
  await scan("start");
  await page.locator("#day").click();
  await page.waitForFunction(() => !document.getElementById("day").disabled);
  await scan("after a day");
  console.log(over.length ? over.join("\n") : "no sheet scrolls");
  assert.deepEqual(errors, []);
  assert.deepEqual(over, []);
  console.log(`PASS ${tabs.length} sheets, twice, none scrolls`);
} finally {
  await browser.close();
}
