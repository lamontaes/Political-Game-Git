/**
 * The minimum wage in force where a job is, on a date.
 *
 * The floor is the highest of the federal, state and local minimum where the
 * job is (U.S. Department of Labor: the higher rate applies to covered work).
 *
 * - Federal: $7.25 an hour since July 24, 2009, until an Act of Congress that
 *   answers "should the federal minimum wage go up?" with yes takes effect;
 *   then `FEDERAL_RAISE_PLACEHOLDER`. A later Act answering no ends the raise
 *   for new work, and cuts nobody's pay (callers only ever raise).
 * - State: the state's basic rate on file (`minimum-wage-2026.json`), or the
 *   rate a state law the game enacted set, from the day it takes effect.
 *   Unknown stays unknown, never zero.
 * - Local: NOT MODELED. No city or county minimum is on file, so none is
 *   claimed and none is read as zero.
 *
 * Nothing is stored as "the current minimum": it is derived from the laws each
 * time it is read.
 */

import { addDays } from "./dates";
import {
  laborLawOfficeKey,
  ruleValueInWorld,
  STATUTE_EFFECTIVE_DEFAULT_DAYS,
} from "./enacted-rule-changes";
import { lawInForce } from "./governing/law-in-force";
import { measurePropositionAnswer } from "./issue-record";
import {
  FEDERAL_MINIMUM_HOURLY,
  TOWN_MINIMUM_WAGES,
} from "./living-world/town-pay.generated";
import { lifePlaceByJurisdictionId } from "./life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { EntityId, IsoDate, World } from "./types";

/** The policy question a federal minimum wage raise answers. */
export const FEDERAL_MINIMUM_WAGE_QUESTION_KEY =
  "us-federal-positions:labor-commerce.raise-federal-minimum-wage";

/** The federal minimum wage an hour, in cents (Fair Labor Standards Act). */
export const FEDERAL_MINIMUM_HOURLY_MINOR = Math.round(
  FEDERAL_MINIMUM_HOURLY * 100,
);

/**
 * PLACEHOLDER(research: federal-minimum-wage-raise-level). The federal rate an
 * Act that answers yes to raising the minimum wage sets, until ChatGPT says
 * what level the game's Congress bills carry. $15.00 an hour is the level the
 * outcome web's minimum-wage links are calibrated for (CBO 2019, "a raise to
 * about $15"); it is not a claim about any bill.
 */
export const FEDERAL_RAISE_PLACEHOLDER = {
  researchQuestionId: "federal-minimum-wage-raise-level",
  hourlyMinor: 1500,
} as const;

/** One step of the federal minimum: the rate from a date until the next step. */
export interface FederalMinimumStep {
  readonly from: IsoDate;
  readonly hourlyMinor: number;
  readonly measureId: EntityId;
  readonly designation: string;
}

const schedules = new WeakMap<object, readonly FederalMinimumStep[]>();
const NO_ENACTMENTS: readonly FederalMinimumStep[] = [];

/**
 * Every date an enacted federal law on the raise question took effect, and the
 * federal minimum from then on, oldest first. Empty when no law was enacted.
 */
export function federalMinimumSchedule(
  world: World,
): readonly FederalMinimumStep[] {
  const enactments = world.history.legislativeEnactments;
  if (!enactments?.length) return NO_ENACTMENTS;
  const cached = schedules.get(enactments);
  if (cached) return cached;
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find(
    (definition) => definition.stableKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  );
  const steps: FederalMinimumStep[] = [];
  if (proposition) {
    const dates = new Set<IsoDate>();
    for (const enactment of enactments) {
      if (enactment.outcome !== "enacted") continue;
      const measure = world.history.legislativeMeasures?.find(
        (entry) => entry.id === enactment.measureId,
      );
      if (!measure || !measurePropositionAnswer(measure, proposition.id))
        continue;
      dates.add(
        enactment.effectiveAt ??
          addDays(enactment.resolvedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS),
      );
    }
    for (const from of [...dates].sort()) {
      const law = lawInForce(
        world,
        NATIONAL_ELECTION_JURISDICTION.id,
        proposition.id,
        from,
      );
      if (!law || law.origin !== "enacted") continue;
      const measure = world.history.legislativeMeasures?.find(
        (entry) => entry.id === law.measureId,
      );
      steps.push({
        from,
        hourlyMinor:
          law.answer === "yes"
            ? FEDERAL_RAISE_PLACEHOLDER.hourlyMinor
            : FEDERAL_MINIMUM_HOURLY_MINOR,
        measureId: law.measureId,
        designation: measure?.designation ?? "A federal law",
      });
    }
  }
  schedules.set(enactments, steps);
  return steps;
}

/** The step of the federal minimum in force on `onDate`, or null before any. */
export function federalMinimumStepAt(
  world: World,
  onDate: IsoDate,
): FederalMinimumStep | null {
  let found: FederalMinimumStep | null = null;
  for (const step of federalMinimumSchedule(world)) {
    if (step.from > onDate) break;
    found = step;
  }
  return found;
}

/** The federal minimum wage in force on `onDate`, in cents an hour. */
export function federalMinimumHourlyMinorAt(
  world: World,
  onDate: IsoDate,
): number {
  return (
    federalMinimumStepAt(world, onDate)?.hourlyMinor ??
    FEDERAL_MINIMUM_HOURLY_MINOR
  );
}

/**
 * The state's basic minimum wage on file, or the federal one; null when the
 * state's rate is unknown. Dollars an hour.
 */
export function startingMinimumHourly(
  jurisdictionId: EntityId | null,
): number | null {
  const place = jurisdictionId
    ? lifePlaceByJurisdictionId(jurisdictionId)
    : null;
  const key = place?.stateJurisdictionKey ?? null;
  if (!key || !(key in TOWN_MINIMUM_WAGES)) return FEDERAL_MINIMUM_HOURLY;
  const state = TOWN_MINIMUM_WAGES[key];
  if (state === null || state === undefined) return null;
  return Math.max(FEDERAL_MINIMUM_HOURLY, state);
}

/** The minimum wage in force at a job, and the law or rate that sets it. */
export interface MinimumWageSetting {
  readonly hourlyMinor: number;
  readonly level: "federal" | "state";
  /** The enacted measure that set it; null for a rate on file at the start. */
  readonly measureId: EntityId | null;
  readonly designation: string | null;
  /** The day that law took effect; null for a rate on file at the start. */
  readonly effectiveAt: IsoDate | null;
}

/**
 * The minimum wage in force where the job is on `onDate`: the higher of the
 * federal rate (raised by an enacted Act), the state's rate on file and a
 * state law the game enacted, which replaces the state's rate from the day it
 * takes effect (never below the federal rate). Null when the state's rate is
 * unknown and no enacted law sets one. Local minimums are NOT MODELED. A tie
 * goes to the state.
 */
export function minimumWageSettingAt(
  world: World,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
): MinimumWageSetting | null {
  const step = federalMinimumStepAt(world, onDate);
  const federal: MinimumWageSetting = {
    hourlyMinor: step?.hourlyMinor ?? FEDERAL_MINIMUM_HOURLY_MINOR,
    level: "federal",
    measureId: step?.measureId ?? null,
    designation: step?.designation ?? null,
    effectiveAt: step?.from ?? null,
  };
  const place = jurisdictionId
    ? lifePlaceByJurisdictionId(jurisdictionId)
    : null;
  const key = place?.stateJurisdictionKey ?? null;
  let state: MinimumWageSetting | null = null;
  if (key && /^US-[A-Z]{2}$/.test(key)) {
    const law = ruleValueInWorld(
      world,
      {
        jurisdiction: key,
        officeKey: laborLawOfficeKey(key.slice(3)),
        field: "labor.minimumWage.hourlyCents",
        onDate,
      },
      null,
    );
    if (law.source === "enacted" && typeof law.value === "number")
      state = {
        hourlyMinor: law.value,
        level: "state",
        measureId: law.measureId,
        designation: law.designation,
        effectiveAt: law.effectiveAt,
      };
  }
  if (!state) {
    const starting = startingMinimumHourly(jurisdictionId);
    if (starting === null) return null;
    state = {
      hourlyMinor: Math.round(starting * 100),
      level: "state",
      measureId: null,
      designation: null,
      effectiveAt: null,
    };
  }
  return federal.hourlyMinor > state.hourlyMinor ? federal : state;
}

/**
 * The minimum wage in force where the job is on `onDate`, in dollars an hour;
 * null when unknown. See `minimumWageSettingAt`.
 */
export function minimumHourlyAt(
  world: World,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
): number | null {
  const setting = minimumWageSettingAt(world, jurisdictionId, onDate);
  return setting === null ? null : setting.hourlyMinor / 100;
}

/** The minimum wage in cents an hour; null if unknown. */
export function minimumHourlyMinorAt(
  world: World,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
): number | null {
  return (
    minimumWageSettingAt(world, jurisdictionId, onDate)?.hourlyMinor ?? null
  );
}
