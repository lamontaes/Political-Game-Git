/* global process, URL, console, document */
// A person's card says nothing of how close you are (owner, Oct 29: no band
// word for how someone feels, on any screen; pool item
// ui-person-card-closeness-band-word). A new life at Sheridan WY (5669845),
// seed 7: every person in the People screen is opened; no card carries a band
// word or "Grew closer" / "Drifted apart"; the cards of a relative, a friend and
// the person least close are printed whole, and "Last in touch" stays as the
// event. Run against a fresh bench: node src/bench/person-card-no-band-word.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { playOpening } from "./start-life.mjs";

const BANDS =
  /barely know|know each other|are friendly|are close|very close|grew closer|drifted apart|grew apart/i;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
const errors = [];
let lastCard = null;
page.on("response", async (r) => {
  if (new URL(r.url()).pathname === "/api/card" && r.ok())
    lastCard = await r.json().catch(() => lastCard);
});
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("seed", "7");
    url.searchParams.set("placeKey", "5669845");
    return route.continue({ url: url.toString() });
  });
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  await playOpening(page, (await (await made).json()).sceneMomentId ?? null);
  console.log("Seed: 7 Place:", await page.locator("#card-place").innerText());
  const visible = (id) =>
    page
      .locator(`#${id}`)
      .isVisible()
      .catch(() => false);
  for (let step = 0; step < 30; step += 1) {
    if (await visible("talk-next")) await page.locator("#talk-next").click();
    else if (await visible("continue")) await page.locator("#continue").click();
    else if (await visible("talk")) {
      const reply = page.locator("#talk-choices .reply").first();
      if (await reply.count()) await reply.click();
      else if (await visible("talk-leave"))
        await page.locator("#talk-leave").click();
    } else if (!(await page.locator("#week").isDisabled())) break;
    await page.waitForTimeout(800);
  }
  // Play on, a week at a time, so people met and worked with have ties to show
  // (the opening room holds only home and family).
  for (let turn = 0; turn < Number(process.env.CARD_WEEKS ?? 16) * 6; turn++) {
    if (await visible("talk-next")) await page.locator("#talk-next").click();
    else if (await visible("continue")) await page.locator("#continue").click();
    else if (await visible("talk")) {
      const reply = page.locator("#talk-choices .reply").first();
      if (await reply.count()) await reply.click();
      else if (await visible("talk-leave"))
        await page.locator("#talk-leave").click();
    } else {
      const week = await page.evaluate(
        () => document.getElementById("card-clock")?.textContent,
      );
      if (turn > 0 && /\b(April|May)\b/.test(week ?? "")) break;
      const moved = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/api/advance",
        { timeout: 600000 },
      );
      await page.locator("#week").click();
      await moved;
    }
    await page.waitForTimeout(800);
  }
  console.log("Clock:", await page.locator("#card-clock").innerText());
  await page
    .locator('#rings [data-tab="people"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".roster-screen.people .roster-row").first().waitFor();
  await page.waitForTimeout(1500);
  const tieCard = lastCard;
  console.log(
    `Ties on the card: ${tieCard?.ties?.length ?? "n/a"}, with a last change: ${tieCard?.ties?.filter((t) => t.latestChange).length ?? "n/a"}`,
  );
  const rows = page.locator(".roster-screen.people .roster-row");
  const count = await rows.count();
  const cards = [];
  for (let n = 0; n < count; n += 1) {
    await rows.nth(n).click();
    await page.waitForTimeout(700);
    const card = await page.locator(".roster-screen.people").innerText();
    assert.doesNotMatch(card, BANDS, `a band word on card ${n + 1}`);
    cards.push({
      row: (await rows.nth(n).innerText()).replace(/\s+/g, " "),
      text: card,
    });
  }
  const kin = cards.find((c) =>
    /mother|father|sister|brother|daughter|son|wife|husband/i.test(c.row),
  );
  const friend =
    cards.find((c) => /friend/i.test(c.row)) ??
    cards.find(
      (c) =>
        c !== kin &&
        !/ (mother|father|uncle|aunt|grand|cousin)/i.test(c.row) &&
        c.row.split(" ").length > 1 &&
        c !== cards.at(-1),
    );
  const far = cards.at(-1);
  for (const [label, pick] of [
    ["Relative", kin],
    ["Friend, or the first colleague when the world has no friend yet", friend],
    ["Least close", far],
  ])
    console.log(
      `\n=== ${label}: ${pick?.row ?? "(none in this world)"}\n${pick?.text ?? ""}`,
    );
  console.log(
    `\n${count} cards opened, no band word on any. Last in touch lines: ${cards.filter((c) => /Last in touch/.test(c.text)).length}`,
  );
  assert.deepEqual(errors, []);
  console.log("PASS no card tells how close you are");
} finally {
  await browser.close();
}
