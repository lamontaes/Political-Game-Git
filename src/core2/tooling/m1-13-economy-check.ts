/**
 * M1-13's economy part ("other places, coarser"): over a year from a drawn
 * town's start, every state and metro region outside the town steps each
 * month from its own conditions, its population moves within real ranges,
 * and each state's monthly jobs report is a public event with its place and
 * date, for the news (M2-09) to carry. Uses GOLDEN_PATH_SEED and
 * GOLDEN_PATH_PLACE_KEY from the runner. Passes when (1) every region has a
 * month for each month of the year; (2) each region's population over the
 * year moves no more than the widest state change in the Census Bureau's
 * 2010-2024 estimates (about -2% to +3% a year); (3) each state and
 * territory has one public jobs report a month, naming the state and month.
 * Exits nonzero on failure.
 */
import regionsData from "../data/regional/regions.json" with { type: "json" };
import { advanceCore, createLifeCore } from "../life";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../modules/world";
import { coreAPI } from "../state";
import { generatedOpening } from "./generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? process.argv[2],
  placeKey = process.env.GOLDEN_PATH_PLACE_KEY ?? process.argv[3];
if (!seed || !placeKey)
  throw new Error("GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY are required.");
const failures: string[] = [];
const started = Date.now();
const input = withWorldEconomy(
  generatedOpening({ seed, key: placeKey }, { twoLevel: true }),
);
const core = createLifeCore(input, {
  data: worldCoreData(),
  modules: [...WORLD_MODULES],
});
const api = coreAPI(core);
advanceCore(core, input.startedAt);
const end = new Date(`${input.startedAt}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + 1);
advanceCore(core, end.toISOString().slice(0, "YYYY-MM-DD".length));

// The year's months: the start month's successors through the last stepped.
const startMonth = input.startedAt.slice(0, "YYYY-MM".length);
const months: string[] = [];
for (let at = startMonth; ;) {
  const [y, m] = at.split("-").map(Number) as [number, number];
  at = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  if (at > core.date.slice(0, "YYYY-MM".length)) break;
  months.push(at);
}
type Region = { id: string; stateFips: string; stateUsps: string };
const regions = (regionsData as unknown as { regions: Region[] }).regions;
const rows = new Map<string, { population: number; unemploymentPct: number }>();
for (const row of api
  .moduleState("regional")
  .table("months")
  .rows() as unknown as {
  regionId: string;
  month: string;
  population: number;
  unemploymentPct: number;
}[])
  rows.set(`${row.regionId}:${row.month}`, row);
// Months the regional engine keeps in full: the latest year (older ones keep December).
const kept = months.slice(-12);
let missing = 0;
const changes: number[] = [];
for (const region of regions) {
  for (const month of kept)
    if (!rows.has(`${region.id}:${month}`)) missing += 1;
  const first = rows.get(`${region.id}:${kept[0]}`),
    last = rows.get(`${region.id}:${kept.at(-1)}`);
  if (!first || !last || first.population <= 0) continue;
  const change = last.population / first.population - 1;
  changes.push(change);
  if (change < -0.02 || change > 0.03)
    failures.push(
      `${region.id} population ${(change * 100).toFixed(2)}% over the year`,
    );
}
if (missing) failures.push(`region months missing: ${missing}`);
// One public jobs report a month for each state and territory.
const states = [...new Set(regions.map((row) => row.stateUsps))].sort();
let reports = 0;
const without: string[] = [];
for (const usps of states)
  for (const month of months) {
    if (core.eventIds.has(`event:economy.state-jobs-report:${usps}:${month}`))
      reports += 1;
    else without.push(`${usps} ${month}`);
  }
if (without.length)
  failures.push(
    `jobs reports missing: ${without.length} (first ${without[0]})`,
  );
changes.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      place: core.placeMetadata?.placeName,
      seed,
      start: input.startedAt,
      months: months.length,
      regions: regions.length,
      populationChangePct: changes.length
        ? {
            low: +(changes[0]! * 100).toFixed(2),
            median: +(changes[Math.floor(changes.length / 2)]! * 100).toFixed(
              2,
            ),
            high: +(changes.at(-1)! * 100).toFixed(2),
          }
        : null,
      states: states.length,
      jobsReports: reports,
      seconds: Math.round((Date.now() - started) / 1000),
      failures: failures.slice(0, 20),
    },
    null,
    2,
  ),
);
if (failures.length) process.exit(1);
