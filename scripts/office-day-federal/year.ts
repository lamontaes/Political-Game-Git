/**
 * One played year (every module installed) in a drawn place: the speed check
 * for the federal day, one run, one number. Seconds to build and to run.
 *
 * With --federal, the federal day is installed and dev mode seats a town adult
 * as the town's U.S. representative and another as president for the year
 * (the cost of the federal day measured against the same year without it).
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/office-day-federal/year.ts <seed> [days] [--federal]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/simulation/dates";
import { drawPlace } from "../core2-year/place";
import { coreAPI } from "../../src/core2/state";
import { townSeats } from "../../src/core2/modules/offices";
import { startAsFederalOfficeholder } from "../../src/core2/office-day-federal";
import "../../src/core2/office-day-federal-president";

setBookkeeping(false);
const seed = process.argv[2] ?? "office-federal-speed";
const days = Number(
  process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : 365,
);
const place = drawPlace(seed, "office-federal");
const built = Date.now();
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const buildSeconds = (Date.now() - built) / 1000;
if (process.argv.includes("--federal")) {
  const core = world.core;
  const api = coreAPI(core);
  const house = townSeats(api).find((s) =>
    s.office.kind.startsWith("us-house"),
  )!;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === world.placeId &&
        Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) > 36,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  startAsFederalOfficeholder(core, adults[0]!.id, "seat:US:president");
  startAsFederalOfficeholder(core, adults[1]!.id, house.seat.id);
}
const started = Date.now();
advanceCore(world.core, addDays(makeIsoDate(world.core.date), days));
console.log(
  JSON.stringify({
    seed,
    place: `${place.name} (${place.key})`,
    days,
    buildSeconds,
    seconds: (Date.now() - started) / 1000,
  }),
);
