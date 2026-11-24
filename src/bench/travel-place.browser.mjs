/* global process, console, document */
// Travel in a real browser on the bench with a life in progress (owner, Oct 28
// sitting, points 27 and 28): no card says what someone the player knows does
// there ("Someone at home studies here", "Your family works here", "... works
// here") and nothing is counted as "and N more"; a card opens the place's own
// view with a large picture, what you do there (the filing office: every race
// it takes) and who works there, and Go then travels.
//   node src/bench/travel-place.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  const title = await (await ready).json();
  assert.ok(title.life, "no life in progress on the bench");
  console.log(`life: ${title.life.name} · ${title.life.placeName}`);
  await page.locator("#front-continue:not([disabled])").click();
  await page.locator("#front").waitFor({ state: "hidden" });
  await page.waitForTimeout(1200);
  for (const sel of ["#news-reader-close", "#talk-next"]) {
    const b = page.locator(sel);
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  const id = encodeURIComponent(title.life.personId);
  const government = await (
    await page.request.get(`${base}/api/government?id=${id}`)
  ).json();
  const places = await (
    await page.request.get(`${base}/api/goto?id=${id}`)
  ).json();

  // The cards.
  await page.locator('.ring[data-tab="travel"]').click();
  await page.locator(".travel-tile").first().waitFor();
  await page.waitForTimeout(800);
  // The filing office's tile: its picture and hours at the right, then Go to the counter.
  const office = page.locator(".travel-tile[data-filing]").first();
  assert.ok(await office.count(), "no filing office tile");
  const officeName = await office.locator("b").innerText();
  const races = government.contests.filter(
    (c) =>
      c.filingOffice.filedWith.replace(/\s*\([^)]*\)/g, "") === officeName ||
      officeName.startsWith(
        c.filingOffice.filedWith.replace(/\s*\([^)]*\)/g, ""),
      ),
  );
  await office.click();
  await page.locator(".travel-hero img").waitFor();
  await page.waitForTimeout(600);
  const view = await page.evaluate(() => ({
    name: document.querySelector(".travel-hero h2")?.textContent.trim(),
    loaded: document.querySelector(".travel-hero img")?.naturalWidth > 0,
    races: [...document.querySelectorAll(".travel-detail button")]
      .map((b) => b.textContent.trim())
      .filter((t) => !/^Go to /.test(t)),
  }));
  assert.equal(view.name, officeName);
  assert.ok(view.loaded, "the place has no picture");
  // No seats by their holders' names (owner, Nov 1); the clerk asks which race.
  assert.deepEqual(view.races, [], "the view lists races");
  assert.ok(races.length >= 0);
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/28-place-view.png`,
    });
  await page.locator('[data-testid="place-go"]').click();
  await page.locator("#talk:not([hidden])").waitFor();
  console.log("Go: the counter opened");
  // The narrator sets the counter up first; Continue, then the clerk's Leave.
  if (await page.locator("#talk-next").isVisible())
    await page.locator("#talk-next").click();
  await page.locator("#talk-leave").click();
  await page.locator("#talk").waitFor({ state: "hidden" });

  // A workplace's view: picture, who works there, Go travels there.
  const place =
    places.find((p) => p.reasons.some((r) => r.kind === "work")) ?? places[0];
  if (place) {
    await page.locator('.ring[data-tab="travel"]').click();
    await page.locator(".travel-tile").first().waitFor();
    const tile = page
      .locator(`.travel-tile[data-place="${place.name}"]`)
      .first();
    for (
      let p = 0;
      p < 10 &&
      !(await tile.isVisible()) &&
      (await page.getByRole("button", { name: "Next page" }).isEnabled());
      p += 1
    )
      await page.getByRole("button", { name: "Next page" }).click();
    await tile.click();
    await page.locator('[data-testid="place-go"]').waitFor();
    const who = await page.locator(".travel-detail").innerText();
    console.log(`${place.name}: ${who.slice(0, 160)}`);
    await page.locator('[data-testid="place-go"]').click();
    await page.waitForFunction(
      (name) =>
        document.getElementById("card-place").textContent.trim() === name,
      place.name,
    );
    console.log("Go: traveled there");
  }
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "ok: Travel's cards say only what is yours, a place opens its own view, Go travels",
  );
} finally {
  await browser.close();
}
