/* global process, console, document */
// The frame a scene is shown in (owner, Nov 16 and 17): the strip is as wide as
// the people on it, silent people are never shown big (only the speaker is), and
// every named person on it opens their card. Plays a new life in a drawn place,
// one talk. Run against a fresh bench: node src/bench/scene-frame.browser.mjs [shot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife, someoneToTalkTo } from "./start-life.mjs";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const errors = [];
try {
  // A life with three or more at home shows the several-people case; the check
  // draws up to four lives for one and says if none had it.
  let sawMany = false;
  for (let life = 0; life < 4 && !sawMany; life += 1) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => errors.push(e.message));
    const { seed, placeName } = await startLife(page, {
      url: `http://localhost:${process.env.BENCH_PORT ?? 3000}/play`,
      fresh: true,
    });
    console.log(`Seed ${seed}, ${placeName}`);
    const talkable = await someoneToTalkTo(page);
    await page.waitForTimeout(800);

    // The strip along the foot of the room is as wide as its people.
    const room = await page.evaluate(() => {
      const strip = document.querySelector("#here .bust-strip");
      const area = document.getElementById("here").getBoundingClientRect();
      const people = strip.querySelectorAll(".busts-person").length;
      return {
        people,
        strip: strip.getBoundingClientRect().width,
        area: area.width,
      };
    });
    console.log(
      `Room: ${room.people} on a strip ${room.strip}px of ${room.area}px`,
    );
    assert.ok(
      room.strip <= room.people * 260 + 120,
      `the strip is ${room.strip}px for ${room.people} people`,
    );
    if (shots) await page.screenshot({ path: `${shots}/scene-frame-room.png` });

    // In a talk only the speaker is big.
    await talkable.first().click();
    await page.locator("#talk-strip .bust-strip").waitFor();
    await page.waitForTimeout(800);
    const talk = await page.evaluate(() => {
      const strip = document.querySelector("#talk-strip .bust-strip");
      const face = (cell) => cell.querySelector(".busts-face").offsetWidth;
      return {
        speaker: strip.dataset.speaker,
        speaking: [...strip.querySelectorAll(".speaking")].map(face),
        quiet: [...strip.querySelectorAll(".quiet")].map(face),
        width: strip.getBoundingClientRect().width,
      };
    });
    console.log("Talk strip:", JSON.stringify(talk));
    assert.equal(talk.speaking.length, 1, "one person speaks");
    for (const size of talk.quiet)
      assert.ok(size < talk.speaking[0] * 0.7, "a silent person is shown big");
    if (shots) await page.screenshot({ path: `${shots}/scene-frame-talk.png` });

    // Anyone named on the strip opens their card.
    await page.locator("#talk-strip .busts-person").first().click();
    await page.locator("#person").waitFor({ state: "visible" });
    assert.ok(
      (await page.locator("#person-name").innerText()).trim(),
      "a card opened with no name",
    );
    if (shots) await page.screenshot({ path: `${shots}/scene-frame-card.png` });
    sawMany = room.people >= 3;
    await page.close();
  }
  console.log(sawMany ? "several people seen" : "no life drew several people");
  assert.deepEqual(errors, []);
  console.log("scene-frame: ok");
} finally {
  await browser.close();
}
