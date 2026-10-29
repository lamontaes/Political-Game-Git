/**
 * How often a played year records each event kind a director cause would read,
 * and who each record names. Development tooling for wiring a producer: a cause
 * whose event no engine records in play is not a producer (look before you wire),
 * and a rare event is proven by replaying the same world with its people watched.
 * Shipped play never imports it.
 *
 *   node --import tsx scripts/dialogue-batch/event-count.ts --seed <seed> --kinds a,b [--days 365] [--draws 1]
 *
 * Each draw takes the next place drawn from all 56 by the seed (`<seed>:<n>`),
 * so a scan over several draws finds a town where a rare record happens.
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "event-count");
const kinds = option("kinds", "")
  .split(",")
  .map((kind) => kind.trim())
  .filter(Boolean);
const days = Number(option("days", "365"));
const draws = Number(option("draws", "1"));
if (!kinds.length) {
  console.error(
    "Name the event kinds: --kinds family.separated,justice.released",
  );
  process.exit(1);
}

setBookkeeping(false);
for (let draw = 0; draw < draws; draw += 1) {
  const runSeed = draws > 1 ? `${seed}:${draw}` : seed;
  const place = drawPlace(runSeed, "event-count");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const start = core.date;
  advanceCore(core, addDays(makeIsoDate(core.date), days));
  for (const kind of kinds) {
    const rows = [...(core.logByKind.get(kind) ?? [])]
      .map((id) => core.durableLog.get(id as never))
      .filter((row) => row && row.date >= start);
    console.log(
      `${place.name} (${place.key}), seed ${runSeed}: ${kind} ${rows.length}`,
    );
    for (const row of rows.slice(0, 5))
      console.log(
        `  ${row!.date} ${row!.id} names ${row!.personIds
          .filter((id) => core.people.has(id))
          .join(", ")}`,
      );
  }
}
