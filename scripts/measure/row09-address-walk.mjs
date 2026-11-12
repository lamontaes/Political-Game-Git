/* global process, document */
// Row 9: Week pressed from the opening across the governor's address (January 21, 2025) and the
// town's address; the clock is read every 300 ms so a clock that moves on and then back shows.
// LEAD_TO="<Month d, yyyy>" first presses Day up to that date.
// Run from a checkout of claude/words-speech-outline (its play-walks folder) with a bench on port 3000:
//   cp row09-address-walk.mjs <checkout>/scripts/play-walks/ && BENCH_SEED=<seed> node scripts/play-walks/row09-address-walk.mjs <out> [weeks]
import {
  newLife,
  openWalk,
  clockOf,
  talkOf,
  playTalk,
  pressDay,
} from "./lib.mjs";

const walk = await openWalk(process.argv[2] ?? "row09-walk");
const weeks = Number(process.argv[3] ?? 3);
const shown = (id) =>
  walk.page
    .locator(`#${id}`)
    .isVisible()
    .catch(() => false);
try {
  await newLife(walk);
  // LEAD_TO="February 6, 2025": press Day (scenes played) until the clock reads that date, so a Week starts a few days before an address.
  if (process.env.LEAD_TO)
    for (
      let i = 0;
      i < 80 && !(await clockOf(walk.page)).includes(process.env.LEAD_TO);
      i += 1
    )
      await pressDay(walk);
  for (let w = 1; w <= weeks; w += 1) {
    const before = await clockOf(walk.page);
    walk.say(`=== Week ${w} pressed at [${before}]`);
    await walk.page.locator("#week").click();
    let lastClock = before;
    const series = [before];
    for (let step = 0; step < 1500; step += 1) {
      await walk.page.waitForTimeout(300);
      const now = await clockOf(walk.page);
      if (now !== lastClock) {
        series.push(now);
        lastClock = now;
      }
      if (await shown("talk")) {
        const talk = await talkOf(walk.page);
        walk.say(
          `  scene opened with the clock at [${now}]: ${talk.name} | ${talk.lines.trim().split("\n").slice(0, 2).join(" / ").slice(0, 220)}`,
        );
        await playTalk(walk, "scene", { picture: false });
        const after = await clockOf(walk.page);
        walk.say(`  scene over, clock [${after}]`);
        if (after !== lastClock) {
          series.push(after);
          lastClock = after;
        }
      } else if (await shown("continue")) {
        walk.say(`  a stop at [${now}]: Continue`);
        await walk.page
          .locator("#continue")
          .click({ timeout: 5000 })
          .catch(() => null);
      } else if (
        await walk.page.evaluate(
          () => !document.getElementById("week").disabled,
        )
      )
        break;
    }
    walk.say(`  clock trail: ${series.join(" -> ")}`);
  }
} finally {
  await walk.close();
}
