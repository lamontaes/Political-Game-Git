/* global process, document, fetch */
// The local address as a player meets it: a new life, the days jumped on the
// calendar to the eve of the town's address (local-address.json, `town`
// monthDay), then Day pressed and the scene played and pictured, every line
// written down. The governor's address, a day after the opening, is played
// on the way when the walk passes it.
// Run on a fresh bench: node scripts/play-walks/address.mjs <out-dir> [eve] [days]
// BENCH_SEED=<seed> replays a life; the eve defaults to the day before the
// town's address in the first year.
import localData from "../../src/director/data/local-address.json" with { type: "json" };
import { newLife, openWalk, pressDay } from "./lib.mjs";

const walk = await openWalk(process.argv[2] ?? "play-walk-address");
const eveOf = (monthDay) => {
  const [month, day] = monthDay.split("-").map(Number);
  const date = new Date(Date.UTC(2025, month - 1, day - 1));
  return date.toISOString().slice(0, 10);
};
const eve = process.argv[3] ?? eveOf(localData.levels.town.monthDay);
const days = Number(process.argv[4] ?? 2);
try {
  await newLife(walk);
  // The governor's address comes the day after the opening.
  await pressDay(walk);
  await pressDay(walk);
  // On to the eve by Week and Day, as a player presses them, so every stop
  // on the way is met on screen.
  const daysLeft = async () => {
    const shown = await walk.page.locator("#card-clock").innerText();
    const [day] = /[A-Z][a-z]+ \d+, \d{4}/.exec(shown) ?? [];
    return (Date.parse(`${eve}T00:00:00Z`) - Date.parse(`${day} UTC`)) / 864e5;
  };
  for (let step = 0, left = await daysLeft(); step < 8 && left > 0; step += 1) {
    await pressDay(walk, left >= 7 ? "week" : "day");
    left = await daysLeft();
  }
  for (let day = 0; day < days; day += 1) await pressDay(walk);
} finally {
  await walk.close();
}
