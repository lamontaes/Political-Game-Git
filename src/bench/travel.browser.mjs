/* global document, console, URL, process */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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
  const name = await page.locator("#card-name").innerText();
  const clock = await page.locator("#card-clock").innerText();
  console.log(
    "Player:",
    name,
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  await page
    .locator('[data-tab="travel"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".travel-destinations").waitFor();
  assert.ok((await page.locator(".travel-place").count()) > 0);
  // Every card has a picture, a name, who is there and why it is listed;
  // no name has a parenthetical, and there is no pager.
  for (const card of await page.locator(".travel-place").all()) {
    assert.equal(await card.locator("img.travel-image").count(), 1);
    const name = await card.locator("h3").innerText();
    assert.ok(name.trim() && !/[()]/.test(name), `card name: ${name}`);
    assert.ok((await card.locator(".travel-here").innerText()).trim());
    assert.ok((await card.locator(".travel-reason").innerText()).trim());
    assert.ok(await card.getAttribute("data-reason"));
  }
  assert.equal(await page.locator(".travel-pager").count(), 0);
  assert.ok(await page.locator(".travel-from").innerText());
  const first = await page.locator(".travel-info h3").first().innerText();
  await page
    .getByRole("searchbox", { name: "Search destinations" })
    .fill(first);
  assert.ok((await page.locator(".travel-place").count()) >= 1);
  await page.getByRole("searchbox", { name: "Search destinations" }).fill("");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/reports/travel-cards-2026-10-27/travel.png",
  });
  assert.equal(await page.locator("#card-clock").innerText(), clock);
  assert.deepEqual(errors, []);
  console.log(
    "PASS destinations, search, optional artwork omitted and unchanged clock",
  );
} finally {
  await browser.close();
}
