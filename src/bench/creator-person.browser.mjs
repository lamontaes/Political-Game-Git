/* global process, console, document, URL */
// The creator's person (owner, Nov 16: "a person shouldn't even pop up until I
// pick a gender", "one Random for the whole person", and his Desk answer:
// "Hair and facial hair as pictures, with skin and colors as swatches").
// Before a gender: no bust, no How I look, no Random, and no empty column.
// After one: the bust, hair as pictures of the look wearing each, skin and
// hair color as swatches, and one Random that draws a name, a birthday, a
// place and a look. The creator fits a 1440 by 900 window.
// Run against the bench: node src/bench/creator-person.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await ready;
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-screen:not([hidden])").waitFor();
  await page.waitForTimeout(1500);
  const shown = (selector) =>
    page.evaluate((s) => {
      const node = document.querySelector(s);
      return Boolean(node && node.getClientRects().length);
    }, selector);
  // The empty space a column leaves under its last section, by column.
  const columnGaps = () =>
    page.evaluate(() => {
      const screen = document.getElementById("cr-screen");
      const bottom = screen.getBoundingClientRect().bottom;
      return [...screen.children]
        .filter((c) => c.getClientRects().length)
        .map((column) => {
          const last = [...column.children]
            .filter((c) => c.getClientRects().length)
            .at(-1);
          return Math.round(
            bottom - (last?.getBoundingClientRect().bottom ?? bottom),
          );
        });
    });
  const before = {
    stacks: await page.locator("#cr-bust .bust-stack").count(),
    figure: await shown("#cr-figure"),
    look: await shown("#cr-look-sec"),
    random: await shown("#cr-randomize"),
    gaps: await columnGaps(),
  };
  console.log("before a gender:", JSON.stringify(before));
  if (shots) await page.screenshot({ path: `${shots}/before-gender.png` });
  assert.equal(before.stacks, 0, "a bust is drawn before a gender is chosen");
  assert.ok(!before.figure, "the bust's column shows before a gender");
  assert.ok(!before.look, "How I look shows before a gender");
  assert.ok(!before.random, "Random shows before a gender");
  for (const gender of ["female", "male"]) {
    const look = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/creator/appearance",
    );
    await page.locator(`[data-gender=${gender}]`).click();
    await look;
    await page.locator("#cr-bust .bust-stack").waitFor();
    assert.ok(
      await shown("#cr-look-sec"),
      `How I look is hidden for ${gender}`,
    );
    const hair = page.locator(
      '[data-testid="engine-appearance-hair"] .picture-button',
    );
    assert.ok((await hair.count()) > 1, `${gender}: hair is not pictures`);
    assert.ok(
      (await hair.first().locator(".bust-stack").count()) === 1,
      `${gender}: a hair picture is not the look wearing it`,
    );
    for (const row of ["skin", "hair-color"]) {
      const swatches = page.locator(
        `[data-testid="engine-appearance-${row}"] .swatch-button`,
      );
      assert.ok(
        (await swatches.count()) > 1,
        `${gender}: ${row} is not swatches`,
      );
      const color = await swatches.first().evaluate((b) => b.style.background);
      assert.match(color, /rgb/, `${gender}: a ${row} swatch has no color`);
    }
    // A picture clicked dresses the look in it.
    const other = hair.nth(1);
    const id = await other.getAttribute("data-picture");
    const picked = page.waitForResponse(
      (r) => new URL(r.url()).searchParams.get("pick") === id,
    );
    await other.click();
    await picked;
    await page
      .locator(
        `[data-testid="engine-appearance-hair"] [data-picture="${id}"][aria-pressed="true"]`,
      )
      .waitFor();
  }
  // The one Random draws a whole person.
  const drawn = ["name", "birthday", "place", "appearance"].map((route) =>
    page.waitForResponse(
      (r) => new URL(r.url()).pathname === `/api/creator/${route}`,
    ),
  );
  await page.locator("#cr-randomize").click();
  await Promise.all(drawn);
  await page.waitForTimeout(800);
  assert.ok(
    await page.locator("#cr-given").inputValue(),
    "Random drew no name",
  );
  assert.ok(
    (await page.locator("#cr-place-summary-name").innerText()).trim(),
    "Random drew no place",
  );
  const after = await columnGaps();
  console.log("after Random, empty space under each column:", after.join(", "));
  if (shots) await page.screenshot({ path: `${shots}/after-random.png` });
  const fit = await page.evaluate(() => {
    const r = document.getElementById("front").getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  });
  assert.ok(
    fit.top >= 0 && fit.bottom <= 900,
    "the creator runs off the screen",
  );
  assert.ok(
    Math.max(...after) < 260,
    `a column ends ${Math.max(...after)} pixels above the panel's foot`,
  );
  assert.deepEqual(errors, []);
  console.log("creator person: pass");
} finally {
  await browser.close();
}
