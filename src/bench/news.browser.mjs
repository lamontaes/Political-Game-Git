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
    .locator('[data-tab="news"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".paper").waitFor();
  assert.ok((await page.locator(".story-headline").count()) > 0);
  assert.equal(await page.locator(".paper-masthead h2").innerText(), "News");
  assert.equal(await page.locator(".story-image").count(), 0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/reports/news-front-page-2026-10-14/news.png",
  });
  const headline = await page.locator(".story-headline").first().innerText();
  await page.locator(".story-headline").first().click();
  assert.equal(await page.locator(".article-title").innerText(), headline);
  await page
    .getByRole("button", { name: "Back to front page", exact: true })
    .click();
  assert.equal(await page.locator("#card-clock").innerText(), clock);
  await page.route("**/api/opening?*", async (route) => {
    const r = await route.fetch();
    const json = await r.json();
    const original = json.news.stories[0];
    await route.fulfill({
      json: {
        ...json,
        news: {
          ...json.news,
          stories: ["broadsheet", "modern", "tabloid", "weekly"].map(
            (layout) => ({
              ...original,
              outlet: { id: layout, name: layout, layout },
            }),
          ),
        },
      },
    });
  });
  await page
    .locator('[data-tab="news"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".outlet-picker button").first().waitFor();
  for (const layout of ["broadsheet", "modern", "tabloid", "weekly"]) {
    await page.locator(`[data-outlet="${layout}"]`).click();
    assert.equal(await page.locator(`.paper-${layout}`).count(), 1);
    await page.screenshot({
      path: `docs/reports/news-front-page-2026-10-14/${layout}.png`,
    });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS generated headlines/article/back, no invented masthead or image, unchanged clock; four outlet layout contracts",
  );
} finally {
  await browser.close();
}
