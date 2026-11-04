/* global process, console, document, URL */
// An office keeps its clerk's hours (owner, Nov 1: "obviously the office isn't
// open at 8:30 p.m."): on the opening evening the filing office's Travel card
// says when it opens, Go plays the visit at that opening with the clock moved
// there, and a second visit that morning finds it open (no line, no move).
// BENCH_SEED replays a world; BENCH_PLACE (a place key) pins the town, and
// BENCH_JUMP (a date) plays on to that day by the calendar, for a town whose
// filing opens later. Path 6's finish line, Brookside, Delaware, whose first
// filing day is a Saturday: BENCH_SEED=4d50e1f88df997f9 BENCH_PLACE=1009850
// BENCH_JUMP=2025-08-30. Run against a fresh bench:
// node src/bench/office-hours.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => errors.push(e.message));
  const pinned = {
    seed: process.env.BENCH_SEED,
    placeKey: process.env.BENCH_PLACE,
  };
  if (pinned.seed || pinned.placeKey)
    await page.route("**/api/newlife?*", (route) => {
      const url = new URL(route.request().url());
      for (const [key, value] of Object.entries(pinned))
        if (value) url.searchParams.set(key, value);
      return route.continue({ url: url.toString() });
    });
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  const made = page.waitForResponse((r) => r.url().includes("/api/newlife"));
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  console.log("Seed:", new URL((await made).url()).searchParams.get("seed"));
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  if (process.env.BENCH_TRACE)
    console.log("Card:", (await page.locator("#card").innerText()).slice(0, 300));
  // Scenes and stops that hold the clock are left, as a player would leave
  // them (Continue on a stop).
  const leaveScenes = async () => {
    const exits =
      "#talk-leave:visible, #talk-next:visible, #talk-skip:visible, #continue:visible";
    for (
      let i = 0;
      i < 12 &&
      (await page.locator("#talk:visible, #continue:visible").count());
      i += 1
    ) {
      // The scene's own way out, or else its first answer ("Continue").
      if (await page.locator(exits).count())
        await page.locator(exits).first().click();
      else if (await page.locator("#talk-choices button:visible").count())
        await page.locator("#talk-choices button:visible").first().click();
      await page.waitForTimeout(500);
    }
  };
  await leaveScenes();
  if (process.env.BENCH_TRACE)
    await page.screenshot({ path: `${shots}/start.png` });
  // Played on by the calendar to BENCH_JUMP; a scene on the way stops the
  // jump there, so it is left and the jump taken again.
  const jump = process.env.BENCH_JUMP;
  for (let tries = 0; jump && tries < 40; tries += 1) {
    await page.locator('.ring[data-tab="calendar"]').click();
    await page.locator("#sheet-body .calendar-month").waitFor();
    for (
      let m = 0;
      m < 24 && !(await page.locator(`[data-date="${jump}"]`).count());
      m += 1
    )
      await page.locator('.calendar-heading [aria-label="Next month"]').click();
    await page.locator(`[data-date="${jump}"]`).click();
    // No jump offered: the world stands on that day.
    if (!(await page.locator(".go-to-day").count())) {
      await page.getByTestId("sheet-close").click();
      break;
    }
    await page.locator(".go-to-day").click();
    const moved = await page.waitForResponse(
      (r) => r.url().includes("/api/advance"),
      { timeout: 600000 },
    );
    if (process.env.BENCH_TRACE)
      console.log(
        "jump",
        tries,
        moved.status(),
        (await moved.text()).slice(0, 300),
      );
    await page.waitForTimeout(1000);
    if (process.env.BENCH_TRACE) {
      await page.screenshot({ path: `${shots}/jump-${tries}.png` });
      console.log(
        "talk",
        tries,
        (
          await page
            .locator("#talk")
            .innerText()
            .catch(() => "")
        ).slice(0, 400),
      );
    }
    await leaveScenes();
  }
  if (jump) console.log("Played on to:", jump);
  const clock = async () =>
    (await page.locator("#card-clock").innerText()).replace(/\s+/g, " ").trim();
  const toOffice = async () => {
    await page.locator('.ring[data-tab="travel"]').click();
    if (process.env.BENCH_TRACE) {
      await page.locator("#sheet-body .entry").first().waitFor();
      console.log(
        "travel",
        (await page.locator("#sheet-body").innerText()).slice(0, 1500),
      );
      await page.screenshot({ path: `${shots}/travel.png` });
    }
    // The first office that takes filings: its card says "You file here",
    // on whichever page of Travel it falls.
    const card = page
      .locator("#sheet-body .entry", { hasText: /You file here/ })
      .first();
    await page.locator("#sheet-body .entry").first().waitFor();
    for (
      let p = 0;
      p < 10 &&
      !(await card.isVisible()) &&
      (await page
        .locator("#sheet-body .pager-arrow:last-child:not([disabled])")
        .count());
      p += 1
    )
      await page.locator("#sheet-body .pager-arrow").last().click();
    await card.waitFor();
    await card.click();
    await page.getByTestId("place-go").waitFor();
  };
  const evening = await clock();
  console.log("Clock:", evening);
  // The opening evening, or the jumped-to day while its office is shut.
  if (!jump)
    assert.match(evening, /8:30 PM|PM/, "the check starts in the evening");
  await toOffice();
  const card = await page.locator("#sheet-body").innerText();
  assert.match(card, /Closed now\. Opens .* at \d{1,2}:\d{2} [AP]M\./, card);
  console.log("Card:", card.match(/Closed now\. Opens [^\n]*/)[0]);
  if (shots)
    await page.screenshot({ path: `${shots}/closed-card-1440x900.png` });
  await page.getByTestId("place-go").click();
  // The narrator sets the counter up first; Continue, then the clerk asks.
  for (
    let i = 0;
    i < 4 && !(await page.locator("#talk-choices button").count());
    i += 1
  ) {
    await page.waitForTimeout(600);
    if (await page.locator("#talk-next:visible").count())
      await page.locator("#talk-next").click();
  }
  await page.locator("#talk-choices button").first().waitFor();
  const morning = await clock();
  console.log("Clock at the counter:", morning);
  assert.match(morning, /AM/, "the visit plays in the morning");
  assert.notEqual(morning, evening, "the clock did not move to the opening");
  if (shots)
    await page.screenshot({ path: `${shots}/counter-at-opening-1440x900.png` });
  await page.locator("#talk-leave").click();
  await page.locator("#talk").waitFor({ state: "hidden" });
  // Back at the counter the same morning: open, no closed line.
  await toOffice();
  const again = await page.locator("#sheet-body").innerText();
  assert.doesNotMatch(again, /Closed now/, "an open office says closed");
  assert.deepEqual(errors, []);
  console.log("office hours: pass");
} finally {
  await browser.close();
}
