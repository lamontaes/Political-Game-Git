import { outcomeFactor, type OutcomeCause } from "../outcome-web";
import type { EntityId, IsoDate, World } from "../types";
import type { CrimeOffense } from "./contract";

/**
 * What makes crime in a place rise or fall. Every cause the game can read
 * moves the rates in `contract.ts` through the OUTCOME WEB
 * (`../outcome-web`, 04 SYSTEM SPECS part 5): the links into each offense in
 * `data/research/outcome-web/links.json`, sized from causal research. Every
 * cause it cannot read yet is listed in `CRIME_CAUSE_SEAMS` with the reason
 * and the rule followed meanwhile, so a later lane knows where to plug in.
 */
export const CRIME_CAUSES_VERSION = "crime-causes-outcome-web-v1" as const;

/** The outcome-web measure each offense's rate is. */
export const CRIME_OUTCOME_MEASURE = {
  assault: "crime.assault",
  robbery: "crime.robbery",
  burglary: "crime.burglary",
  vandalism: "crime.vandalism",
} as const satisfies Record<CrimeOffense, string>;

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
    rule: "OUTCOME WEB: each point of recorded unemployment above 4% raises burglary about 3% (researched: property crime rises 2 to 5% per point), vandalism and robbery 2% and assault 1% (provisional: violent crime responds much less). Below 4% lowers them. Local unemployment is read where recorded, national otherwise.",
    where: "data/research/outcome-web/links.json",
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
    status: "built",
    rule: "PLACEHOLDER weights: a reported offense is laid at the door of the resident whose circumstances (age, being out of work, a past record, knowing the victim, a taste for risk) point to it most, when they reach the bar; police arrest them when the victim knows them, they have a record, or the circumstances point plainly; the arrest goes to prosecutors.",
    where: "src/simulation/crime/offenders.ts",
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
    rule: "An offense on the police log and an arrest are public records on the public-safety beat.",
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
  /** Each outcome-web link that counted, in the table's order. */
  readonly causes: readonly OutcomeCause[];
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
  const reading = outcomeFactor(
    world,
    jurisdictionId,
    CRIME_OUTCOME_MEASURE[offense],
    asOf,
  );
  return { offense, multiplier: reading.multiplier, causes: reading.causes };
}
