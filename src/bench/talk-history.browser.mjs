/* global process, console, document, getComputedStyle */
// What was said before is set apart from the line being said now (owner, Oct 26):
// in a household talk after two exchanges the history is its own element, in a
// different color, with a rule between it and the current line, and the current
// line is the last block. A drawn place (New world), first evening.
// Run against a fresh bench: node src/bench/talk-history.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { finishTalk, startLife, toReplies } from "./start-life.mjs";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await startLife(page, {
    url: `http://localhost:${process.env.BENCH_PORT ?? 3000}/play`,
    fresh: true,
  });
  console.log("Place:", await page.locator("#card-place").innerText());
  // The first person's talk may end after one exchange (the talk after the
  // President's address has one), which leaves no history to read. Talk to
  // each person in the room in turn, and when none has a talk of two
  // exchanges let an hour pass (a day, after the first day) and try the room again, up to a month; a check
  // that accepted a one-exchange talk would have nothing to check.
  let twoExchanges = false;
  let tried = 0;
  for (let step = 0; step < 48 && !twoExchanges; step += 1) {
    if (step) {
      // A talk still open from the last try is left first.
      const leave = page.locator("#talk-leave");
      if (await leave.isVisible()) await leave.click({ timeout: 15000 });
      await page
        .locator(step < 24 ? "#hour:not([disabled])" : "#day:not([disabled])")
        .click({ timeout: 15000 })
        .catch(async (e) => {
          await page.screenshot({ path: "/tmp/claude-0/th-fail.png" });
          throw e;
        });
      await page.waitForTimeout(700);
      // A scene the day stops on is played through before the room is back.
      if (await page.locator("#talk:not([hidden])").count())
        await finishTalk(page).catch(() => undefined);
    }
    const people = page.locator("#here .busts-person.talkable");
    const count = await people.count();
    for (let at = 0; at < count && !twoExchanges; at += 1) {
      tried += 1;
      try {
        await people.nth(at).focus();
        // A person in the room is talked to by a key (owner, Oct 27: no Talk button).
        await page.keyboard.press("Enter");
        await page.locator("#talk:not([hidden])").waitFor({ timeout: 15000 });
        twoExchanges = true;
        for (let turn = 0; turn < 2; turn++) {
          // A talk may open with lines and Continue before its replies.
          if (!(await toReplies(page))) {
            twoExchanges = false;
            break;
          }
          const reply = page.locator("#talk-choices .reply").first();
          const before = await page.locator("#talk-lines").innerText();
          await reply.click({ timeout: 15000 });
          await page.waitForFunction(
            (text) => document.getElementById("talk-lines").innerText !== text,
            before,
            { timeout: 15000 },
          );
        }
      } catch {
        // A talk the screen could not play through is not a talk of two exchanges.
        twoExchanges = false;
      }
      // A talk that ended early is left, and the next person tried.
      if (!twoExchanges && (await page.locator("#talk:not([hidden])").count()))
        await finishTalk(page).catch(() => undefined);
    }
  }
  assert.ok(
    twoExchanges,
    `none of the ${tried} talks tried in a month had two exchanges`,
  );
  const read = await page.evaluate(() => {
    const list = document.getElementById("talk-lines");
    const blocks = [...list.children];
    const history = list.querySelector(".history");
    const current = list.querySelector(".speech:last-child");
    const color = (node) => node && getComputedStyle(node).color;
    return {
      kinds: blocks.map((node) => node.className.split(" ")[0]),
      historyColor: color(history),
      currentColor: color(current),
      rule: history ? getComputedStyle(history).borderBottomWidth : "",
      who: history?.querySelector(".history-who")?.textContent?.trim() ?? "",
      lastIsCurrent: blocks.at(-1)?.classList.contains("speech") ?? false,
    };
  });
  console.log(JSON.stringify(read));
  assert.ok(read.kinds.includes("history"), "there is no history block");
  assert.ok(read.lastIsCurrent, "the current line is not the last block");
  assert.notEqual(
    read.historyColor,
    read.currentColor,
    "the history and the current line share a color",
  );
  assert.notEqual(read.rule, "0px", "no rule separates the history");
  assert.ok(read.who, "the history does not name its speaker");
  if (shots)
    await page.screenshot({
      path: `${shots}/${process.env.SHOT_NAME ?? "after"}-talk-history.png`,
    });
  assert.deepEqual(errors, []);
  console.log(
    "PASS talk history is a separate, quieter block above the current line",
  );
} finally {
  await browser.close();
}
