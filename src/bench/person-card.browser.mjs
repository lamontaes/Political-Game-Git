/* global console, document, process, URL */
// Run against the bench; fresh runs draw a world, later runs reuse its life.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const title = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/title",
  );
  await page.goto(process.env.BENCH_URL ?? "http://localhost:3000/play");
  await title;
  if (await page.locator("#front-continue").isEnabled())
    await page.locator("#front-continue").click();
  else {
    const life = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 300000 },
    );
    await page.locator("#new-life").click();
    await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    const response = await life;
    assert.equal(response.status(), 200);
    console.log("Seed:", new URL(response.url()).searchParams.get("seed"));
  }
  await page.waitForFunction(
    () =>
      document.getElementById("card-name").textContent.trim() &&
      document.getElementById("card-clock").textContent.trim(),
  );
  const clock = await page.locator("#card-clock").textContent();
  console.log(
    "Player:",
    await page.locator("#card-name").innerText(),
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  const figure = page.locator("#people .talkable").first();
  await figure.waitFor();
  const name = await figure.getAttribute("aria-label");
  // A person in the room is talked to by a click or a key; the talk box says
  // who they are in a sentence, and their name opens their card, which has no
  // Talk button (owner, Oct 27).
  await figure.focus();
  await page.keyboard.press("Enter");
  await page.locator("#talk:not([hidden])").waitFor();
  await page.waitForFunction(
    (who) => document.getElementById("talk-name").textContent === who,
    name,
  );
  await page.waitForTimeout(1500);
  // Under the name, nothing: the talk box is the name, the line and the
  // replies (owner, Oct 27, 6:20 PM).
  assert.equal(await page.locator("#talk-role").count(), 0, "a subtitle");
  // A conversation offers its replies, Say nothing and Leave, and no Continue.
  assert.ok(await page.locator("#talk-choices .reply").count());
  assert.ok(await page.locator("#talk-silent").isVisible());
  assert.ok(await page.locator("#talk-leave").isVisible());
  assert.equal(await page.locator("#talk-next").isVisible(), false);
  const known = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/known",
  );
  await page.locator("#talk-name").click();
  const card = await (await known).json();
  await page.locator("#person:not([hidden])").waitFor();
  assert.equal(await page.locator("#person-name").innerText(), name);
  assert.equal(await page.locator("#person-talk").count(), 0, "a Talk button");
  assert.equal(
    await page.locator("#person").getByRole("button", { name: "Talk" }).count(),
    0,
    "a Talk button",
  );
  assert.equal(
    await page.locator("#person-media .screen-portrait").getAttribute("src"),
    card.figureUrl,
  );
  assert.equal(await page.locator("#person-media .screen-backdrop").count(), 0);
  const text = await page.locator("#person").innerText();
  assert.ok(!text.includes("undefined"));
  // No heading with nothing under it, no date without a label, a capitalized
  // relation, and where the person lives (owner, Oct 26).
  const read = await page.evaluate(() => ({
    role: document.getElementById("person-role").textContent,
    empty: [...document.querySelectorAll("#person-facts .label")]
      .filter((label) => {
        const next = label.nextElementSibling;
        return !next || !next.textContent.trim();
      })
      .map((label) => label.textContent),
    home: [...document.querySelectorAll("#person-facts .label")].some((label) =>
      label.nextElementSibling?.textContent.trim(),
    ),
    values: [...document.querySelectorAll("#person-facts .record-value")].map(
      (value) => ({
        value: value.textContent.trim(),
        label: value.previousElementSibling?.textContent.trim() ?? "",
      }),
    ),
  }));
  assert.deepEqual(read.empty, [], "a heading with nothing under it");
  assert.match(read.role, /^\p{Lu}/u, `relation not capitalized: ${read.role}`);
  assert.ok(read.home, "the card shows nothing about the person's life");
  for (const { value, label } of read.values)
    assert.ok(label, `a value with no label: ${value}`);
  // "Last talked" is never shown (owner, Oct 27, 5 PM).
  assert.doesNotMatch(text, /last talked/i, "a Last talked line");
  if (card.tie?.lastContactDate)
    assert.ok(!text.includes(card.tie.lastContactDate));
  await page.waitForFunction(
    () => document.querySelector("#person-media .screen-portrait").complete,
  );
  const image = await page
    .locator("#person-media .screen-portrait")
    .boundingBox();
  assert.ok(image.height > 600 && image.width > 250, "large side figure");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: process.argv[2] ?? "test-results/person-card.png",
  });
  console.log(
    "Person:",
    name,
    "PASS large record-driven figure, no sample background or raw contact date",
  );
  await page.keyboard.press("Escape");
  await page.locator("#person").waitFor({ state: "hidden" });
  assert.equal(
    await page
      .locator("#talk-name")
      .evaluate((e) => document.activeElement === e),
    true,
  );
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  assert.equal(await page.locator("#sheet").isVisible(), false);
  await page.locator("#talk-leave").click();
  console.log(
    "PASS keyboard entry opens the talk, the name opens the card, Escape/focus return, unchanged browsing time",
  );
  // Presentation contract only: deliberately omit artwork without altering the world.
  await page.route("**/api/known?*", async (route) => {
    const r = await route.fetch();
    const json = await r.json();
    await route.fulfill({
      json: {
        ...json,
        presentation: { portraitUrl: null, backgroundUrl: null },
      },
    });
  });
  await page.locator("#people .talkable").first().press("Enter");
  await page.locator("#talk:not([hidden])").waitFor();
  await page.locator("#talk-name").click();
  await page.locator("#person:not([hidden])").waitFor();
  assert.equal(await page.locator("#person-media img").count(), 0);
  await page.setViewportSize({ width: 1024, height: 768 });
  const panel = await page.locator("#person").boundingBox();
  assert.ok(
    panel.x >= 0 &&
      panel.y >= 0 &&
      panel.x + panel.width <= 1024 &&
      panel.y + panel.height <= 768,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS null-artwork contract leaves clear slots and panel fits smaller viewport",
  );
} finally {
  await browser.close();
}
