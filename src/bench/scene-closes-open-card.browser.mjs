/* global process, console, document */
// A scene that comes due while a menu is open closes the menu and opens (owner, Nov 16: "I think
// I'm stuck... I pressed escape"; crew list #9747, item 3b). The rail stays live while a day runs,
// so a player who opens People, Journal or any other menu after pressing Day had the scene drawn
// under it: the clock was held and nothing on screen said why.
// On the bench (npm run bench) at 1440x900: a new life in a drawn place (BENCH_SEED replays one).
// Each day the check presses Day and opens People before the day's answer lands (the answer is
// held until the menu shows, so the order never depends on the machine's speed), until a scene
// comes due. Then: the menu is closed, the scene's talk shows and its button can be pressed; one
// Escape opens Options and a second closes it with the scene still there. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium [BENCH_SEED=<seed>] node src/bench/scene-closes-open-card.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { finishTalk, startLife } from "./start-life.mjs";

/** The most days played while waiting for a scene to come due. Engineering value. */
const MAX_DAYS = 45;
const [shots] = process.argv.slice(2);
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) =>
  shots ? page.screenshot({ path: `${shots}/${name}.png` }) : null;
/** What holds the screen now: the menu, the talk, and whether the talk's button is on top. */
const screen = () =>
  page.evaluate(() => {
    const shown = (id) => {
      const el = document.getElementById(id);
      return Boolean(el && !el.hidden && el.offsetParent !== null);
    };
    const onTop = (el) => {
      const box = el.getBoundingClientRect();
      const top = document.elementFromPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      return top === el || el.contains(top);
    };
    const buttons = [
      document.getElementById("talk-next"),
      document.querySelector("#talk-choices .reply"),
      document.getElementById("talk-leave"),
    ].filter((el) => el && !el.hidden && el.offsetParent !== null);
    return {
      menu: shown("sheet"),
      talk: shown("talk"),
      held: document.getElementById("day").disabled,
      pressable: buttons.some(onTop),
    };
  });
try {
  if (process.env.BENCH_SEED) {
    await page.goto(`${base}/play`);
    const made = await page.request.post(
      `${base}/api/newlife?seed=${process.env.BENCH_SEED}`,
      { timeout: 600000 },
    );
    assert.equal(made.status(), 200, "the world builds from the seed");
  }
  const life = await startLife(page, { fresh: !process.env.BENCH_SEED });
  const where = `${life.placeName ?? (await page.locator("#card-place").innerText())}, seed ${life.seed ?? process.env.BENCH_SEED}`;
  console.log(`SCENE OVER CARD BROWSER: ${where}`);
  // The line that lands the player at home opens a moment after the address ends.
  await page.waitForTimeout(1500);
  await finishTalk(page);

  // The day's answer waits until the menu is open, as it does when the day is slow.
  let release = () => {};
  await page.route("**/api/advance*", async (route) => {
    await new Promise((resolve) => (release = resolve));
    await route.continue();
  });
  let seen = null;
  for (let day = 1; day <= MAX_DAYS && !seen; day += 1) {
    const landed = page.waitForResponse(
      (r) => r.url().includes("/api/advance"),
      { timeout: 300000 },
    );
    await page.locator("#day").click();
    await page.locator('#rings .ring[data-tab="people"]').click();
    await page.locator("#sheet").waitFor({ state: "visible" });
    release();
    await landed;
    // The day has landed when the clock is free again or something holds it.
    await page.waitForFunction(() => {
      const day = document.getElementById("day");
      const talk = document.getElementById("talk");
      return !day.disabled || (talk && !talk.hidden);
    });
    await page.waitForTimeout(1500);
    const now = await screen();
    if (now.talk) seen = { day, ...now };
    else {
      assert.ok(now.menu, `day ${day}: with no scene, the menu stays open`);
      await page.keyboard.press("Escape");
      await page.locator("#sheet").waitFor({ state: "hidden" });
    }
  }
  assert.ok(
    seen,
    `no scene came due in ${MAX_DAYS} days at ${where}; nothing was checked`,
  );
  await shot("scene-due-with-menu-open");
  console.log(`a scene came due on day ${seen.day} with People open`);
  assert.equal(seen.menu, false, "the menu closed when the scene came due");
  assert.ok(seen.pressable, "the scene's button is on top and can be pressed");

  // Escape during a scene opens Options; the next one closes it and the scene is still there.
  await page.keyboard.press("Escape");
  await page.locator("#sheet").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.locator("#sheet").waitFor({ state: "hidden" });
  const after = await screen();
  assert.ok(
    after.talk && after.pressable,
    "the scene is still there after Options",
  );
  // The scene plays to its end and the clock is free again.
  await page.unroute("**/api/advance*");
  await finishTalk(page);
  await page.waitForFunction(
    () =>
      !document.getElementById("day").disabled ||
      !document.getElementById("talk").hidden,
  );
  await shot("after-the-scene");
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS a scene that comes due closes the open menu and opens");
} finally {
  await browser.close();
}
