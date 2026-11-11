/* global document, console, URL, process */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
await page.route("**/api/controls", async (route) => {
  const response = await route.fetch();
  const data = await response.json();
  const { readFile } = await import("node:fs/promises");
  await route.fulfill({
    json: {
      ...data,
      ...JSON.parse(await readFile("src/bench/data/controls.json", "utf8")),
    },
  });
});
const errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("PAGE ERROR", e.message);
});
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
    await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    const r = await response;
    assert.equal(r.status(), 200);
    console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
  }
  await page.waitForFunction(
    () =>
      document.getElementById("card-name").textContent.trim() &&
      document.getElementById("card-clock").textContent.trim(),
  );
  const name = await page.locator("#card-name").innerText();
  const clock = await page.locator("#card-clock").textContent();
  console.log(
    "Player:",
    name,
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  await page
    .locator('[data-tab="people"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".roster-screen.people .roster-row").first().waitFor();
  // Owner, Oct 27: family is never a tab on People; the roster groups by how you know them.
  const tabs = await page.locator("#sheet-tabs").innerText();
  assert.doesNotMatch(tabs, /\bfamily\b/i, `People has a Family tab: ${tabs}`);
  // Owner, Nov 8: no explaining line under anything. The roster is headings and rows only.
  const lines = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        ".roster-screen.people .roster-pages .pager-grid > *",
      ),
    ].map((n) => n.className),
  );
  assert.ok(
    lines.every((c) => /group|roster-row/.test(c)),
    `a roster line is not a heading or a person: ${lines}`,
  );
  // The first person's card is already beside the roster, and picking another swaps it.
  await page
    .locator(".roster-screen.people .roster-page .strip-screen")
    .waitFor();
  const first = await page
    .locator(".roster-screen.people .roster-page .strip-name")
    .innerText();
  const count = await page.locator(".roster-screen.people .roster-row").count();
  if (count > 1) {
    await page.locator(".roster-screen.people .roster-row").nth(1).click();
    await page.waitForFunction(
      (name) =>
        document.querySelector(".roster-screen.people .roster-page .strip-name")
          ?.textContent !== name,
      first,
    );
  }
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  assert.deepEqual(errors, []);
  console.log("PASS roster, person card beside it and unchanged clock");
} finally {
  await browser.close();
}
