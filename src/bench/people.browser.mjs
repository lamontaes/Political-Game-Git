/* global document, console, URL */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });
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
    .locator('[data-tab="people"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".relationship-web").waitFor();
  assert.ok((await page.locator(".people-node").count()) > 0);
  await page.locator(".people-node").first().click();
  assert.equal(await page.locator(".people-node.selected").count(), 1);
  assert.equal(await page.locator(".people-edge.selected").count(), 1);
  await page.locator('[data-group="work"]').click();
  assert.ok((await page.locator(".people-node.dim").count()) > 0);
  await page.locator('[data-group="all"]').click();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/reports/people-web-2026-10-14/web.png" });
  const first = await page
    .locator(".people-node")
    .first()
    .getAttribute("aria-label");
  await page.locator(".people-search").fill(first);
  assert.equal(await page.locator(".people-node").count(), 1);
  await page.getByRole("button", { name: "List", exact: true }).click();
  assert.equal(await page.locator(".people-list").count(), 1);
  await page.locator(".people-node").click();
  await page.getByRole("button", { name: "View person", exact: true }).click();
  await page.locator("#person:not([hidden])").waitFor();
  assert.equal(await page.locator("#person-name").innerText(), first);
  assert.equal(await page.locator("#card-clock").innerText(), clock);
  assert.deepEqual(errors, []);
  console.log(
    "PASS filters, search, selection, list, person card and unchanged clock",
  );
} finally {
  await browser.close();
}
