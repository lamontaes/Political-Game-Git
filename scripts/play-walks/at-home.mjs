/* global process */
// A new life, then each day for a few days: talk to everyone at home who has
// something to say, then press Day. Writes down every line and reply.
// Run on a fresh bench: node scripts/play-walks/at-home.mjs <out-dir> [days]
import { hereOf, newLife, openWalk, pressDay, talkToEveryone } from "./lib.mjs";

const walk = await openWalk(process.argv[2] ?? "play-walk-at-home");
const days = Number(process.argv[3] ?? 3);
try {
  await newLife(walk);
  for (let day = 0; day <= days; day += 1) {
    const here = await hereOf(walk.page);
    walk.say(`here: ${here.map((p) => p.name).join(", ") || "nobody"}`);
    await talkToEveryone(walk);
    if (day < days) await pressDay(walk);
  }
} finally {
  await walk.close();
}
