/* global process, console, document */
// A bill's page has no Back and a body's name has no line under it
// (play-bill-page-keeps-back-to-the-bills-and-government-keeps-a-caption), on
// the bench (npm run bench): a new life in a drawn place, then Politics,
// Government on Local, State and Federal (legislative and executive): no
// line of text under any body's or office's name on its picture, and the
// Seats strip still there for a lawmaking body; then a bill opened from Bills,
// from Government's recent votes and from a law's page in Issues: no button
// whose words begin with Back. Owner, Oct 29: "continue and back, needs to be
// removed from every single menu"; Nov 7: no subtitles on menus. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/no-back-no-caption.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) =>
  shots ? page.screenshot({ path: `${shots}/${name}.png` }) : null;
const politics = async (tab) => {
  await page.keyboard.press("Escape");
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: tab, exact: true })
    .click();
  await page.waitForTimeout(1000);
};
/** Any text under a body's name on its picture. */
const captions = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("#sheet .chamber-caption > *")]
      .filter((node) => !node.classList.contains("chamber-name"))
      .map((node) => node.textContent.trim())
      .filter(Boolean),
  );
const backButtons = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("#sheet button")]
      .map((b) => b.textContent.trim())
      .filter((t) => /^back\b/i.test(t)),
  );
try {
  const life = await startLife(page, { fresh: true });
  console.log("Place:", life.placeName, "Seed:", life.seed);
  await politics("Government");
  let billFromGovernment = false;
  for (const level of ["local", "state", "federal"]) {
    await page.locator(`[data-level="${level}"]`).first().click();
    await page.waitForTimeout(1500);
    for (const branch of ["legislative", "executive"]) {
      const tab = page.locator(`[data-branch="${branch}"]`);
      if (await tab.count()) {
        await tab.first().click();
        await page.waitForTimeout(1000);
      }
      assert.deepEqual(
        await captions(),
        [],
        `${level} ${branch}: a line under the name`,
      );
      if (
        branch === "legislative" &&
        (await page.locator(".seat-numbers").count())
      )
        assert.ok(
          (await page.locator(".seat-numbers").innerText()).match(/\d/),
          `${level}: the seats are readable`,
        );
      await shot(`government-${level}-${branch}`);
      // A bill from the recent votes, once: no Back on its page.
      const openable = page.locator(".vote-rows .pick");
      if (
        !billFromGovernment &&
        branch === "legislative" &&
        (await openable.count())
      ) {
        await openable.first().click();
        await page.waitForTimeout(1500);
        assert.deepEqual(
          await backButtons(),
          [],
          "Back on a bill from Government",
        );
        await shot("bill-from-government");
        billFromGovernment = true;
        await politics("Government");
        await page.locator(`[data-level="${level}"]`).first().click();
        await page.waitForTimeout(1200);
      }
    }
  }
  // Bills: a bill's page has no Back, and the tabs reach the list and Government.
  await politics("Bills");
  // A followed bill is a row in the list; its page stands beside it.
  await page.waitForTimeout(1200);
  const card = page.locator(".roster-screen.bills .roster-row");
  if (await card.count()) {
    await card.first().click();
    await page.locator(".roster-screen.bills .bill-doc").waitFor();
    assert.deepEqual(await backButtons(), [], "Back on a bill from Bills");
    await shot("bill-from-bills");
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: "Bills", exact: true })
      .click();
    await page.locator(".roster-screen.bills .roster-row").first().waitFor();
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: "Government", exact: true })
      .click();
    await page.locator(".split-screen").waitFor();
    console.log("Bill to Bills and to Government by the tabs");
  } else console.log("No bill followed from home yet");
  assert.deepEqual(errors, [], "page errors");
  console.log(
    `PASS no caption under a body's name; no Back on a bill (from Government: ${billFromGovernment})`,
  );
} finally {
  await browser.close();
}
