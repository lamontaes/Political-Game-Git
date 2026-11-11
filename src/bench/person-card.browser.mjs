/* global console, document, process, URL */
// Run against the bench; fresh runs draw a world, later runs reuse its life.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await startLife(page, { url: process.env.BENCH_URL });
  const clock = await page.locator("#card-clock").textContent();
  console.log(
    "Player:",
    await page.locator("#card-name").innerText(),
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  const figure = page.locator("#here .busts-person.talkable").first();
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
  // The approved person card (owner, Nov 7, item 54): the name over a bust, sections as strips.
  assert.equal(await page.locator("#person .strip-name").innerText(), name);
  assert.equal(
    await page.locator("#person .mxbust .bust-stack").count(),
    card.face ? 1 : 0,
    "the bust follows the card's face",
  );
  const text = await page.locator("#person").innerText();
  assert.ok(!text.includes("undefined"));
  // No strip with nothing under it, and a capitalized relation.
  const read = await page.evaluate(() => ({
    role: document.querySelector("#person .strip-role")?.textContent ?? "",
    empty: [...document.querySelectorAll("#person .sec")]
      .filter((sec) => !sec.querySelector(".secbody")?.textContent.trim())
      .map((sec) => sec.querySelector(".sechead")?.textContent),
    strips: document.querySelectorAll("#person .sec").length,
  }));
  assert.deepEqual(read.empty, [], "a strip with nothing under it");
  assert.match(read.role, /^\p{Lu}/u, `relation not capitalized: ${read.role}`);
  assert.ok(read.strips >= 1, "the card shows nothing about the person's life");
  // The life story the card is sent is drawn (restored after the rebuild, owner's playtest Nov 8).
  if (card.history?.length) {
    const story = await page.locator("#person .secbody [data-record]").count();
    assert.ok(story > 0, "the card is sent a life story and does not draw it");
  }
  // "Last talked" is never shown (owner, Oct 27, 5 PM).
  assert.doesNotMatch(text, /last talked/i, "a Last talked line");
  if (card.tie?.lastContactDate)
    assert.ok(!text.includes(card.tie.lastContactDate));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: process.argv[2] ?? "test-results/person-card.png",
  });
  console.log(
    "Person:",
    name,
    "PASS strip card from the record, no raw contact date",
  );
  // The same card in a smaller window, while it is open: a second talk to
  // reach it again would depend on the person having more to say.
  await page.setViewportSize({ width: 1024, height: 768 });
  const panel = await page.locator("#person").boundingBox();
  assert.ok(
    panel.x >= 0 &&
      panel.y >= 0 &&
      panel.x + panel.width <= 1024 &&
      panel.y + panel.height <= 768,
    "the card does not fit a smaller viewport",
  );
  console.log("PASS the card fits a smaller viewport");
  await page.setViewportSize({ width: 1672, height: 941 });
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
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
