/* global process, console, document, getComputedStyle, URL */
// What was said before is set apart from the line being said now (owner, Oct 26):
// in a household talk after two exchanges the history is its own element, in a
// different color, with a rule between it and the current line, and the current
// line is the last block. A drawn place (New world), first evening.
// Run against a fresh bench: node src/bench/talk-history.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  if (await page.locator("#new-advanced").isVisible())
    await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  console.log("Seed:", new URL((await made).url()).searchParams.get("seed"));
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  const figure = page.locator("#people .talkable").first();
  await figure.waitFor();
  await figure.focus();
  // A person in the room is talked to by a key (owner, Oct 27: no Talk button).
  await page.keyboard.press("Enter");
  await page.locator("#talk:not([hidden])").waitFor();
  // Two exchanges: pick the first reply twice.
  for (let turn = 0; turn < 2; turn++) {
    const reply = page.locator("#talk-choices .reply").first();
    await reply.waitFor();
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
