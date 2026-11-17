// A drawn place's state, year by year: the share out of work beside the state's own jobs and
// people, with the played part (the town and its county) shown apart from the rest.
// tsx state-rate-years.ts <seed> [years]
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import {
  countryPartFigures,
  countryPeople,
  countryUnemployment,
  type CountryPart,
  type CountryState,
} from "../../src/core2/country-model";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";

setBookkeeping(false);
const [seed = "state-rate", yearsArg = "10"] = process.argv.slice(2);
const place = drawPlace(seed, "state-rate-years");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(world.core);
const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
const round = (n: number) => Math.round(n);
function row(): void {
  const macro = api.moduleState("macro");
  const parts = macro
    .table("countryParts")
    .rows() as unknown as (CountryPart & {
    key: string;
  })[];
  const states = macro
    .table("countryStates")
    .rows() as unknown as CountryState[];
  const seekers = sum(states.flatMap((s) => s.cells.map((c) => c.seekers)));
  const workers = sum(states.flatMap((s) => s.cells.map((c) => c.workers)));
  for (const part of parts) {
    const state = states.find((s) => s.key === part.key);
    if (!state) continue;
    const own = countryPartFigures(part);
    console.log(
      JSON.stringify({
        date: world.core.date,
        state: state.usps,
        outOfWorkPct: +(100 * countryUnemployment(state)).toFixed(3),
        nationPct: +((100 * seekers) / (seekers + workers)).toFixed(3),
        atWork: round(sum(state.cells.map((c) => c.workers))),
        looking: round(sum(state.cells.map((c) => c.seekers))),
        jobs: round(sum(state.sectors.map((r) => r.jobs))),
        people: round(countryPeople(state)),
        partAtWork: round(own.workers),
        partLooking: round(own.seekers),
      }),
    );
  }
}
console.error(
  `LOG place=${place.name} key=${place.key} world-seed=${place.seed}`,
);
row();
for (let year = 1; year <= Number(yearsArg); year += 1) {
  const started = Date.now();
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365));
  console.error(
    `LOG year ${year} done in ${round((Date.now() - started) / 1000)}s, heap ${round(process.memoryUsage().heapUsed / 1e6)} MB`,
  );
  row();
}
