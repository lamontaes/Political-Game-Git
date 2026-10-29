/* global document, console, URL, process, getComputedStyle */
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
  // The news on the first evening's table opens as the paper's front page.
  if (await page.locator("#news-surface").isVisible()) {
    await page.locator("#news-surface").click();
    await page.locator("#news-reader:not([hidden])").waitFor();
    assert.ok(
      (
        await page.locator("#news-reader .paper-masthead h2").innerText()
      ).trim(),
      "the story reader has a masthead",
    );
    assert.ok(
      (await page.locator("#news-reader .heading").innerText()).trim(),
      "the story reader has a headline",
    );
    assert.equal(await page.locator("#news-reader.paper").count(), 1);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: "docs/reports/news-story-paper-2026-10-27/story.png",
    });
    await page.locator("#news-reader-close").click();
  }
  // The rail's News icon carries a dot while News holds rows the player has not read.
  const dot = () =>
    page.evaluate(() =>
      document
        .querySelector('#rings [data-tab="news"]')
        .classList.contains("unread"),
    );
  await page.waitForFunction(() =>
    document
      .querySelector('#rings [data-tab="news"]')
      .classList.contains("unread"),
  );
  assert.equal(await dot(), true, "no unread dot on the first evening");
  await page
    .locator('[data-tab="news"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet-body .paper").waitFor();
  await page.locator("#sheet-close").click();
  await page.waitForFunction(
    () =>
      !document
        .querySelector('#rings [data-tab="news"]')
        .classList.contains("unread"),
  );
  assert.equal(await dot(), false, "the dot stayed after News was read");
  await page
    .locator('[data-tab="news"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet-body .paper").waitFor();
  assert.ok((await page.locator(".story-headline").count()) > 0);
  assert.equal(
    await page.locator("#sheet-body .paper-masthead-name").innerText(),
    "News",
  );
  // The newspaper art (owner, Oct 28): the paper's name is set in an engraved
  // masthead, and a lead photo, when there is one, is the art of the room
  // where that level of government acts; every picture loads.
  assert.equal(
    await page.locator("#sheet-body .paper-masthead-name.engraved").count(),
    1,
  );
  const art = await page.evaluate(() => [
    getComputedStyle(document.querySelector("#sheet-body .paper-masthead-name"))
      .backgroundImage,
    ...[...document.querySelectorAll("#sheet-body .story-image")].map((image) =>
      image.getAttribute("src"),
    ),
  ]);
  console.log("Newspaper art:", art);
  for (const url of art.map((value) =>
    value.replace(/^url\("?(?:https?:\/\/[^/]+)?/, "").replace(/"?\)$/, ""),
  )) {
    assert.match(url, /^\/art\/newspaper\/[a-z0-9-]+\.jpg$/);
    assert.equal(
      (await page.request.get(`http://localhost:3000${url}`)).status(),
      200,
    );
  }
  // A newspaper with story text (owner, Oct 27): the lead story is printed with
  // at least two sentences under its headline, and no record row with a kind,
  // series or jurisdiction label is on the page.
  const leadText = (
    await page.locator(".paper-story.lead p").allInnerTexts()
  ).join(" ");
  console.log("Lead story text:", leadText.slice(0, 200));
  assert.ok(
    (leadText.match(/[.!?]["”]?(\s|$)/g) ?? []).length >= 2,
    `the lead story has under two sentences: ${leadText}`,
  );
  assert.doesNotMatch(
    await page.locator("#sheet-body .paper").innerText(),
    /\bSeries\b|\bJurisdiction\b|Public record/,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/reports/news-front-page-2026-10-14/news.png",
  });
  const headline = await page.locator(".story-headline").first().innerText();
  await page.locator(".story-headline").first().click();
  assert.equal(await page.locator(".article-title").innerText(), headline);
  // No "Back to front page" (owner, Oct 28, point 26): the masthead returns.
  assert.equal(
    await page.getByRole("button", { name: /back to front page/i }).count(),
    0,
    "a Back to front page button on the story",
  );
  await page.locator("#sheet-body .paper-masthead-name").click();
  await page.locator("#sheet-body .paper-stories").waitFor();
  assert.equal(await page.locator("#card-clock").textContent(), clock);
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
