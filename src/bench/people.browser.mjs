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
  // A name on a person's card opens that person here, and the list follows:
  // their row is the lit one, or none is when they are not on the list, and
  // the row left behind opens again on one click.
  const shown = () =>
    page.locator(".roster-screen.people .roster-page .strip-name").innerText();
  const lit = () =>
    page
      .locator('.roster-screen.people .roster-row[aria-pressed="true"]')
      .allInnerTexts();
  let followed = "no name to follow on any card in this draw";
  for (let at = 0; at < Math.min(count, 6); at++) {
    const row = page.locator(".roster-screen.people .roster-row").nth(at);
    await row.click();
    await page.waitForFunction(
      (key) =>
        document.querySelector(".roster-screen.people .roster-page")?.dataset
          .key === key,
      await row.getAttribute("data-key"),
    );
    const from = await shown();
    const link = page
      .locator(".roster-screen.people .roster-page .nm.pick")
      .first();
    if (!(await link.count())) continue;
    await link.click();
    await page.waitForFunction(
      (name) =>
        document.querySelector(".roster-screen.people .roster-page .strip-name")
          ?.textContent !== name,
      from,
    );
    const to = await shown();
    const rows = await lit();
    assert.ok(rows.length <= 1, `one row lit at most: ${rows.join(" | ")}`);
    if (rows.length)
      assert.ok(
        rows[0].startsWith(to),
        `the lit row (${rows[0]}) is the person shown (${to})`,
      );
    await row.click();
    await page.waitForFunction(
      (name) =>
        document.querySelector(".roster-screen.people .roster-page .strip-name")
          ?.textContent === name,
      from,
    );
    assert.deepEqual(
      (await lit()).map((text) => text.startsWith(from)),
      [true],
      `${from}'s row is lit again and shows them`,
    );
    followed = `${from} -> ${to} (${rows.length ? "on the list" : "not on the list"}) -> ${from}`;
    break;
  }
  console.log(`PEOPLE FOLLOW: ${followed}`);
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  assert.deepEqual(errors, []);
  console.log("PASS roster, person card beside it and unchanged clock");
} finally {
  await browser.close();
}
