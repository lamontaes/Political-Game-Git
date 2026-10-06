import { stableHash } from "./ids";
import type { EntityId, IsoDate, World } from "./types";

/**
 * Gallup's cohort measure is self-identification, not a direct measure of
 * attraction or partner choice. This private inborn flag preserves that
 * distinction: it is evidence about cohort prevalence, not a compatibility
 * rule. Individual orientation detail remains unknown unless a future source
 * and model support it.
 */
export type RomanticOrientationCohort = {
  readonly key: string;
  readonly firstBirthYear: number | null;
  readonly lastBirthYear: number | null;
  readonly selfIdentificationShare: number;
  readonly sourceYear: 2023;
  readonly basis: "sourced" | "estimated";
};

/** Gallup's 2023 U.S. adult figures, matched to their birth-cohort bands. */
export const ROMANTIC_ORIENTATION_COHORTS: readonly RomanticOrientationCohort[] =
  [
    {
      key: "silent-and-older",
      firstBirthYear: null,
      lastBirthYear: 1945,
      selfIdentificationShare: 0.011,
      sourceYear: 2023,
      basis: "sourced",
    },
    {
      key: "baby-boomer",
      firstBirthYear: 1946,
      lastBirthYear: 1964,
      selfIdentificationShare: 0.023,
      sourceYear: 2023,
      basis: "sourced",
    },
    {
      key: "generation-x",
      firstBirthYear: 1965,
      lastBirthYear: 1980,
      selfIdentificationShare: 0.045,
      sourceYear: 2023,
      basis: "sourced",
    },
    {
      key: "millennial",
      firstBirthYear: 1981,
      lastBirthYear: 1996,
      selfIdentificationShare: 0.098,
      sourceYear: 2023,
      basis: "sourced",
    },
    {
      key: "generation-z-adult",
      firstBirthYear: 1997,
      lastBirthYear: 2006,
      selfIdentificationShare: 0.223,
      sourceYear: 2023,
      basis: "sourced",
    },
    {
      key: "generation-z-younger",
      firstBirthYear: 2007,
      lastBirthYear: null,
      selfIdentificationShare: 0.223,
      sourceYear: 2023,
      basis: "estimated",
    },
  ];

export function romanticOrientationCohortForBirthDate(
  birthDate: IsoDate,
): RomanticOrientationCohort {
  const year = Number(birthDate.slice(0, 4));
  return ROMANTIC_ORIENTATION_COHORTS.find(
    (cohort) =>
      (cohort.firstBirthYear === null || year >= cohort.firstBirthYear) &&
      (cohort.lastBirthYear === null || year <= cohort.lastBirthYear),
  )!;
}

/** Stable cohort-calibrated choice, independent of call order or dice. */
export function seededRomanticOrientation(
  world: World,
  personId: EntityId,
): "heterosexual-identified" | "lgbtq-plus-identified" {
  const person = world.people[personId]!;
  const cohort = romanticOrientationCohortForBirthDate(person.birthDate);
  const hash = stableHash(`${world.seed}:${personId}:romantic-orientation:v1`);
  const draw = Number.parseInt(hash.slice(0, 8), 16) / 0x1_0000_0000;
  return draw < cohort.selfIdentificationShare
    ? "lgbtq-plus-identified"
    : "heterosexual-identified";
}
