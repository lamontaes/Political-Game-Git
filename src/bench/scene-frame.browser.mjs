/* global process, console, document, getComputedStyle */
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
    page.setDefaultTimeout(600000);
    page.on("pageerror", (e) => errors.push(e.message));
    const { seed, placeName } = await startLife(page, {
      url: `http://localhost:${process.env.BENCH_PORT ?? 3000}/play`,
      fresh: true,
    });
    console.log(`Seed ${seed}, ${placeName}`);
    const talkable = await someoneToTalkTo(page);
    await page.waitForTimeout(800);

    // The people of a room stand small in the top-right corner, packed as wide as they
    // are, and nothing is along the foot of the room (owner, Nov 24, mock C).
    const room = await page.evaluate(() => {
      const strip = document.querySelector("#here .bust-strip");
      const box = strip.getBoundingClientRect();
      const people = strip.querySelectorAll(".busts-person").length;
      return {
        people,
        width: box.width,
        top: box.top,
        rightGap: document.documentElement.clientWidth - box.right,
        bottom: box.bottom,
        height: document.documentElement.clientHeight,
      };
    });
    console.log(
      `Room: ${room.people} in the corner, ${room.width}px wide, top ${room.top}, right gap ${room.rightGap}`,
    );
    assert.ok(
      room.width <= room.people * 260 + 120,
      `the corner is ${room.width}px for ${room.people} people`,
    );
    assert.ok(room.top < 80, `the people are not at the top (${room.top}px)`);
    assert.ok(
      room.rightGap < 80,
      `the people are not at the right (${room.rightGap}px from it)`,
    );
    assert.ok(
      room.bottom < room.height / 3,
      "the people reach down into the room",
    );
    // The label never lies over a name.
    const clash = await page.evaluate(() => {
      const label = document.querySelector("#here .busts-label");
      if (!label || getComputedStyle(label).display === "none") return false;
      const a = label.getBoundingClientRect();
      return [...document.querySelectorAll("#here .busts-name")].some((n) => {
        const b = n.getBoundingClientRect();
        return (
          a.left < b.right &&
          b.left < a.right &&
          a.top < b.bottom &&
          b.top < a.bottom
        );
      });
    });
    assert.equal(clash, false, "the Here label is over a name");
    if (shots) await page.screenshot({ path: `${shots}/scene-frame-room.png` });

    // In a talk the speaker is on the talk box, big; the others stay small in the corner.
    await talkable.first().click();
    await page.locator("#talk-strip .talk-speaker").waitFor();
    await page.waitForTimeout(800);
    const talk = await page.evaluate(() => {
      const strip = document.querySelector("#talk-strip .talk-speaker");
      const card = document.getElementById("talk").getBoundingClientRect();
      const face = (cell) => cell.querySelector(".busts-face").offsetWidth;
      const corner = document.querySelector("#here .bust-strip");
      const shown = [...corner.querySelectorAll(".busts-person")].filter(
        (cell) => getComputedStyle(cell).display !== "none",
      );
      const box = strip.getBoundingClientRect();
      return {
        speaking: [...strip.querySelectorAll(".speaking")].map(face),
        quiet: shown.map(face),
        speakerBottom: box.bottom,
        cardTop: card.top,
        cornerTop: corner.getBoundingClientRect().top,
        cornerRightGap:
          document.documentElement.clientWidth -
          corner.getBoundingClientRect().right,
        bottomStrip: document.querySelectorAll("#talk-cast, #here.bottom")
          .length,
      };
    });
    console.log("Talk:", JSON.stringify(talk));
    assert.equal(talk.speaking.length, 1, "one person speaks");
    for (const size of talk.quiet)
      assert.ok(size < talk.speaking[0] * 0.7, "a silent person is shown big");
    assert.ok(
      Math.abs(talk.speakerBottom - talk.cardTop) < 40,
      "the speaker is not on the talk box",
    );
    assert.ok(talk.cornerTop < 80, "the others are not at the top");
    assert.ok(talk.cornerRightGap < 80, "the others are not at the right");
    assert.equal(talk.bottomStrip, 0, "an old strip is still drawn");
    if (shots) await page.screenshot({ path: `${shots}/scene-frame-talk.png` });

    // Anyone named in the corner opens their card.
    await page
      .locator("#here .busts-person.named, #here .busts-person.talkable")
      .first()
      .click();
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
