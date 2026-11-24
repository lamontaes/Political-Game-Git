/* global process, console, document */
// Government follows the approved gov-local, gov-state and gov-federal mocks
// in two things the game's screen did differently: the sheet's title and its
// tabs share one row, and the room's painting runs across the whole screen as
// a short strip under the tabs, not a tall picture in the left column.
// Starts a life in a drawn place, opens Politics, and reads each level.
// Run against the bench: node src/bench/government-head.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const port = process.env.BENCH_PORT ?? 3000;
const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  const { seed, placeName } = await startLife(page, {
    url: `http://localhost:${port}/play`,
    fresh: true,
  });
  console.log("Seed:", seed, "Place:", placeName);
  await page.locator('#rings [data-tab="politics"]').evaluate((e) => e.click());
  await page.locator(".government-screen").waitFor();
  for (const level of ["Local", "State", "Federal"]) {
    await page
      .getByRole("button", { name: level, exact: true })
      .first()
      .click();
    await page.waitForTimeout(1200);
    if (shots)
      await page.screenshot({ path: `${shots}/government-${level}.png` });
    const m = await page.evaluate(() => {
      const box = (n) => n?.getBoundingClientRect();
      const title = box(document.querySelector("#sheet .sheet-head .heading"));
      const tabs = box(document.getElementById("sheet-tabs"));
      const screen = box(document.querySelector(".government-screen"));
      const room = document.querySelector(".government-screen > .chamber");
      const main = box(
        document.querySelector(".government-screen .split-main"),
      );
      return {
        sameRow: tabs.top < title.bottom && tabs.bottom > title.top,
        room: room ? box(room) : null,
        screenWidth: screen.width,
        mainTop: main.top,
      };
    });
    console.log(
      `${level}: title and tabs on one row ${m.sameRow}; room ${m.room ? `${Math.round(m.room.width)} of ${Math.round(m.screenWidth)} wide, ${Math.round(m.room.height)} tall` : "none"}`,
    );
    assert.ok(m.sameRow, `${level}: the tabs are not beside the title`);
    if (m.room) {
      assert.ok(
        m.room.width >= m.screenWidth - 2,
        `${level}: the room does not run across the screen`,
      );
      // Tall enough to read as a room (owner's Player, Nov 24: "a thin sliver of a painting, not a room"),
      // short enough to stay a strip under the tabs.
      assert.ok(
        m.room.height >= 100 && m.room.height <= 130,
        `${level}: the room is ${m.room.height} tall`,
      );
      assert.ok(
        m.room.bottom <= m.mainTop + 1,
        `${level}: the room is not above both columns`,
      );
    }
  }
  // A vote's name in Recent votes is never cut to an ellipsis, in a wide window or a narrow one.
  for (const width of [1440, 1000]) {
    await page.setViewportSize({ width, height: 900 });
    await page
      .getByRole("button", { name: "State", exact: true })
      .first()
      .click();
    await page.waitForTimeout(1200);
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll(".vote-rows .dotlabel")]
        .filter((n) => n.scrollWidth > n.clientWidth + 1)
        .map((n) => n.textContent.trim()),
    );
    console.log(`${width}px: ${clipped.length} vote names cut`);
    assert.deepEqual(clipped, [], `${width}px: a vote name is cut off`);
  }
  assert.deepEqual(errors, []);
  console.log("government head: pass");
} finally {
  await browser.close();
}
