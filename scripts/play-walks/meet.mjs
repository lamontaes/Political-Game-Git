/* global process */
// A new life, the first morning, then the places Travel lists, one after
// another: who is there, a talk with up to two of them, and the way home at
// the end. Writes down every line and reply.
// Run on a fresh bench: node scripts/play-walks/meet.mjs <out-dir> [places]
import {
  clockOf,
  hereOf,
  newLife,
  openMenu,
  openWalk,
  playTalk,
  pressDay,
  talkToEveryone,
} from "./lib.mjs";

const walk = await openWalk(process.argv[2] ?? "play-walk-meet");
const places = Number(process.argv[3] ?? 3);
const { page } = walk;
const detail = async () =>
  (await page.locator(".travel-detail").innerText())
    .replace(/\n+/g, " / ")
    .slice(0, 400);
try {
  await newLife(walk);
  await pressDay(walk);
  for (let at = 0; at < places; at += 1) {
    await openMenu(page, "travel");
    // Places only: the way home and the offices that open their own screen are not visits.
    const tiles = page.locator(
      '.travel-tile:not([data-filing]):not([data-place="Home"])',
    );
    if (at === 0) {
      const names = await page.locator(".travel-tile b").allInnerTexts();
      walk.say(`Travel lists ${names.length}: ${names.join(" | ")}`);
      await walk.snap("travel");
    }
    if (at >= (await tiles.count())) break;
    await tiles.nth(at).click();
    await page.waitForTimeout(700);
    walk.say(`>>> goes to: ${await detail()}`);
    await page.locator(".travel-go").first().click();
    await page.waitForTimeout(2500);
    await playTalk(walk, "arriving");
    const here = await hereOf(page);
    walk.say(
      `=== [${await clockOf(page)}] there: ${here.map((p) => p.name).join(", ") || "nobody"}`,
    );
    await walk.snap("there");
    await talkToEveryone(walk, 2);
    const still = await hereOf(page);
    walk.say(
      `=== [${await clockOf(page)}] after the talks: ${still.map((p) => p.name).join(", ") || "nobody"}`,
    );
  }
  await openMenu(page, "travel");
  const home = page.locator('.travel-tile[data-place="Home"]');
  if (await home.count()) {
    await home.click();
    await page.waitForTimeout(600);
    await page.locator(".travel-go").first().click();
    await page.waitForTimeout(2500);
    const here = await hereOf(page);
    walk.say(
      `=== [${await clockOf(page)}] home: ${here.map((p) => p.name).join(", ") || "nobody"}`,
    );
    await walk.snap("home");
  } else walk.say("Travel offers no way home");
} finally {
  await walk.close();
}
