/* global process, console, document, URL */
// An office keeps its clerk's hours (owner, Nov 1: "obviously the office isn't
// open at 8:30 p.m."): on the opening evening the filing office's Travel card
// says when it opens, Go plays the visit at that opening with the clock moved
// there, and a second visit that morning finds it open (no line, no move).
// BENCH_SEED replays a world. Run against a fresh bench:
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
  if (process.env.BENCH_SEED)
    await page.route("**/api/newlife*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("seed", process.env.BENCH_SEED);
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
  for (
    let i = 0;
    i < 8 && (await page.locator("#talk:visible").count());
    i += 1
  ) {
    await page
      .locator("#talk-leave:visible, #talk-next:visible, #talk-skip:visible")
      .first()
      .click();
    await page.waitForTimeout(500);
  }
  const clock = async () =>
    (await page.locator("#card-clock").innerText()).replace(/\s+/g, " ").trim();
  const toOffice = async () => {
    await page.locator('.ring[data-tab="travel"]').click();
    await page.waitForTimeout(600);
    await page
      .getByText(
        /Division of Elections|Clerk|Registrar|Board of Elections|Elections/,
      )
      .first()
      .click();
    await page.getByTestId("place-go").waitFor();
  };
  const evening = await clock();
  console.log("Clock:", evening);
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
