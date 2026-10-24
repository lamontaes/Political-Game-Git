/**
 * Every place other than the player's town keeps a coarse population (the
 * owner's two-level rule): counts of its workers by age and by job, read from
 * the same tables the player's town is built from, never a second simulation.
 * Nothing here is stored or stepped: the counts are a pure reading of the
 * place's Census population, its county's employment by age (ACS), its
 * sourced industry mix and its wage tables, and a person met there is filled
 * in from them (`metResident`): the same person every time for the same world
 * seed, place and ordinal, with an age, a job and a wage the counts show.
 *
 * Estimate: the place's workers are its county's employed by age row, scaled
 * by the place's share of the county. Age and job are drawn independently
 * except that a role's minimum age is honored.
 */
import { SeededRng } from "./kernel/rng";
import { stableHash } from "./kernel/ids";
import { countyGeoidsForPlace } from "./reference/government-units";
import { corePlaceByKey } from "./place-lookup";
import residentData from "./data/resident-employment.json" with { type: "json" };
import type {
  EmploymentAgeRow,
  ResidentEmploymentData,
} from "./opening-employment";

import { parameter as p } from "./parameters";
import { TOWN_WORKPLACES, type Role } from "./town-workplaces";
import { townJobRate } from "./town-pay";
import { placeReferencePopulation } from "./gov-rules/place-population";
import { townWorkplaceWeights } from "./town-employment-mix";

const DEFAULT_RESIDENT_EMPLOYMENT: ResidentEmploymentData = residentData;

/** Ages above the last row's start are drawn up to this age. */
const oldestAge = () => p("coarsePlaceOldestWorkingAge");
/** The percentile a met worker is paid at: the median of their occupation. */
const wagePercentile = () => p("coarsePlaceWagePercentile");

export interface CoarseAgeRow {
  readonly id: string;
  readonly minAge: number;
  /** Exclusive. */
  readonly maxAge: number;
  /** Workers in the place in this age row, fractional. */
  readonly workers: number;
}

export interface CoarseJobRow {
  readonly workplace: string;
  readonly title: string;
  readonly occupation: string;
  readonly minAge: number;
  /** Jobs of this kind in the place, fractional. */
  readonly count: number;
  /** Null where no published wage covers the occupation. */
  readonly hourlyMinor: number | null;
  readonly weeklyHours: number;
}

export interface CoarsePlace {
  readonly placeKey: string;
  readonly jurisdictionId: string;
  readonly residents: number;
  readonly workers: number;
  readonly ages: readonly CoarseAgeRow[];
  readonly jobs: readonly CoarseJobRow[];
  readonly basis: string;
}

const cache = new Map<string, CoarsePlace | null>();

function ageRowsOf(
  data: ResidentEmploymentData,
  county: string | undefined,
  residents: number,
): { rows: CoarseAgeRow[]; basis: string } {
  const counts = county ? data.countyCounts[county] : undefined;
  const rowsOf = (list: readonly EmploymentAgeRow[]) =>
    list.map((row, index) => {
      const next = list[index + 1];
      const minAge = p(row.minimumAgeParameter);
      const maxAge = row.maximumAgeParameter
        ? p(row.maximumAgeParameter)
        : next
          ? p(next.minimumAgeParameter)
          : oldestAge();
      return { row, minAge, maxAge };
    });
  if (counts) {
    const bands = rowsOf(data.countyAgeRows);
    const total = bands.reduce(
      (sum, { row }) =>
        sum +
        Number(
          (counts[row.id] as { ageTotal?: string } | undefined)?.ageTotal ?? 0,
        ),
      0,
    );
    if (total > 0) {
      const share = residents / total;
      return {
        rows: bands.map(({ row, minAge, maxAge }) => ({
          id: row.id,
          minAge,
          maxAge,
          workers: Number(counts[row.id]?.employed ?? 0) * share,
        })),
        basis: "county-ACS-employed-by-age scaled by the place's share",
      };
    }
  }
  // No county table: the nation's employed by age, scaled to the place.
  const bands = rowsOf(data.nationalAgeRows);
  const total = bands.reduce(
    (sum, { row }) =>
      sum +
      (row.nationalPopulationParameter
        ? p(row.nationalPopulationParameter)
        : 0),
    0,
  );
  const share = total > 0 ? residents / total : 0;
  return {
    rows: bands.map(({ row, minAge, maxAge }) => ({
      id: row.id,
      minAge,
      maxAge,
      workers:
        (row.nationalEmployedParameter ? p(row.nationalEmployedParameter) : 0) *
        share,
    })),
    basis: "national-CPS-employed-by-age scaled by the place's population",
  };
}

/** A place's coarse population, or null where the place has no Census population. */
export function coarsePlace(
  placeKey: string,
  data: ResidentEmploymentData = DEFAULT_RESIDENT_EMPLOYMENT,
): CoarsePlace | null {
  const cached = cache.get(placeKey);
  if (cached !== undefined && data === DEFAULT_RESIDENT_EMPLOYMENT)
    return cached;
  const place = corePlaceByKey(placeKey);
  const geoid = place?.sourceGeoid;
  const residents = geoid ? placeReferencePopulation(geoid)?.value : undefined;
  if (!place || !geoid || !residents || residents <= 0) {
    cache.set(placeKey, null);
    return null;
  }
  const jurisdictionId = place.context.jurisdiction.id;
  const county = countyGeoidsForPlace(geoid)[0];
  const { rows, basis } = ageRowsOf(data, county, residents);
  const workers = rows.reduce((sum, row) => sum + row.workers, 0);
  const weights = townWorkplaceWeights(jurisdictionId);
  const weightTotal = [...weights.values()].reduce(
    (sum, value) => sum + Math.max(0, value),
    0,
  );
  const jobs: CoarseJobRow[] = [];
  for (const workplace of TOWN_WORKPLACES) {
    const weight = Math.max(0, weights.get(workplace.key) ?? 0);
    if (weight <= 0 || weightTotal <= 0) continue;
    const roleTotal = workplace.roles.reduce((sum, r) => sum + r.weight, 0);
    for (const role of workplace.roles as readonly Role[]) {
      const median = townJobRate(
        role.occupation,
        jurisdictionId,
        wagePercentile(),
      );
      jobs.push({
        workplace: workplace.key,
        title: role.title,
        occupation: role.occupation,
        minAge: role.minAge ?? 0,
        count: (workers * (weight / weightTotal) * role.weight) / roleTotal,
        hourlyMinor: median?.hourlyMinor ?? null,
        weeklyHours: role.hours
          ? (role.hours[0] + role.hours[1]) / 2
          : p("fullTimeWeeklyHours"),
      });
    }
  }
  const result: CoarsePlace = {
    placeKey,
    jurisdictionId,
    residents,
    workers,
    ages: rows,
    jobs,
    basis,
  };
  if (data === DEFAULT_RESIDENT_EMPLOYMENT) cache.set(placeKey, result);
  return result;
}

export interface MetResident {
  readonly age: number;
  readonly ageRowId: string;
  readonly job: CoarseJobRow;
}

const pick = <T>(
  rows: readonly T[],
  weight: (row: T) => number,
  position: number,
): T | undefined => {
  const total = rows.reduce((sum, row) => sum + weight(row), 0);
  if (total <= 0) return undefined;
  let edge = position * total;
  for (const row of rows) {
    edge -= weight(row);
    if (edge < 0) return row;
  }
  return rows[rows.length - 1];
};

/**
 * The `ordinal`th worker met in a place, drawn from its counts: an age row by
 * its workers, an age within it, then a job among those open at that age by
 * its count. Seeded from the world, the place and the ordinal, so the same
 * person comes back every time; who exists is generated, not rolled for what
 * they do.
 */
export function metResident(
  coarse: CoarsePlace,
  worldSeed: string,
  key: string,
): MetResident | undefined {
  const rng = new SeededRng(
    `coarse-resident:${stableHash(`${worldSeed}:${coarse.placeKey}:${key}`)}`,
  );
  const band = pick(coarse.ages, (row) => row.workers, rng.next());
  if (!band) return undefined;
  const age = Math.min(
    oldestAge(),
    band.minAge + rng.integer(0, Math.max(1, band.maxAge - band.minAge)),
  );
  const job = pick(
    coarse.jobs.filter((row) => row.minAge <= age),
    (row) => row.count,
    rng.next(),
  );
  if (!job) return undefined;
  return { age, ageRowId: band.id, job };
}
