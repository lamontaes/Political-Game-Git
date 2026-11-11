/* global document, console, process */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
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
  // The one start: a new life (or the saved one) with its opening played through.
  await startLife(page);
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
  await page.locator(".people-roster .person").first().waitFor();
  // Owner, Oct 27: family is never a tab on People; the roster groups by how you know them.
  const tabs = await page.locator("#sheet-tabs").innerText();
  assert.doesNotMatch(tabs, /\bfamily\b/i, `People has a Family tab: ${tabs}`);
  // Owner, Nov 8: no explaining line under anything. The roster is headings and rows only.
  const lines = await page.evaluate(() =>
    [...document.querySelectorAll(".people-roster > *")].map(
      (n) => n.className,
    ),
  );
  assert.ok(
    lines.every((c) => /sechead|group|person/.test(c)),
    `a roster line is not a heading or a person: ${lines}`,
  );
  // The first person's card is already beside the roster, and picking another swaps it.
  await page.locator(".people-pane .strip-screen").waitFor();
  const first = await page.locator(".people-pane .strip-name").innerText();
  const count = await page.locator(".people-roster .person").count();
  if (count > 1) {
    await page.locator(".people-roster .person").nth(1).click();
    await page.waitForFunction(
      (name) =>
        document.querySelector(".people-pane .strip-name")?.textContent !==
        name,
      first,
    );
  }
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  assert.deepEqual(errors, []);
  console.log("PASS roster, person card beside it and unchanged clock");
} finally {
  await browser.close();
}
