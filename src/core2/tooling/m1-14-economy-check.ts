/**
 * M1-14's economy part ("the economy's recent path matches real figures"):
 * a drawn town opens on its start date with the national economy's real
 * months before it and each region's real months. Uses GOLDEN_PATH_SEED and
 * GOLDEN_PATH_PLACE_KEY from the runner. Passes when (1) every national month
 * before the start carries the published unemployment rate, consumer price
 * index, policy rate and 30-year mortgage rate for that month (BLS, Federal
 * Reserve, Freddie Mac, as recorded in data/macro/history.json; a month the
 * agency didn't publish keeps the last published figure), back to January of
 * the first coarse year; (2) every region holds the year before the start in
 * full and each earlier December; (3) each metro's kept months carry its own
 * LAUS rate (in a state that is all metro, scaled to the state's), and each
 * state's regions average, by population, to the state's LAUS rate. Exits nonzero on failure.
 */
import history from "../data/macro/history.json" with { type: "json" };
import regionsData from "../data/regional/regions.json" with { type: "json" };
import { advanceCore, createLifeCore } from "../life";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../modules/world";
import { parameter } from "../parameters";
import { coreAPI } from "../state";
import { generatedOpening } from "./generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? process.argv[2],
  placeKey = process.env.GOLDEN_PATH_PLACE_KEY ?? process.argv[3];
if (!seed || !placeKey)
  throw new Error("GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY are required.");
const data = worldCoreData(),
  p = (key: string) => parameter(key, data.parameters);
const failures: string[] = [];
const started = Date.now();
const input = withWorldEconomy(
  generatedOpening({ seed, key: placeKey }, { twoLevel: true }),
);
const core = createLifeCore(input, { data, modules: [...WORLD_MODULES] });
const api = coreAPI(core);
advanceCore(core, input.startedAt);
// The engines open on the first day of play.
const next = new Date(`${input.startedAt}T00:00:00Z`);
next.setUTCDate(next.getUTCDate() + 1);
advanceCore(core, next.toISOString().slice(0, "YYYY-MM-DD".length));
const openSeconds = Math.round((Date.now() - started) / 1000);

type HistoryRow = {
  month: string;
  unemploymentPct?: number;
  priceIndex?: number;
  policyRatePct?: number;
  mortgage30Pct?: number;
};
const published = history.monthly as unknown as HistoryRow[];
/** The published figure for a month, or the last one before it. */
const asPublished = (
  month: string,
  key: Exclude<keyof HistoryRow, "month">,
) => {
  let found: number | undefined;
  for (const row of published)
    if (row.month <= month && row[key] !== undefined) found = row[key];
  return found;
};
const startMonth = input.startedAt.slice(0, "YYYY-MM".length);
const firstMonth = `${p("macroHistoryFirstYear")}-01`;
const national = (
  [...api.moduleState("macro").table("months").rows()] as unknown as {
    month: string;
    kind?: string;
    unemploymentPct: number;
    priceIndex: number;
    policyRatePct: number;
    mortgage30Pct: number;
  }[]
)
  .filter((row) => row.month < startMonth)
  .sort((a, b) => a.month.localeCompare(b.month));
// (1) Every month from the first coarse year to the start, each on the record.
const expected: string[] = [];
for (
  let at = firstMonth;
  at < startMonth;
  at = `${Number(at.slice(5)) === 12 ? Number(at.slice(0, 4)) + 1 : at.slice(0, 4)}-${String((Number(at.slice(5)) % 12) + 1).padStart(2, "0")}`
)
  expected.push(at);
const have = new Map(national.map((row) => [row.month, row]));
const missing = expected.filter((month) => !have.has(month));
if (missing.length)
  failures.push(
    `national months missing: ${missing.length} (first ${missing[0]})`,
  );
const tolerance = 0.005;
let compared = 0;
for (const month of expected) {
  const row = have.get(month);
  if (!row) continue;
  for (const key of [
    "unemploymentPct",
    "priceIndex",
    "policyRatePct",
    "mortgage30Pct",
  ] as const) {
    const real = asPublished(month, key);
    if (real === undefined) continue;
    compared += 1;
    if (Math.abs(row[key] - real) > tolerance)
      failures.push(
        `national ${month} ${key} ${row[key]} against the published ${real}`,
      );
  }
}
// (2) and (3) Each region's kept months, and their unemployment on the record.
type Region = {
  id: string;
  kind: string;
  stateFips: string;
  population: number;
  lausMetroCode?: string;
};
const regions = (regionsData as unknown as { regions: Region[] }).regions;
const series = (
  regionsData as unknown as {
    series: {
      stateUnemploymentPct: Record<string, Record<string, number>>;
      metroUnemploymentPct: Record<string, Record<string, number>>;
    };
  }
).series;
const latest = (row: Record<string, number> | undefined, month: string) => {
  let found: number | undefined;
  for (const [at, value] of Object.entries(row ?? {}))
    if (at <= month) found = value;
  return found;
};
const regionMonths = new Map<string, { unemploymentPct: number }>();
for (const row of api
  .moduleState("regional")
  .table("months")
  .rows() as unknown as {
  regionId: string;
  month: string;
  unemploymentPct: number;
}[])
  regionMonths.set(`${row.regionId}:${row.month}`, row);
const yearBefore = `${Number(startMonth.slice(0, 4)) - 1}${startMonth.slice(4)}`;
const kept = expected.filter(
  (month) => month > yearBefore || month.endsWith("-12"),
);
// The last month before the start is the opening month the regions step from.
const openingMonth = expected.at(-1);
let regionsMissing = 0,
  metrosCompared = 0,
  statesCompared = 0;
for (const month of kept) {
  if (month === openingMonth) continue;
  const byState = new Map<string, { sum: number; people: number }>();
  for (const region of regions) {
    const row = regionMonths.get(`${region.id}:${month}`);
    if (!row) {
      regionsMissing += 1;
      continue;
    }
    const allMetro = !regions.some(
      (row) => row.stateFips === region.stateFips && row.kind !== "metro",
    );
    if (region.kind === "metro" && region.lausMetroCode && !allMetro) {
      const real = latest(
        series.metroUnemploymentPct[region.lausMetroCode],
        month,
      );
      if (real !== undefined) {
        metrosCompared += 1;
        if (Math.abs(row.unemploymentPct - real) > tolerance)
          failures.push(
            `${region.id} ${month} unemployment ${row.unemploymentPct} against LAUS ${real}`,
          );
      }
    }
    const state = byState.get(region.stateFips) ?? { sum: 0, people: 0 };
    state.sum += row.unemploymentPct * region.population;
    state.people += region.population;
    byState.set(region.stateFips, state);
  }
  for (const [fips, state] of byState) {
    const real = latest(series.stateUnemploymentPct[fips], month);
    if (real === undefined || state.people <= 0) continue;
    statesCompared += 1;
    const average = state.sum / state.people;
    if (Math.abs(average - real) > 0.05)
      failures.push(
        `state ${fips} ${month} regions average ${average.toFixed(2)} against LAUS ${real}`,
      );
  }
}
if (regionsMissing) failures.push(`region months missing: ${regionsMissing}`);

console.log(
  JSON.stringify(
    {
      place: core.placeMetadata?.placeName,
      seed,
      start: input.startedAt,
      nationalMonths: national.length,
      expectedMonths: expected.length,
      figuresCompared: compared,
      regionMonthsKept: kept.length,
      metrosCompared,
      statesCompared,
      openSeconds,
      failures: failures.slice(0, 20),
    },
    null,
    2,
  ),
);
if (failures.length) process.exit(1);
