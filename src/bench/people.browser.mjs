/* global document, console, URL, process, getComputedStyle */
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
  await page.locator(".relationship-web").waitFor();
  assert.ok((await page.locator(".people-node").count()) > 0);
  // Owner, Oct 27: "there shouldn't be a separate family tab... When you can
  // sort by family"; family is a filter on People, never a tab.
  const tabs = await page.locator("#sheet-tabs").innerText();
  assert.doesNotMatch(tabs, /\bfamily\b/i, `People has a Family tab: ${tabs}`);
  // Owner, Oct 27: "no black box around my guy or anyone else. It should be
  // either a headshot or the people cut out."
  const boxed = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        ".people-node, .people-center, .people-node img, .people-center img",
      ),
    ]
      .map((node) => {
        const style = getComputedStyle(node);
        const box =
          parseFloat(style.borderTopWidth) > 0 ||
          style.outlineStyle !== "none" ||
          style.boxShadow !== "none" ||
          !/^(?:rgba\(0, 0, 0, 0\)|transparent)$/.test(style.backgroundColor);
        return box
          ? `${node.className || node.tagName}: ${style.backgroundColor} ${style.borderTopWidth}`
          : "";
      })
      .filter(Boolean),
  );
  assert.deepEqual(
    boxed,
    [],
    "a person on the People map has a box around them",
  );
  // Owner, Oct 28: never initials. A face is the person's own figure, or an
  // empty ring until their figure exists (a child: the pack paints adults only).
  const lettered = await page.evaluate(() =>
    [...document.querySelectorAll(".people-node, .people-center")]
      .filter((node) => {
        const face = node.querySelector(":scope > img, :scope > .headshot");
        return !face || face.textContent.trim() !== "";
      })
      .map((node) => node.getAttribute("aria-label") ?? node.textContent),
  );
  assert.deepEqual(
    lettered,
    [],
    "a face on the People map is not a picture or a ring",
  );
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
  // The list is face cards, paged; the one found is the only card.
  assert.equal(await page.locator(".people-list .member-card").count(), 1);
  await page.locator(".people-list .member-card").click();
  await page.getByRole("button", { name: "View person", exact: true }).click();
  await page.locator("#person:not([hidden])").waitFor();
  assert.equal(await page.locator("#person-name").innerText(), first);
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  assert.deepEqual(errors, []);
  console.log(
    "PASS filters, search, selection, list, person card and unchanged clock",
  );
} finally {
  await browser.close();
}
