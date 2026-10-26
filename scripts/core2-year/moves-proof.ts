/**
 * Moves from causes, in a played year: departures land on the day each
 * person's pull reaches the point of leaving or the day after a cause reached
 * them, not on the 1st; no officeholder leaves without a recorded cause.
 * Run: node --import tsx scripts/core2-year/moves-proof.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { departuresSeen, watchDepartures } from "../../src/core2/modules/moves";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
watchDepartures(core);
console.log(
  `${world.place.displayName}, seed ${seed}, ${core.people.size} people`,
);

// Who holds office, read each day before the day runs.
const seatedOn = new Map<string, Set<string>>();
const seated = () => {
  const ids = new Set<string>();
  for (const row of api
    .moduleState("core2-officials-v1")
    .table("officials")
    .rows())
    if (row.ended === null) ids.add(row.id);
  for (const row of api.moduleState("core2-offices-v1").table("terms").rows())
    if (row.status === "serving" && typeof row.personId === "string")
      ids.add(row.personId);
  return ids;
};
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const end = addDays(makeIsoDate(core.date), 365);
while (core.date < end) {
  seatedOn.set(core.date, seated());
  dev.advance(addDays(makeIsoDate(core.date), 1));
}

const departures = departuresSeen(core);
const byDay = new Map<string, number>();
for (const row of departures) {
  const day = row.date.slice(8);
  byDay.set(day, (byDay.get(day) ?? 0) + 1);
}
const onFirst = byDay.get("01") ?? 0;
console.log(
  `${departures.length} departures; ${onFirst} on a 1st; by day of month:`,
  JSON.stringify([...byDay].sort()),
);
const lifeCauses = new Set(["lifeStage", "opening"]);
let officeholders = 0,
  uncaused = 0;
for (const row of departures) {
  const before = seatedOn.get(addDays(makeIsoDate(row.date), -1)) ?? new Set();
  const held = row.withIds.filter(
    (id) => before.has(id) || seatedOn.get(row.date)?.has(id),
  );
  if (!held.length) continue;
  officeholders += 1;
  const causes = Object.keys(row.reasons).filter(
    (key) =>
      !lifeCauses.has(key) &&
      !key.startsWith("hold:") &&
      !key.startsWith("push:"),
  );
  const events = causes.flatMap((key) => row.reads[key] ?? []);
  if (!events.length) uncaused += 1;
  console.log(
    `officeholder ${held.join(", ")} left on ${row.date} (departure ${row.id}): causes ${JSON.stringify(causes)}, events ${JSON.stringify(events)}`,
  );
}
console.log(
  `${officeholders} departures took an officeholder; ${uncaused} of them without a recorded event.`,
);
const sample = departures.slice(0, 5);
for (const row of sample)
  console.log(
    `departure ${row.id}: ${row.personId} on ${row.date}, reasons ${JSON.stringify(row.reasons)}`,
  );
