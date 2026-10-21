/* global process, URL, console, document */
// Run against a fresh bench: node src/bench/party.browser.mjs
// The player joins a party from the politics sheet; the tie shows with how
// their views fit it, and the join buttons go away.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(process.env.BENCH_URL ?? "http://localhost:3000/play");
  await ready;
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-world").click();
  const r = await response;
  assert.equal(r.status(), 200);
  console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
  await page.locator("#opening-box:not([hidden])").waitFor({ timeout: 120000 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Skip opening", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    "Player:",
    await page.locator("#card-name").innerText(),
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  const sheet = page.locator("#sheet");
  await sheet.waitFor();
  // Not a member: each party offers a join control, named from controls.json.
  const join = sheet.getByRole("button", { name: /^Join / });
  await join.first().waitFor();
  const offered = await join.count();
  assert.ok(offered > 0, "a party to join");
  assert.equal(await sheet.locator("[data-tie-id]").count(), 0);
  const label = (await join.first().innerText()).replace(/^Join /, "");
  const joined = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/party/join",
  );
  await join.first().click();
  assert.equal((await joined).status(), 200);
  // The sheet now shows the party, the tie's record and how the views fit.
  const line = sheet.locator("[data-tie-id]");
  await line.waitFor();
  const text = await line.innerText();
  assert.ok(text.includes(label), `${text} names ${label}`);
  assert.match(text, /-?\d\.\d\d/, "the fit is a figure");
  assert.ok(await line.getAttribute("data-tie-id"), "the tie record id");
  assert.equal(await sheet.getByRole("button", { name: /^Join / }).count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    `PASS joined ${label}; tie ${await line.getAttribute("data-tie-id")}`,
  );
} finally {
  await browser.close();
}
