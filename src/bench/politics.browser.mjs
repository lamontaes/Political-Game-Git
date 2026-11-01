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
let government = null;
page.on("response", async (r) => {
  if (new URL(r.url()).pathname === "/api/government")
    government = await r.json().catch(() => government);
});
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
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  // Politics → Government is the Oct 14 mock (owner, Oct 29): a body's room,
  // its party split, member cards, recent votes, coming up, the executive;
  // one fixed panel that never scrolls as a page.
  await page.locator(".split-screen").waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Your office", exact: true })
      .count(),
    0,
  );
  for (const level of ["local", "state", "federal"]) {
    await page.locator(`[data-level="${level}"]`).click();
    await page.locator(".split-screen .chamber").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const shown = await page.locator("#sheet-body").innerText();
    assert.ok(!/term:seat:|official:/.test(shown), `${level}: no raw id`);
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(shown), `${level}: no ISO date`);
    assert.ok(!shown.includes("undefined"), `${level}: no undefined`);
    const fits = await page.evaluate(() => {
      const body = document.getElementById("sheet-body");
      return body.scrollHeight <= body.clientHeight + 1;
    });
    assert.ok(fits, `${level}: the panel scrolls`);
    const cards = await page.locator(".split-screen .member-card").count();
    assert.ok(cards > 0, `${level}: no member cards`);
    console.log("Government", level, "cards", cards);
    await page.screenshot({
      path: `docs/play-first/shots/play-first-12-politics-screen-to-mock-a/government-${level}.png`,
    });
  }
  // A member card opens that person's card (owner, Oct 29: see and jump).
  await page.locator('[data-level="local"]').click();
  await page.locator(".split-screen .member-card").first().click();
  await page.locator("#sheet").waitFor({ state: "hidden" });
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".split-screen").waitFor();
  // The state filter: switch to another state and its chamber is drawn.
  await page.locator('[data-level="state"]').click();
  const picker = page.locator("select.government-state");
  await picker.waitFor();
  await page.waitForFunction(
    () => document.querySelector("select.government-state")?.options.length > 1,
  );
  const options = await picker
    .locator("option")
    .evaluateAll((nodes) =>
      nodes.map((node) => ({ value: node.value, label: node.textContent })),
    );
  assert.ok(options.length > 50, "every state is on the list");
  const own = await page.locator(".split-screen .chamber").innerText();
  const pick = options.find((option) => option.value && option.value !== "");
  await picker.selectOption(pick.value);
  await page.waitForFunction(
    (before) =>
      document.querySelector(".split-screen .chamber")?.innerText !== before ||
      document.querySelector(".government-state")?.value,
    own,
  );
  assert.ok(
    (await page.locator(".split-screen .member-card").count()) > 0,
    `${pick.label} draws its members`,
  );
  await page.screenshot({
    path: "docs/play-first/shots/play-first-12-politics-screen-to-mock-a/state-switched.png",
  });
  await picker.selectOption("");
  await page.locator('[data-level="local"]').click();
  // Budgets wait for an office, a filing or the age to vote (budgets.browser.mjs).
  assert.equal(
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: "Budgets", exact: true })
      .count(),
    government?.ofVotingAge ? 1 : 0,
  );
  for (const tab of ["Campaigns", "Parties", "Issues"]) {
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: tab, exact: true })
      .click();
    await page.waitForTimeout(250);
    assert.ok(
      !(await page.locator("#sheet-body").innerText()).includes("undefined"),
    );
    // Issues is law cards by subject (owner, Oct 24): a card opens its law.
    if (tab === "Issues") {
      const before = await page.locator("#sheet-body").innerText();
      await page.locator("#sheet-body [data-series]").first().click();
      await page.waitForFunction(
        (text) => document.getElementById("sheet-body").innerText !== text,
        before,
      );
    }
    await page.screenshot({
      path: `docs/play-first/shots/play-first-12-politics-screen-to-mock-a/${tab.toLowerCase()}.png`,
    });
  }
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  assert.deepEqual(errors, []);
  console.log(
    "PASS government drawn as the mock at every level without scrolling, a card opens, the state filter, every politics tab, law details and unchanged clock",
  );
} finally {
  await browser.close();
}
