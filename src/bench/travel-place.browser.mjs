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
  await page.locator("#sheet-body .entry").first().waitFor();
  await page.waitForTimeout(800);
  const cards = await page.evaluate(() =>
    [...document.querySelectorAll("#sheet-body .entry")].map((e) => ({
      title: e.querySelector("h3")?.textContent.trim(),
      text: e.innerText,
      note: e.querySelector(".entry-note")?.textContent.trim() ?? "",
    })),
  );
  console.log(
    `${cards.length} cards (${places.length} places, ${new Set(government.contests.map((c) => c.filingOffice.filedWith.replace(/\s*\([^)]*\)/g, ""))).size} filing offices)`,
  );
  const stray = cards.filter((c) =>
    /studies here|family works here|\bworks here\b|and \d+ more/i.test(c.text),
  );
  assert.deepEqual(
    stray.map((c) => `${c.title}: ${c.note}`),
    [],
    "a card still says what someone known does there, or counts the rest",
  );
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/27-travel-cards.png`,
    });

  // The filing office's view: the picture, every race it takes, who is at
  // the counter, then Go to the counter.
  const office = cards.find((c) => /You file here/.test(c.note));
  assert.ok(office, "no filing office card");
  const races = government.contests.filter(
    (c) =>
      c.filingOffice.filedWith.replace(/\s*\([^)]*\)/g, "") === office.title,
  );
  await page
    .locator("#sheet-body .entry", { hasText: office.title })
    .first()
    .click();
  await page.locator("#sheet-body.place-view").waitFor();
  await page.waitForTimeout(600);
  const view = await page.evaluate(() => {
    const body = document.getElementById("sheet-body");
    const picture = body.querySelector(".record-picture");
    const r = picture?.getBoundingClientRect();
    const sections = [...body.querySelectorAll(".record-section")];
    return {
      name: body.querySelector(".screen-heading .name")?.textContent.trim(),
      meta: body.querySelector(".screen-meta")?.textContent.trim(),
      picture: picture
        ? {
            w: Math.round(r.width),
            h: Math.round(r.height),
            loaded: picture.naturalWidth > 0,
          }
        : null,
      sections: sections.map(
        (s) => s.querySelector(".label")?.textContent.trim() ?? "",
      ),
      raceButtons: [...body.querySelectorAll(".record-actions button")]
        .map((b) => b.textContent.trim())
        .filter((t) => t !== "Go"),
      go: Boolean(body.querySelector('[data-testid="place-go"]')),
    };
  });
  console.log(
    `${view.name} (${view.meta}): picture ${view.picture ? `${view.picture.w}×${view.picture.h}${view.picture.loaded ? "" : " not loaded"}` : "none"}; sections ${view.sections.filter(Boolean).join(", ")}; races ${view.raceButtons.join(" | ")}`,
  );
  assert.equal(view.name, office.title);
  assert.ok(view.picture?.loaded, "the place view has no picture");
  assert.ok(
    view.picture.w >= 600 && view.picture.h >= 200,
    "the picture is not large",
  );
  assert.equal(
    view.raceButtons.length,
    races.length,
    "the view does not list every race the office takes",
  );
  assert.equal(
    new Set(view.raceButtons).size,
    view.raceButtons.length,
    "two races read the same",
  );
  assert.ok(
    !view.raceButtons.some((t) => /\(\d+\)/.test(t)),
    "a district reads as a code",
  );
  assert.ok(view.go, "no Go on the place view");
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/28-place-view.png`,
    });
  await page.locator('[data-testid="place-go"]').click();
  await page.locator("#talk:not([hidden])").waitFor();
  console.log("Go: the counter opened");
  await page.locator("#talk-leave").click();
  await page.locator("#talk").waitFor({ state: "hidden" });

  // A workplace's view: picture, who works there, Go travels there.
  const place =
    places.find((p) => p.reasons.some((r) => r.kind === "work")) ?? places[0];
  if (place) {
    await page.locator('.ring[data-tab="travel"]').click();
    await page.locator("#sheet-body .entry").first().waitFor();
    await page
      .locator("#sheet-body .entry", { hasText: place.name })
      .first()
      .click();
    await page.locator("#sheet-body.place-view").waitFor();
    const who = await page.evaluate(() =>
      [...document.querySelectorAll("#sheet-body .record-section")]
        .map((s) => s.innerText.replace(/\s+/g, " ").trim())
        .join(" | "),
    );
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
