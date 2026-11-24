/* global process, console, document */
// No caption sits under a race's buttons on Politics > Elections, in a real browser on the bench
// (npm run bench) (the CTO's catch and send-back, Nov 24; the Nov 8 no-subtext rule): a race not yet
// open to file for shows its dates and its Sim button alone, and a race the player cannot run for, or whose
// filing has closed, says so on a disabled button, with no Sim to a filing date that is not theirs. Each race on the
// ballot is made one or the other in turn (an edge case made by hand; the clerk's real answer
// carries the same `bar`).
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const scenario = { bar: "window-not-open" };
try {
  await startLife(page, { fresh: true });
  await page.route("**/api/government/local-races", async (route) => {
    const ballot = await (await route.fetch()).json();
    for (const race of ballot.races ?? []) {
      race.bar = scenario.bar;
      race.barWhy = null;
      race.mayAnnounce = false;
      race.announced = false;
      if (scenario.bar === "window-closed") {
        race.filingOpen = false;
        race.filingClosed = true;
        race.playerMayFile = false;
        race.filedWith = null;
      }
    }
    await route.fulfill({ json: ballot });
  });
  const open = async () => {
    await page
      .locator('#rings [data-tab="politics"]')
      .first()
      .evaluate((tab) => tab.click());
    await page
      .locator("#sheet button", { hasText: "Elections" })
      .first()
      .click();
    await page.locator(".roster-row").first().waitFor();
  };
  const read = async (bar) => {
    const rows = await page.locator(".roster-row").count();
    const seen = { rows, disabled: 0, sims: 0 };
    // The race open when the page opens, then each row in turn.
    for (let at = -1; at < rows; at += 1) {
      if (at >= 0) await page.locator(".roster-row").nth(at).click();
      await page.waitForTimeout(500);
      const state = await page.evaluate(() => {
        const body = document.getElementById("sheet-body");
        const captions = [...body.querySelectorAll(".record-empty")]
          .map((node) => node.textContent ?? "")
          .filter((text) =>
            /hasn.t opened|can.t run for this office|has closed/i.test(text),
          );
        const buttons = [...body.querySelectorAll("button")];
        return {
          captions,
          sims: buttons.filter((b) =>
            /^sim to/i.test(b.textContent?.trim() ?? ""),
          ).length,
          disabled: buttons.filter(
            (b) =>
              b.disabled &&
              /can.t run for this office|has closed/i.test(b.textContent ?? ""),
          ).length,
        };
      });
      assert.deepEqual(
        state.captions,
        [],
        `${bar}: a caption sits under the buttons (row ${at})`,
      );
      if (bar !== "window-not-open")
        assert.equal(
          state.sims,
          0,
          `${bar}: a Sim to a filing date that is not theirs (row ${at})`,
        );
      seen.sims += state.sims;
      seen.disabled += state.disabled;
    }
    return seen;
  };
  await open();
  const notOpen = await read("window-not-open");
  scenario.bar = "not-your-office";
  await page.locator("#sheet-close").click();
  await open();
  const refused = await read("not-your-office");
  scenario.bar = "window-closed";
  await page.locator("#sheet-close").click();
  await open();
  const closed = await read("window-closed");
  console.log(
    `ok: not yet open: ${notOpen.rows} races, ${notOpen.sims} Sim buttons, no caption; not theirs: ${refused.rows} races, ${refused.disabled} disabled buttons carry the words, no Sim, no caption; closed: ${closed.rows} races, ${closed.disabled} disabled buttons carry the words, no Sim, no caption`,
  );
} finally {
  await browser.close();
}
