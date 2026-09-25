import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import type { EntityId, IsoDate, World } from "../types";
import type { CrimeOffense } from "./contract";

/**
 * What makes crime in a place rise or fall. Every cause the game can read
 * today moves the rates in `contract.ts` through `crimeRateMultiplier`; every
 * cause it cannot read yet is listed in `CRIME_CAUSE_SEAMS` with the reason and
 * the rule followed meanwhile, so a later lane knows where to plug in.
 *
 * The sizes are placeholders. How much each cause really moves crime is filed
 * as `how-much-local-conditions-move-crime`.
 */
export const CRIME_CAUSES_VERSION = "crime-causes-unresearched-v1" as const;

/**
 * UNRESEARCHED. Recorded unemployment at which the base rates apply, and how
 * much each point above or below it moves each offense (0.03 = 3% more of
 * that offense per point). Property offenses move more than violent ones in
 * this placeholder; whether that holds is part of the research question.
 */
export const UNRESEARCHED_UNEMPLOYMENT_EFFECT = {
  version: CRIME_CAUSES_VERSION,
  provenance: "unresearched-blanket-rule",
  baselinePct: 4,
  perPointAbove: {
    assault: 0.01,
    robbery: 0.03,
    burglary: 0.03,
    vandalism: 0.02,
  } satisfies Record<CrimeOffense, number>,
  /** A multiplier never falls below this or rises above `ceiling`. */
  floor: 0.5,
  ceiling: 2,
} as const;

export type CrimeCauseStatus = "built" | "not-built";

export interface CrimeCauseSeam {
  readonly key: string;
  readonly connects: string;
  readonly status: CrimeCauseStatus;
  readonly rule: string;
  readonly where: string;
}

/** Every cause of crime and every effect of it, built or not. */
export const CRIME_CAUSE_SEAMS: readonly CrimeCauseSeam[] = [
  {
    key: "cause-unemployment",
    connects: "Work drying up in a place.",
    status: "built",
    rule: "BLANKET: each point of recorded unemployment above 4% raises each offense by a set share; below 4% lowers it. Local unemployment is read where recorded, national otherwise.",
    where: "src/simulation/crime/causes.ts",
  },
  {
    key: "cause-poverty-and-wealth",
    connects:
      "How poor or rich a town's people are, from homelessness to great wealth.",
    status: "not-built",
    rule: "Not read. The world keeps no income or wealth distribution for a place, so no town is poorer than another.",
    where: "src/simulation/crime/causes.ts",
  },
  {
    key: "cause-policing",
    connects: "How many police a place has and what they are paid to do.",
    status: "not-built",
    rule: "Not read. The world holds no police force or police budget for a place; the arrest share is the same everywhere.",
    where: "src/simulation/crime/contract.ts arrestShare",
  },
  {
    key: "cause-enacted-law",
    connects:
      "A law the game enacts on policing, sentencing, diversion or social spending.",
    status: "not-built",
    rule: "Not read. No enacted law records an effect on crime yet; each needs a researched size before it can.",
    where: "src/simulation/legislation.ts",
  },
  {
    key: "cause-offenders",
    connects:
      "A named person turning to crime from money trouble, grievance or habit.",
    status: "not-built",
    rule: "No named person commits a crime; see OFFENDERS_ARE_NOT_REPRESENTED. The lane that draws an offender refers them with referForProsecution, shaped by arrestReferral; the monthly crime pass cannot import the prosecution route without an import loop.",
    where: "src/simulation/crime/contract.ts",
  },
  {
    key: "effect-moving-away",
    connects: "Crime frightening a state and pushing people to leave a town.",
    status: "built",
    rule: "BLANKET: reported offenses beyond a town's ordinary police log add fear to its state in the pressure layer, more for violent offenses. The pressure to leave the town is the migration lane's town push.",
    where:
      "src/simulation/pressure/causes.ts; src/simulation/migration/review.ts",
  },
  {
    key: "effect-news",
    connects: "Crime reaching the local paper.",
    status: "built",
    rule: "A reported offense and an arrest are public records on the public-safety beat.",
    where: "src/simulation/press/desk.ts",
  },
  {
    key: "effect-votes",
    connects:
      "Crime moving support for a mayor, sheriff, prosecutor or council member.",
    status: "not-built",
    rule: "Not read. Filed as how-local-crime-reaches-politics.",
    where: "src/simulation/crime/producer.ts localCrimeFigures",
  },
  {
    key: "effect-business",
    connects: "Crime closing businesses or keeping them away.",
    status: "not-built",
    rule: "Not read. Filed as what-crime-does-to-a-town-and-its-people.",
    where: "src/simulation/crime/producer.ts",
  },
  {
    key: "effect-victims",
    connects: "What being a victim does to a person's life, trust and views.",
    status: "not-built",
    rule: "A victim knows and remembers what happened; nothing else changes. Filed as what-crime-does-to-a-town-and-its-people.",
    where: "src/simulation/crime/producer.ts",
  },
];

export interface CrimeRateReading {
  readonly offense: CrimeOffense;
  readonly multiplier: number;
  /** Each built cause that counted, in a fixed order. */
  readonly causes: readonly { readonly key: string; readonly factor: number }[];
}

/**
 * How much the causes the game can read move one offense in one place on one
 * date. 1 means the base rate.
 */
export function crimeRateMultiplier(
  world: World,
  jurisdictionId: EntityId,
  offense: CrimeOffense,
  asOf: IsoDate,
): CrimeRateReading {
  const rule = UNRESEARCHED_UNEMPLOYMENT_EFFECT;
  const causes: { key: string; factor: number }[] = [];
  const record =
    macroConditionsAt(world, macroScopeForJurisdiction(jurisdictionId), asOf) ??
    macroConditionsAt(world, "national", asOf);
  if (record) {
    const factor =
      1 +
      (record.unemploymentPct - rule.baselinePct) * rule.perPointAbove[offense];
    causes.push({ key: "cause-unemployment", factor });
  }
  const product = causes.reduce((total, cause) => total * cause.factor, 1);
  return {
    offense,
    multiplier: Math.min(rule.ceiling, Math.max(rule.floor, product)),
    causes,
  };
}
