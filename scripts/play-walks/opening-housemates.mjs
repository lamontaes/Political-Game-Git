/* global process */
// A new life, then the opening day's talk with each person at home, pressed the way a player presses:
// click the person (talkable or not), play the talk to its end taking each reply in turn, write down every
// line said and every reply offered. Run on a fresh bench:
//   BENCH_SEED=21 node scripts/play-walks/opening-housemates.mjs <out-dir>
import { hereOf, newLife, openWalk, playTalk } from "./lib.mjs";

const walk = await openWalk(process.argv[2] ?? "play-walk-opening-housemates");
try {
  await newLife(walk);
  await walk.page.waitForTimeout(3000);
  // The opening ends on "The day is done" with Continue; a player presses it to reach the room.
  const go = walk.page.getByRole("button", { name: "Continue" });
  if (await go.isVisible().catch(() => false)) await go.click();
  await walk.page.waitForTimeout(3000);
  const here = await hereOf(walk.page);
  walk.say(
    `here: ${here.map((p) => `${p.name}${p.talkable ? "" : " (not clickable)"}`).join(", ") || "nobody"}`,
  );
  for (const [at, person] of here.entries()) {
    walk.say(`>>> clicks ${person.name}`);
    await walk.page.locator("#here .busts-person").nth(at).click();
    await walk.page.waitForTimeout(2500);
    await walk.snap(`clicked-${at}`);
    await playTalk(walk, "talk", { most: 4, picture: false });
  }
} finally {
  await walk.close();
}
