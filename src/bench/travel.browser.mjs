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
    .locator('[data-tab="travel"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".entries-tiles .entry-go").first().waitFor();
  // Travel always lists somewhere to go, even on the opening night at 8:30 p.m.
  // (owner, Oct 27): a public place joins the list when the player's own
  // reasons are few, and every card says whether it is open now.
  const places = await page.locator(".entries-tiles .entry-go").count();
  console.log("Destinations:", places, clock.replace("\n", " "));
  assert.ok(places >= 3, `at least three destinations, got ${places}`);
  let open = 0;
  for (const card of await page.locator(".entry-go").all()) {
    assert.equal(await card.locator("img.entry-picture").count(), 1);
    const name = await card.locator("h3").innerText();
    assert.ok(name.trim() && !/[()]/.test(name), `card name: ${name}`);
    const here = (await card.locator(".entry-line").innerText()).trim();
    assert.ok(/^(Open now|Closed now|Filing office)/.test(here), here);
    if (here.startsWith("Open now")) open += 1;
    assert.ok(await card.getAttribute("data-reason"));
  }
  console.log("Open now:", open);
  // Tiles page two rows of three under arrows; the sheet never scrolls.
  assert.ok(places <= 6, `a page holds at most six tiles, got ${places}`);
  const fit = await page.evaluate(() => {
    const body = document.getElementById("sheet-body");
    return body.scrollHeight <= body.clientHeight + 1;
  });
  assert.ok(fit, "the sheet body scrolls");
  const pages = await page.locator(".pager-controls:visible").count();
  if (pages) {
    const before = await page.locator(".entry-info h3").allInnerTexts();
    await page.getByRole("button", { name: "Next page" }).click();
    assert.notDeepEqual(
      await page.locator(".entry-info h3").allInnerTexts(),
      before,
      "the arrow turns to other destinations",
    );
    await page.getByRole("button", { name: "Previous page" }).click();
  }
  // A mark on the picture where people are to be met.
  assert.ok(
    (await page.locator(".entry-badge").count()) > 0 ||
      open + (await page.locator(".entry-note").count()) === 0,
    "places with people carry the people mark",
  );
  // No line under the title restating where you are (owner, Oct 27).
  assert.equal(await page.locator(".travel-from").count(), 0);
  assert.ok(!/you are at home/i.test(await page.locator("#sheet").innerText()));
  const first = await page.locator(".entry-info h3").first().innerText();
  await page
    .getByRole("searchbox", { name: "Search destinations" })
    .fill(first);
  assert.ok((await page.locator(".entry-go").count()) >= 1);
  await page.getByRole("searchbox", { name: "Search destinations" }).fill("");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${process.env.SHOTS ?? "docs/reports/travel-cards-2026-10-27"}/travel.png`,
  });
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  assert.deepEqual(errors, []);
  console.log(
    "PASS destinations, search, optional artwork omitted and unchanged clock",
  );
} finally {
  await browser.close();
}
