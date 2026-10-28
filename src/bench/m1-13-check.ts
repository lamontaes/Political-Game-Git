/* global process, console */
// Roadmap M1-13, other places at a coarser level, in the place the
// golden-path runner draws (GOLDEN_PATH_SEED, GOLDEN_PATH_PLACE_KEY). The
// played world (`buildBenchWorld`, every module) plays a year. Other places
// are the regional engine's regions (src/core2/modules/regional.ts): each
// region's population must change from its own conditions (the counted moves
// between states, each with its causes, or its unemployment against the
// nation's); each region's change must sit inside a real range;
// other places' voters' views must change from their own conditions; and
// their public events must be recorded with a place and a date. A clause
// with no engine or no sourced range in the repo fails and says so; nothing
// is invented to pass it. Exits nonzero naming each failed clause.
// Usage: node --max-old-space-size=8192 --import tsx src/bench/m1-13-check.ts
import { buildBenchWorld } from "./world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { REGIONAL_MODULE_ID } from "../core2/modules/regional";
import { countedMoves } from "../core2/modules/counted-moves";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { REGIONS, type RegionMonth } from "../core2/regional-model";
import stats from "../../data/research/regional/series/stats.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? "m1-13-check";
const placeKey = process.env.GOLDEN_PATH_PLACE_KEY;
const failures: string[] = [];
const check = (ok: unknown, message: string) => {
  if (!ok) failures.push(message);
};

setBookkeeping(false);
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const api = coreAPI(w.core);
const where = `${w.place.displayName} (${w.place.key}), seed ${seed}`;
const months = api.moduleState(REGIONAL_MODULE_ID).table("months");
const startDate = makeIsoDate(w.core.date);
advanceCore(w.core, addDays(startDate, 366));
// One year of regions: the engine keeps each December (and the last twelve
// months), so the year is the latest December against the one before it.
const decembers = [
  ...new Set(
    (months.rows() as unknown as RegionMonth[])
      .map((row) => row.month)
      .filter((month) => month.endsWith("-12")),
  ),
].sort();
const stepped = decembers.at(-1)!;
const openingMonth = `${Number(stepped.slice(0, 4)) - 1}-12`;
const at = (month: string) =>
  new Map(
    (months.query("byMonth", [month]) as unknown as RegionMonth[]).map(
      (row) => [row.regionId, row],
    ),
  );
const opening = at(openingMonth);
const year = at(stepped);

// 1. Populations change from their own conditions. A region whose state the
// counted-moves engine weighs follows that state's moves, each with its
// causes (src/core2/modules/counted-moves.ts); any other follows its own
// unemployment against the nation's (src/core2/regional-model.ts).
let changed = 0;
for (const [id, before] of opening) {
  const after = year.get(id);
  if (after && before.population && after.population !== before.population)
    changed += 1;
}
check(
  opening.size > 0 && changed >= opening.size * 0.9,
  `${where}: only ${changed} of ${opening.size} regions' populations changed from ${openingMonth} to ${stepped}`,
);
// Every counted move, within the town's state or across states.
const moves = countedMoves(api).filter(
  (row) => row.date >= `${openingMonth}-01` && row.date <= `${stepped}-31`,
);
const causeless = moves.filter((row) => !Object.keys(row.reasons ?? {}).length);
check(
  causeless.length === 0,
  `${where}: ${causeless.length} of ${moves.length} counted moves name no cause (for example ${causeless
    .slice(0, 3)
    .map((row) => row.id)
    .join(", ")})`,
);

// 2. Within real ranges: each region's change over the year against the 5th
// to 95th percentile of the real one-year change where it lies: a state's
// metro or rest of state against the states' and D.C.'s (Census Bureau state
// estimates), a territory against the four territories' (World Bank), both
// in data/research/regional/series/stats.json. A tenth of real years fall
// outside such a band, so no more than a tenth of the regions may.
const bands = {
  state: stats.stateOneYearPopulationChangePct,
  territory: stats.territoryOneYearPopulationChangePct,
};
const territories = new Set(
  REGIONS.filter((row) => row.kind === "territory").map((row) => row.id),
);
const changes = [...opening].flatMap(([id, before]) => {
  const after = year.get(id);
  return after && before.population
    ? [
        {
          id,
          pct: (after.population / before.population - 1) * 100,
          band: territories.has(id) ? bands.territory : bands.state,
        },
      ]
    : [];
});
const outside = changes.filter(
  (row) => row.pct < row.band.p05 || row.pct > row.band.p95,
);
const checkedTerritories = changes.filter((row) => territories.has(row.id));
check(
  changes.length > 0 && outside.length <= changes.length * 0.1,
  `${where}: ${outside.length} of ${changes.length} regions' one-year population change sit outside their real band (states ${bands.state.p05.toFixed(2)}% to ${bands.state.p95.toFixed(2)}%, territories ${bands.territory.p05.toFixed(2)}% to ${bands.territory.p95.toFixed(2)}%): ${outside
    .slice(0, 5)
    .map((row) => `${row.id} ${row.pct.toFixed(2)}%`)
    .join(", ")}`,
);
check(
  checkedTerritories.length === territories.size,
  `${where}: ${checkedTerritories.length} of ${territories.size} territory regions' population changes were checked`,
);
// 3. Other places' voters' views: no engine keeps views for places outside
// the town (the views engine holds the town's people only).
failures.push(
  `${where}: no engine keeps or moves other places' voters' views (src/core2/modules/views.ts holds the town's people only)`,
);
// 4. Their public events are recorded with a place and a date, where the
// news reads them (the kept log; an event no one can see keeps only its id).
const reports = [...w.core.eventIds].filter((id) =>
  id.startsWith("event:economy.state-jobs-report:"),
);
const events = reports
  .map((id) => w.core.durableLog.get(id))
  .filter((row) => row !== undefined);
check(
  events.length >= 56 * 11,
  `${where}: ${events.length} of ${reports.length} state jobs reports in a year are kept where the news reads them, not one a month for 56 states and territories`,
);
check(
  events.every((row) => row.placeId && row.date && row.publicRecord),
  `${where}: a state jobs report has no place, date or public mark`,
);

console.log(
  JSON.stringify(
    {
      place: where,
      regions: opening.size,
      from: openingMonth,
      through: stepped,
      changed,
      populationBands: {
        state: [bands.state.p05, bands.state.p95],
        territory: [bands.territory.p05, bands.territory.p95],
      },
      territoriesChecked: checkedTerritories.map(
        (row) => `${row.id} ${row.pct.toFixed(2)}%`,
      ),
      regionsOutsideBand: outside.length,
      widestChange: changes
        .map(({ id, pct }) => ({ id, pct }))
        .reduce(
          (top, row) => (Math.abs(row.pct) > Math.abs(top.pct) ? row : top),
          { id: "", pct: 0 },
        ),
      countedMoves: moves.length,
      sampleMove: moves.at(-1)
        ? `${moves.at(-1)!.id}: ${Object.keys(moves.at(-1)!.reasons).join(", ")}`
        : null,
      stateReports: events.length,
      sampleReport: events.at(-1)?.id ?? null,
    },
    null,
    2,
  ),
);
if (failures.length) {
  console.error(`M1-13 FAIL:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`M1-13 passed: ${where}`);
