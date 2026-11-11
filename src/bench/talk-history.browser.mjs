/* global process, console, document, getComputedStyle */
// What was said before is set apart from the line being said now (owner, Oct 26):
// in a household talk after two exchanges the history is its own element, in a
// different color, with a rule between it and the current line, and the current
// line is the last block. A drawn place (New world), first evening.
// Run against a fresh bench: node src/bench/talk-history.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import {
  finishTalk,
  startLife,
  toReplies,
  someoneToTalkTo,
} from "./start-life.mjs";

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
  // A person in the room is talked to by a key (owner, Oct 27: no Talk button).
  // Someone whose talk offers replies: a talk that only tells something is
  // played to its end and the next person in the room is asked.
  let replying = false;
  for (let hour = 0; hour < 12 && !replying; hour += 1) {
    const people = await someoneToTalkTo(page);
    const count = await people.count();
    for (let at = 0; at < count && !replying; at += 1) {
      await people.nth(at).focus();
      await page.keyboard.press("Enter");
      await page.locator("#talk:not([hidden])").waitFor();
      replying = await toReplies(page);
      if (!replying) await finishTalk(page);
    }
    // No one here has more to say than a line: an hour on, and ask again.
    if (!replying) {
      await page.locator("#hour").click();
      await page.waitForFunction(
        () => !document.getElementById("hour")?.disabled,
      );
      await finishTalk(page);
    }
  }
  // Up to two exchanges: the first reply, then a second where the talk offers
  // one at once (a short talk has one exchange, and the history is read
  // before Continue would close it).
  for (let turn = 0; turn < 2; turn++) {
    if (turn > 0 && !(await page.locator("#talk-choices .reply").count()))
      break;
    // A talk may open with lines and Continue before its replies.
    const offered = await toReplies(page);
    console.log(
      `turn ${turn + 1}: ${offered ? "replies offered" : "no replies"} (${await page
        .locator("#talk-name")
        .innerText()
        .catch(() => "")})`,
    );
    assert.ok(offered, "the talk ended with no reply to choose");
    const reply = page.locator("#talk-choices .reply").first();
    const before = await page.locator("#talk-lines").innerText();
    await reply.click();
    await page.waitForFunction(
      (text) => document.getElementById("talk-lines").innerText !== text,
      before,
    );
  }
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
