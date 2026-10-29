/** State and metro economies as pure math: each region moves with the nation by its own industries plus a gap that fades. */
import regions from "./data/regional/regions.json" with { type: "json" };
import type { MacroMonth, MacroParameter } from "./macro-model";
import { publishedMonths, shiftMonth } from "./macro-model";
import { worldOffsetUnit } from "./world-draw";
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

/**
 * Each region's month from LAUS, CES, BEA and the CBP mix as published; a gap
 * in coverage takes the nearest published level. Calibration only: play reads
 * `openingRegionMonths`, this world's months.
 */
export function publishedRegionMonths(
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
    const restU = solve(stateU, (metro) => metroU.get(metro.id)!);
    // A metro's LAUS rate covers its whole area, which can cross state lines.
    // Where the metros leave the rest of the state no positive rate, or the
    // state is all metro, every region's rate is scaled by one factor so the
    // state's people-weighted rate is its published one.
    const unemploymentScale =
      restPop > 0 && restU > p("zero")
        ? p("one")
        : (stateU * (metroPop + restPop)) /
          (metros.reduce(
            (sum, row) => sum + metroU.get(row.id)! * row.population,
            0,
          ) +
            stateU * restPop);
    // Each region's pay is the state's moved by its income against the
    // state's. A metro's income covers its whole area, which can cross state
    // lines, so the ratios are scaled to average one over the state's people:
    // the state's people-weighted pay is its published pay.
    const ratioOf = (row: RegionRow) =>
      row.perCapitaIncome && state.perCapitaIncome
        ? row.perCapitaIncome / state.perCapitaIncome
        : p("one");
    const people = rows.reduce((sum, row) => sum + row.population, 0);
    const meanRatio =
      people > 0
        ? rows.reduce((sum, row) => sum + ratioOf(row) * row.population, 0) /
          people
        : p("one");
    for (const row of rows) {
      const share = state.population ? row.population / state.population : 1;
      const incomeRatio = ratioOf(row) / meanRatio;
      const unemploymentPct =
        row.kind === "metro"
          ? metroU.get(row.id)! * unemploymentScale
          : restPop > 0 && restU > p("zero")
            ? restU
            : stateU * unemploymentScale;
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

/**
 * Each region's month before the start in this world: the published months
 * moved by the world's national offset from the published national month
 * and by each state's own offsets, drawn once from the world's seed (owner,
 * Oct 27: realistic, not real; the published figures calibrate). A state's
 * offsets move its metros and the rest of it alike.
 */
export function openingRegionMonths(
  national: Readonly<MacroMonth>,
  startedAt: string,
  seed: string,
  p: MacroParameter,
): RegionMonth[] {
  const published =
    publishedMonths(startedAt, p).find((row) => row.month === national.month) ??
    national;
  const nationalShiftPts = national.unemploymentPct - published.unemploymentPct;
  const jobsRatio =
    national.payrollJobsThousands / published.payrollJobsThousands;
  const payRatio = national.hourlyEarnings / published.hourlyEarnings;
  // The published regions are figured from the published national month, so a
  // state with no series of its own starts from the published nation too.
  return publishedRegionMonths(published, p).map((row) => {
    const own = (key: string, spread: string) =>
      worldOffsetUnit(seed, `region-world:${row.stateFips}:${key}`) * p(spread);
    const unemploymentPct = Math.max(
      p("zero"),
      row.unemploymentPct +
        nationalShiftPts +
        own("unemployment", "regionalWorldUnemploymentSpreadPoints"),
    );
    return {
      ...row,
      unemploymentPct,
      jobsThousands:
        row.jobsThousands *
        jobsRatio *
        (p("one") + own("jobs", "regionalWorldLevelSpreadShare")),
      hourlyEarnings:
        row.hourlyEarnings *
        payRatio *
        (p("one") + own("pay", "regionalWorldLevelSpreadShare")),
      priceLevelPct:
        row.priceLevelPct +
        own("prices", "regionalWorldPriceLevelSpreadPoints"),
      openingGapPct: unemploymentPct - national.unemploymentPct,
    };
  });
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
  const gapBefore = previous.unemploymentPct - nationalBefore.unemploymentPct;
  const unemploymentPct =
    nationalNow.unemploymentPct +
    p("regionalUnemploymentGapPersistence") * gapBefore -
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
  // A tight labor market (unemployment under the nation's) runs pay ahead of the nation's, a slack one behind, by the pooled state fit.
  const hourlyEarnings =
    previous.hourlyEarnings *
    nationalPayGrowth *
    (one +
      (p("macroWageGrowthPerUnemployment") *
        (gapNow - previous.openingGapPct)) /
        hundred /
        p("macroMonthsPerYear") +
      (p("regionalPayGrowthPerGapPoint") * gapNow) /
        hundred /
        p("macroMonthsPerYear"));
  return {
    ...previous,
    id: `${region.id}:${month}`,
    month,
    unemploymentPct,
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
