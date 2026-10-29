/* global process, URL, console, document */
// A person's card shows no empty heading and no label with nothing beside it
// (owner, Oct 28 point 41): every person in the People web who has a card is opened.
// BENCH_SEED replays a world; SHOTS_DIR saves the first card.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  if (process.env.BENCH_SEED)
    await page.route("**/api/newlife*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("seed", process.env.BENCH_SEED);
      return route.continue({ url: url.toString() });
    });
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const r = await made;
  console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  // The opening evening's scenes first, until the day can move.
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
  await page
    .locator('#rings [data-tab="people"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".people-node").first().waitFor();
  await page.waitForTimeout(1500);
  const count = await page.locator(".people-node").count();
  for (let n = 0; n < count; n += 1) {
    // The card closes the sheet under it: open People again for each person.
    if (n > 0) {
      await page
        .locator('#rings [data-tab="people"]')
        .first()
        .evaluate((e) => e.click());
      await page.locator(".people-node").first().waitFor();
      await page.waitForTimeout(1200);
    }
    await page.locator(".people-node").nth(n).click();
    await page.waitForTimeout(500);
    await page.locator(".people-selection button").first().click();
    await page.locator("#person:not([hidden])").waitFor();
    await page.waitForTimeout(800);
    const found = await page.evaluate(() => ({
      name: document.getElementById("person-name").textContent.trim(),
      empty: [...document.querySelectorAll("#person-facts .record-section")]
        .filter((section) => section.children.length < 2)
        .map((section) => section.textContent.trim())
        .concat(
          [...document.querySelectorAll("#person-facts .record-value")]
            .filter((value) => !value.textContent.trim())
            .map((value) => value.parentElement.textContent.trim()),
        ),
    }));
    console.log(`${found.name}: ${found.empty.length} empty`, found.empty);
    assert.deepEqual(
      found.empty,
      [],
      `${found.name}: an empty heading or label`,
    );
    if (SHOTS && n === 0)
      await page.screenshot({ path: `${SHOTS}/card-1.png` });
    await page.locator("#person-close").click();
  }
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: no empty heading on any card");
} finally {
  await browser.close();
}
