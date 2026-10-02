import {
  CONDITION_PACK,
  conditionHazard,
  conditionOnsetDay,
  startingConditionKeys,
} from "../../src/simulation/crisis/condition-pack";
import { remainingDaysAfterOnset } from "../../src/simulation/crisis/death-causes";
import {
  firstThresholdDay,
  MULTIPLIER_ONE,
  thresholdUnits,
  type HazardMultiplierChange,
} from "../../src/simulation/crisis/hazard";
import { STRAIN_THRESHOLD } from "../../src/simulation/crisis/mortality";
import { ssa2023AnnualProbability } from "../../src/simulation/crisis/mortality-table";
import { addDays, daysBetween } from "../../src/simulation/dates";
import type { EntityId, IsoDate } from "../../src/simulation/types";

/*
 * Ruling 39: a synthetic cohort, with no world, clock or households. Person
 * records with ages and sexes, their starting conditions drawn exactly as
 * world creation draws them (startingConditionKeys and conditionHazard on the
 * same seed), stepped a year at a time with the functions the mortality
 * window and the onset handlers call: conditionOnsetDay for each condition not
 * held, firstThresholdDay for the strain crossing, remainingDaysAfterOnset for
 * the serious episode's days. Deaths per person-year by age band are compared
 * with the SSA 2023 table's own rate for the same people.
 */

export const COHORT_BANDS = ["under 15", "15-64", "65-84", "85+"] as const;
export type CohortBand = (typeof COHORT_BANDS)[number];

export function cohortBand(age: number): CohortBand {
  return age < 15
    ? "under 15"
    : age < 65
      ? "15-64"
      : age < 85
        ? "65-84"
        : "85+";
}

type Sex = "male" | "female";

interface CohortPerson {
  readonly id: EntityId;
  readonly birthDate: IsoDate;
  readonly sex: Sex;
}

function q(age: number, sex: Sex): number {
  return Number(ssa2023AnnualProbability(Math.min(age, 119), sex));
}

/**
 * People along the table's survivors (a stationary population) between
 * `fromAge` and `toAge`, sexes alternating, each born on a distinct day.
 */
export function cohortPeople(
  size: number,
  start: IsoDate,
  ages: { readonly fromAge: number; readonly toAge: number } = {
    fromAge: 0,
    toAge: 110,
  },
): readonly CohortPerson[] {
  const survivors = [1];
  for (let age = 1; age <= ages.toAge; age += 1)
    survivors.push(
      survivors[age - 1]! *
        (1 - (q(age - 1, "male") + q(age - 1, "female")) / 2),
    );
  const span = survivors.slice(ages.fromAge);
  const total = span.reduce((sum, value) => sum + value, 0);
  const people: CohortPerson[] = [];
  span.forEach((share, at) => {
    const age = ages.fromAge + at;
    const count = Math.round((size * share) / total);
    for (let index = 0; index < count; index += 1)
      people.push({
        id: `cohort-person:${age}:${index}` as EntityId,
        birthDate: addDays(
          start,
          -Math.round((age + (index + 0.5) / count) * 365.25),
        ),
        sex: people.length % 2 === 0 ? "male" : "female",
      });
  });
  return people;
}

export interface CohortResult {
  readonly people: number;
  readonly deaths: Readonly<Record<CohortBand, number>>;
  readonly personYears: Readonly<Record<CohortBand, number>>;
  /** The table's deaths and person-years for the same people. */
  readonly tableDeaths: Readonly<Record<CohortBand, number>>;
  readonly tablePersonYears: Readonly<Record<CohortBand, number>>;
  readonly firstYearDeaths: number;
  readonly tableFirstYearDeaths: number;
}

const zero = () =>
  Object.fromEntries(COHORT_BANDS.map((band) => [band, 0])) as Record<
    CohortBand,
    number
  >;

export function runSyntheticCohort(
  seed: string,
  people: readonly CohortPerson[],
  start: IsoDate,
  years: number,
): CohortResult {
  const units = thresholdUnits(STRAIN_THRESHOLD);
  const end = addDays(start, Math.round(years * 365.25));
  const firstDue = addDays(start, 1);
  const deaths = zero();
  const personYears = zero();
  const tableDeaths = zero();
  const tablePersonYears = zero();
  let firstYearDeaths = 0;
  let tableFirstYearDeaths = 0;
  for (const person of people) {
    const ageAt = (date: IsoDate) =>
      daysBetween(person.birthDate, date) / 365.25;
    const startAge = ageAt(start);
    // The table's own deaths for this person, a year at a time.
    let alive = 1;
    for (let year = 0; year < years; year += 1) {
      const died = alive * q(Math.floor(startAge + year), person.sex);
      const band = cohortBand(startAge + year + 0.5);
      tableDeaths[band] += died;
      tablePersonYears[band] += alive - died / 2;
      if (year === 0) tableFirstYearDeaths += died;
      alive -= died;
    }
    // Starting conditions, as the window that first exposes them writes them.
    const held = new Set(
      startingConditionKeys(seed, person.id, startAge, person.sex),
    );
    const factors: { effectiveAt: IsoDate; micros: number }[] = [...held].map(
      (key) => ({
        effectiveAt: start,
        micros: conditionHazard(seed, person.id, key, startAge).micros,
      }),
    );
    const multipliers = (): HazardMultiplierChange[] => {
      const sorted = [...factors].sort((a, b) =>
        a.effectiveAt.localeCompare(b.effectiveAt),
      );
      let product = 1;
      return sorted.map((factor) => {
        product *= factor.micros / MULTIPLIER_ONE;
        return {
          effectiveAt: factor.effectiveAt,
          micros: Math.round(product * MULTIPLIER_ONE),
        };
      });
    };
    // A condition's own strain reads only age here (a cohort has no coverage
    // records), so each condition's day is read once for the whole span and
    // the condition begins in the year that day falls in.
    const onsets = CONDITION_PACK.flatMap((condition) => {
      if (!condition.onsetScale || held.has(condition.key)) return [];
      const day = conditionOnsetDay(
        {
          seed,
          personId: person.id,
          key: condition.key,
          birthDate: person.birthDate,
          category: person.sex,
          exposureStart: start,
          coverage: [],
        },
        start,
        end,
      );
      return day === null
        ? []
        : [{ key: condition.key, begins: day < firstDue ? firstDue : day }];
    });
    let diesOn: IsoDate | null = null;
    for (let year = 0; year < years && diesOn === null; year += 1) {
      const from = addDays(start, Math.round(year * 365.25));
      const to = addDays(start, Math.round((year + 1) * 365.25));
      // Conditions that begin this year, each on its own strain's day.
      for (const { key, begins } of onsets) {
        if (begins < from || begins >= to) continue;
        held.add(key);
        factors.push({
          effectiveAt: begins,
          micros: conditionHazard(seed, person.id, key, ageAt(begins)).micros,
        });
      }
      // The serious episode, on the day the strain crosses this year.
      const timeline = multipliers();
      const crossing = firstThresholdDay(
        {
          birthDate: person.birthDate,
          category: person.sex,
          exposureStart: start,
          multipliers: timeline,
        },
        units,
        from,
        to,
      );
      if (crossing === null) continue;
      const onset = crossing < firstDue ? firstDue : crossing;
      let severity = 1;
      for (const change of timeline)
        if (change.effectiveAt <= onset)
          severity = change.micros / MULTIPLIER_ONE;
      diesOn = addDays(
        onset,
        remainingDaysAfterOnset({ age: ageAt(onset), severity, covered: null }),
      );
    }
    const last = diesOn !== null && diesOn < end ? diesOn : end;
    for (let year = 0; year < years; year += 1) {
      const from = addDays(start, Math.round(year * 365.25));
      if (from >= last) break;
      const to = addDays(start, Math.round((year + 1) * 365.25));
      personYears[cohortBand(startAge + year + 0.5)] +=
        daysBetween(from, last < to ? last : to) / 365.25;
    }
    if (diesOn !== null && diesOn < end) {
      deaths[cohortBand(ageAt(diesOn))] += 1;
      if (daysBetween(start, diesOn) < 365) firstYearDeaths += 1;
    }
  }
  return {
    people: people.length,
    deaths,
    personYears,
    tableDeaths,
    tablePersonYears,
    firstYearDeaths,
    tableFirstYearDeaths,
  };
}

/** Each band's rate over the table's rate for the same people. */
export function bandRatios(result: CohortResult): Record<CohortBand, number> {
  return Object.fromEntries(
    COHORT_BANDS.map((band) => [
      band,
      result.deaths[band] /
        result.personYears[band] /
        (result.tableDeaths[band] / result.tablePersonYears[band]),
    ]),
  ) as Record<CohortBand, number>;
}
