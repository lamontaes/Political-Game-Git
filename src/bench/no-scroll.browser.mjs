/* global process, console, document */
// Every sheet of a new game, at the start and after a day, fits its window: the
// sheet's panel and the page overflow by no more than 8 pixels. A long body scrolls
// inside the panel under the game's own scroller; it never pages (owner, Oct 29).
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const SLACK = 8;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const bad = [];
try {
  // The one start: a new life (or the saved one) with its opening played through.
  await startLife(page);
  console.log(
    "Player:",
    await page.locator("#card-name").innerText(),
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  // A new life opens on its first evening at home, a scene the player goes
  // through before the day's controls show (as bill-stage.browser.mjs does):
  // a reply, Continue or Leave, until Day is there, or fail by name.
  const shown = (id) => page.locator(`#${id}`).isVisible();
  const throughTalk = async (when) => {
    for (let i = 0; i < 40; i += 1) {
      if (await shown("day")) return;
      const replies = page.locator("#talk-choices .reply");
      if ((await replies.count()) > 0 && (await replies.first().isVisible()))
        await replies.first().click();
      else if (await shown("talk-next"))
        await page.locator("#talk-next").click();
      else if (await shown("talk-leave"))
        await page.locator("#talk-leave").click();
      else if (await shown("continue")) await page.locator("#continue").click();
      await page.waitForTimeout(800);
    }
    throw new Error(`Day never showed ${when}: a scene stayed open`);
  };
  await throughTalk("after the opening");
  // Every screen: the rail's, Who you are from the portrait, and its Jobs and
  // study tab.
  const tabs = [
    ...(await page
      .locator("#rings [data-tab]")
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.tab))),
    "jobs",
  ];
  const scan = async (when) => {
    for (const tab of tabs) {
      if (tab === "jobs") {
        await page
          .locator('#rings [data-tab="who"]')
          .evaluate((e) => e.click());
        await page.locator('#sheet-tabs [data-tab="jobs"]').waitFor();
        await page.locator('#sheet-tabs [data-tab="jobs"]').click();
      } else
        await page
          .locator(`#rings [data-tab="${tab}"]`)
          .first()
          .evaluate((e) => e.click());
      await page.waitForTimeout(1500);
      // The sheet panel and the page: how far each holds more than it shows.
      const over = await page.evaluate(() => {
        const sheet = document.getElementById("sheet");
        const body = document.scrollingElement;
        const worst = {
          px: sheet.scrollHeight - sheet.clientHeight,
          where: "#sheet",
        };
        return {
          sheet: worst.px,
          where: worst.where,
          page: body.scrollHeight - body.clientHeight,
        };
      });
      console.log(
        `${when} · ${tab}: ${over.where} ${over.sheet}px, page ${over.page}px`,
      );
      if (over.sheet > SLACK || over.page > SLACK)
        bad.push(
          `${when} · ${tab}: ${over.where} over by ${over.sheet}px, page by ${over.page}px`,
        );
      await page.keyboard.press("Escape");
    }
    // Escape opens Options over a screen; close whatever is open before going on.
    if (await page.locator("#sheet").isVisible())
      await page.locator("#sheet-close").click();
  };
  await scan("start");
  // The evening's scene can open while the sheets are read: go through it.
  await throughTalk("before the first day");
  await page.locator("#day").click();
  await page.waitForFunction(() => !document.getElementById("day").disabled);
  await scan("after a day");
  console.log(bad.length ? bad.join("\n") : "no sheet scrolls");
  assert.deepEqual(errors, []);
  assert.deepEqual(bad, []);
  console.log(`PASS ${tabs.length} sheets, twice`);
} finally {
  await browser.close();
}
