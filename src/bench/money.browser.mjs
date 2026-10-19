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
    .locator('[data-tab="money"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".cash-total").waitFor();
  assert.ok((await page.locator(".cash-total").innerText()).includes("$"));
  assert.equal(await page.locator(".money-history").count(), 0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/reports/money-layout/money.png" });
  assert.equal(await page.locator("#card-clock").innerText(), clock);
  await page.route("**/api/card?*", async (route) => {
    const r = await route.fetch();
    const json = await r.json();
    await route.fulfill({
      json: {
        ...json,
        finances: {
          balances: [
            { month: "January", minor: 12000 },
            { month: "February", minor: 18000 },
          ],
          spending: [
            { label: "Housing", minor: 10000 },
            { label: "Food", minor: 5000 },
          ],
          debts: [{ name: "Loan", minor: 45000 }],
        },
      },
    });
  });
  await page.reload();
  await page.locator("#front-continue:not([disabled])").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  await page
    .locator('[data-tab="money"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".money-history").waitFor();
  assert.equal(await page.locator(".balance-bar").count(), 2);
  assert.equal(await page.locator(".money-donut").count(), 1);
  assert.ok((await page.locator("#sheet-body").innerText()).includes("Loan"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS actual balance view without time, optional history/spending/debt contract fixtures",
  );
} finally {
  await browser.close();
}
