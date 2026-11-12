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
  // Jump to the eve as the calendar does, continuing each stop on the way.
  const reached = await walk.page.evaluate(async (date) => {
    const post = async (path) => (await fetch(path, { method: "POST" })).json();
    let body = await post(`/api/advance?mode=calendar&date=${date}`);
    for (let step = 0; step < 400 && body.packet?.kind === "stop"; step += 1)
      body = await post(
        `/api/resume?kind=stop&pauseId=${encodeURIComponent(body.packet.pauseId)}`,
      );
    return body.packet?.at?.date ?? body.packet?.kind ?? "unknown";
  }, eve);
  walk.say(`=== calendar jump to ${eve}: reached ${reached}`);
  await walk.page.reload();
  await walk.page.locator("#front-continue").click();
  await walk.page.waitForFunction(() =>
    document.getElementById("card-clock")?.textContent.trim(),
  );
  for (let day = 0; day < days; day += 1) await pressDay(walk);
} finally {
  await walk.close();
}
