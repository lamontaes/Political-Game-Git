/** State and metro economies as pure math: each region moves with the nation by its own industries plus a gap that fades. */
import regions from "./data/regional/regions.json" with { type: "json" };
import type { MacroMonth, MacroParameter } from "./macro-model";
import { shiftMonth } from "./macro-model";
import { stopgap } from "./stopgaps";
import territoryData from "./data/regional/territories.json" with { type: "json" };

const TERRITORY = territoryData;

export interface RegionRow {
  id: string;
  stateFips: string;
  stateUsps: string;
  kind: "metro" | "rest-of-state" | "territory";
  cbsaCode?: string;
  title?: string;
  counties: string[];
  population: number;
  mix: Record<string, number>;
  rppPct: Record<string, number>;
  perCapitaIncome: number | null;
  lausMetroCode: string | null;
}

export interface RegionMonth {
  id: string;
  regionId: string;
  stateFips: string;
  month: string;
  unemploymentPct: number;
  jobsThousands: number;
  hourlyEarnings: number;
  /** BEA regional price parity, nation = 100. */
  priceLevelPct: number;
  /** Unemployment less the nation's at the opening; wages answer its change. */
  openingGapPct: number;
  /** People living in the region; moves with net migration from its relative unemployment. */
  population: number;
  /** The part of the region's output its state and local governments' purchases above their base hold up, percent. */
  publicGapPct?: number;
}

type Series = Record<string, Record<string, number>>;
const DATA = regions as unknown as {
  regions: RegionRow[];
  states: Record<
    string,
    {
      usps: string;
      rppPct: Record<string, number>;
      perCapitaIncome: number | null;
      population: number;
    }
  >;
  countyRegion: Record<string, string>;
  nation: { perCapitaIncome: number; population: number };
  series: {
    stateUnemploymentPct: Series;
    stateJobsThousands: Series;
    stateHourlyEarnings: Series;
    metroUnemploymentPct: Series;
  };
  source: { citation: string };
};
export const REGIONS = DATA.regions;

/**
 * A region's output in dollars a year: its people's personal income times
 * output per dollar of it, or, in a territory with no personal income on
 * record, its share by population of the territory's official GDP.
 */
export function regionOutputUsd(
  region: (typeof REGIONS)[number],
  outputPerPersonalIncome: number,
): number {
  if (region.perCapitaIncome != null)
    return region.population * region.perCapitaIncome * outputPerPersonalIncome;
  const gdp = (TERRITORY.gdp.usd as Record<string, number>)[region.stateFips];
  if (!gdp) return 0;
  let people = 0;
  for (const row of REGIONS)
    if (row.stateFips === region.stateFips) people += row.population;
  return people > 0 ? (gdp * region.population) / people : 0;
}
export const REGION_SOURCE = DATA.source;
export const COUNTY_REGION = DATA.countyRegion;

const SECTOR_KEYS: Record<string, string> = Object.fromEntries(
  [
    "mining-logging",
    "construction",
    "manufacturing",
    "trade-transport-utilities",
    "information",
    "financial",
    "professional-business",
    "education-health",
    "leisure-hospitality",
    "other-services",
    "government",
  ].map((name) => [
    name,
    name
      .split("-")
      .map((word) => word[0]!.toUpperCase() + word.slice(1))
      .join(""),
  ]),
);

function latest(series: Record<string, number> | undefined, month: string) {
  if (!series) return undefined;
  let found: number | undefined;
  for (const [at, value] of Object.entries(series))
    if (at <= month) found = value;
  return found;
}

/** The nation's mix: every region's mix weighted by its population. */
export function nationalMix(): Record<string, number> {
  const out: Record<string, number> = {};
  let total = 0;
  for (const row of REGIONS) {
    if (!Object.keys(row.mix).length) continue;
    total += row.population;
    for (const [sector, share] of Object.entries(row.mix))
      out[sector] = (out[sector] ?? 0) + share * row.population;
  }
  for (const sector of Object.keys(out)) out[sector]! /= total;
  return out;
}
const NATIONAL_MIX = nationalMix();

function rppAt(
  table: Record<string, number>,
  year: number,
): number | undefined {
  const years = Object.keys(table).map(Number).sort();
  const at = years.filter((y) => y <= year).at(-1) ?? years[0];
  return at === undefined ? undefined : table[String(at)];
}

/** Each region's opening month from LAUS, CES, BEA and the CBP mix; a gap in coverage takes the nearest published level. */
export function openingRegionMonths(
  national: Readonly<MacroMonth>,
  p: MacroParameter,
): RegionMonth[] {
  const month = national.month,
    year = Number(month.slice(0, 4));
  const out: RegionMonth[] = [];
  const s = DATA.series;
  for (const [fips, state] of Object.entries(DATA.states)) {
    const rows = REGIONS.filter((row) => row.stateFips === fips);
    // Island areas have no BLS state series: their own latest published rate, else the nation's.
    const stateU =
      latest(s.stateUnemploymentPct[fips], month) ??
      (TERRITORY.unemploymentPct as Record<string, number>)[fips] ??
      national.unemploymentPct;
    const stateJobs = latest(s.stateJobsThousands[fips], month);
    const nationalIncome = DATA.nation.perCapitaIncome;
    const stateIncomeRatio =
      state.perCapitaIncome && nationalIncome
        ? state.perCapitaIncome / nationalIncome
        : p("one");
    const statePay =
      latest(s.stateHourlyEarnings[fips], month) ??
      national.hourlyEarnings * stateIncomeRatio;
    const stateRpp = rppAt(state.rppPct, year) ?? p("macroHundred");
    if (stateJobs === undefined)
      // Territories without BLS state series: the nation's figures, scaled by population when known.
      stopgap("SG-WORLD-regional-territory-estimate");
    const metros = rows.filter((row) => row.kind === "metro");
    const metroU = new Map(
      metros.map((row) => [
        row.id,
        latest(s.metroUnemploymentPct[row.lausMetroCode ?? ""], month) ??
          stateU,
      ]),
    );
    const metroPop = metros.reduce((sum, row) => sum + row.population, 0);
    const rest = rows.find((row) => row.kind !== "metro");
    const restPop = rest?.population ?? 0;
    // The rest of the state is what the state's figure leaves after its metros, by population.
    const solve = (
      stateValue: number,
      metroValue: (row: RegionRow) => number,
    ) =>
      restPop > 0
        ? (stateValue * (metroPop + restPop) -
            metros.reduce(
              (sum, row) => sum + metroValue(row) * row.population,
              0,
            )) /
          restPop
        : stateValue;
    const metroRpp = (row: RegionRow) => rppAt(row.rppPct, year) ?? stateRpp;
    for (const row of rows) {
      const share = state.population ? row.population / state.population : 1;
      const incomeRatio =
        row.perCapitaIncome && state.perCapitaIncome
          ? row.perCapitaIncome / state.perCapitaIncome
          : p("one");
      const restU = solve(stateU, (metro) => metroU.get(metro.id)!);
      const unemploymentPct =
        row.kind === "metro"
          ? metroU.get(row.id)!
          : restU > p("zero")
            ? restU
            : stateU;
      const restRpp = solve(stateRpp, metroRpp);
      out.push({
        id: `${row.id}:${month}`,
        regionId: row.id,
        stateFips: fips,
        month,
        unemploymentPct,
        jobsThousands:
          stateJobs !== undefined
            ? stateJobs * share
            : (national.payrollJobsThousands * row.population) /
              DATA.nation.population,
        hourlyEarnings: statePay * incomeRatio,
        priceLevelPct: row.kind === "metro" ? metroRpp(row) : restRpp,
        openingGapPct: unemploymentPct - national.unemploymentPct,
        population: row.population,
      });
    }
  }
  return out;
}

function sectorGrowth(
  sector: string,
  nationalGrowth: number,
  p: MacroParameter,
) {
  const key = SECTOR_KEYS[sector]!;
  return (
    p(`regionalSector${key}TrendMonthlyPct`) +
    p(`regionalSector${key}Beta`) * nationalGrowth
  );
}

/** One month for one region, after the nation's month. */
export function stepRegionMonth(
  previous: Readonly<RegionMonth>,
  region: Readonly<RegionRow>,
  nationalBefore: Readonly<MacroMonth>,
  nationalNow: Readonly<MacroMonth>,
  p: MacroParameter,
  /** The state's and local governments' purchases above their base, as a percent of the state's output. */
  publicPurchasesPct = 0,
): RegionMonth {
  const hundred = p("macroHundred"),
    one = p("one");
  const growth =
    Math.log(
      nationalNow.payrollJobsThousands / nationalBefore.payrollJobsThousands,
    ) * hundred;
  const cycle = growth - p("regionalNationalMeanMonthlyJobGrowthPct");
  let mixGrowth = p("zero"),
    mixCycle = p("zero");
  for (const sector of Object.keys(NATIONAL_MIX)) {
    const difference =
      (region.mix[sector] ?? NATIONAL_MIX[sector]!) - NATIONAL_MIX[sector]!;
    mixGrowth += difference * sectorGrowth(sector, growth, p);
    mixCycle +=
      difference * p(`regionalSector${SECTOR_KEYS[sector]}Beta`) * cycle;
  }
  // State and local purchases above their base raise the region's output
  // toward an own-financed multiplier's effect, and unemployment falls by Okun.
  const okun = p("macroOkunOutputPerUnemploymentPoint");
  const publicBefore = previous.publicGapPct ?? 0;
  const publicGapPct =
    publicBefore +
    p("macroPublicGapAdjustment") *
      (p("regionalOwnPurchasesMultiplier") * publicPurchasesPct - publicBefore);
  const gapBefore =
    previous.unemploymentPct -
    nationalBefore.unemploymentPct +
    publicBefore / okun;
  const unemploymentPct =
    nationalNow.unemploymentPct +
    p("regionalUnemploymentGapPersistence") * gapBefore -
    publicGapPct / okun -
    mixCycle / p("macroJobsPerUnemploymentPoint");
  const gapNow = unemploymentPct - nationalNow.unemploymentPct;
  // People leave where unemployment runs above the nation's and come where it runs below.
  const migration =
    (-p("regionalMigrationPerUnemploymentPoint") * gapNow) /
    hundred /
    p("macroMonthsPerYear");
  const month = shiftMonth(previous.month, one, p);
  const nationalPayGrowth =
    nationalNow.hourlyEarnings / nationalBefore.hourlyEarnings;
  const hourlyEarnings =
    previous.hourlyEarnings *
    nationalPayGrowth *
    (one +
      (p("macroWageGrowthPerUnemployment") *
        (gapNow - previous.openingGapPct)) /
        hundred /
        p("macroMonthsPerYear"));
  return {
    ...previous,
    id: `${region.id}:${month}`,
    month,
    unemploymentPct,
    publicGapPct,
    population: previous.population * (one + migration),
    jobsThousands:
      previous.jobsThousands * Math.exp((growth + mixGrowth) / hundred),
    hourlyEarnings,
    // The price level against the nation's (nation = 100) follows the region's pay against the nation's: dearer places are the ones whose pay runs ahead.
    priceLevelPct:
      previous.priceLevelPct *
      (hourlyEarnings / previous.hourlyEarnings / nationalPayGrowth) **
        p("regionalPriceLevelPayElasticity"),
  };
}

/** A state's figures from its regions: jobs summed, unemployment and pay weighted by population. */
export function stateFigures(
  months: readonly RegionMonth[],
  stateFips: string,
): { jobsThousands: number; unemploymentPct: number; hourlyEarnings: number } {
  const rows = months.filter((row) => row.stateFips === stateFips);
  const weights = rows.map(
    (row) =>
      REGIONS.find((region) => region.id === row.regionId)!.population || 1,
  );
  const total = weights.reduce((sum, value) => sum + value, 0);
  return {
    jobsThousands: rows.reduce((sum, row) => sum + row.jobsThousands, 0),
    unemploymentPct:
      rows.reduce((sum, row, i) => sum + row.unemploymentPct * weights[i]!, 0) /
      total,
    hourlyEarnings:
      rows.reduce((sum, row, i) => sum + row.hourlyEarnings * weights[i]!, 0) /
      total,
  };
}
