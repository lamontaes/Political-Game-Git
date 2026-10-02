/**
 * THE STATE'S MINIMUM TEACHER SALARY — what a public school teacher must be
 * paid at least, under the law in force where they teach.
 *
 * The law is the policy question "Should the state set a minimum salary for
 * teachers above the current floor?"
 * (`education.raise-teacher-minimum-salary`), read through `lawInForce`.
 *
 * - A law the game began with uses its structured annual floor term. A yes
 *   answer or citation text alone does not establish a numeric salary floor.
 * - A law enacted in play that answers yes sets a floor. The floor is
 *   ESTIMATED FROM AVERAGE: a stable world/state draw between 67% and 95% of
 *   the state's median public school teacher wage (below). A
 *   state already paying more than that is raised by no one.
 * - A law enacted in play that answers no ends the floor for pay set from
 *   then on. Nobody's pay is cut, as a repealed minimum wage cuts nobody's.
 * - The floor applies from the first school year that begins on or after the
 *   law takes effect: July 1 (below).
 *
 * Only a public school's teachers are covered: a state salary floor binds
 * school districts, not private schools.
 */

import { addDays, makeIsoDate, yearOf } from "./dates";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import { lawInForce } from "./governing/law-in-force";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "./life-places";
import { drawnLinkSize } from "./outcome-web";
import type { EntityId, IsoDate, World } from "./types";

export const TEACHER_SALARY_FLOOR_QUESTION =
  "us-policy-positions:education.raise-teacher-minimum-salary";

/** The occupation and employer a state teacher salary floor covers. */
export const TEACHER_FLOOR_OCCUPATION = "profession:teacher";
export const TEACHER_FLOOR_EMPLOYER = "service:school";

/**
 * The floor a state law enacted in play sets, as a part of the state's
 * median elementary teacher wage (BLS OEWS May 2025, SOC 25-2021, all ownerships).
 *
 * ESTIMATED FROM AVERAGE: the five most recent enacted floors, each over its
 * state's May 2025 median. Arkansas $50,000 (Act 237 of 2023) over $52,700
 * is 0.95; New Mexico $50,000 (Senate Bill 1 of 2022) over $74,550 is 0.67;
 * Iowa $50,000 (Iowa Code 284.15, 2025-26) over $60,580 is 0.83; Tennessee
 * $50,000 by 2026-27 (Teacher Paycheck Protection Act of 2023) over $59,980
 * is 0.83; Maryland $60,000 from 2026-27 (Md. Code, Educ. 6-1009) over
 * $77,680 is 0.77. The average is 0.81, spread 0.67 to 0.95. The same rule
 * serves every place, so a state or territory where teachers earn less sets
 * a lower floor in dollars.
 */
export const TEACHER_FLOOR_OF_STATE_MEDIAN = {
  central: 0.81,
  low: 0.67,
  high: 0.95,
} as const;

/** One estimated floor ratio per world and state, shared by all its towns. */
export function teacherFloorRatioAt(
  world: World,
  jurisdictionId: EntityId,
): number {
  const stateKey =
    lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey;
  const stateId = stateKey ? stateJurisdictionForKey(stateKey)?.id : undefined;
  return drawnLinkSize(
    world,
    {
      key: "direct:teacher-salary-floor",
      size: TEACHER_FLOOR_OF_STATE_MEDIAN.central,
      range: [
        TEACHER_FLOOR_OF_STATE_MEDIAN.low,
        TEACHER_FLOOR_OF_STATE_MEDIAN.high,
      ],
      evidence: "researched",
    },
    stateId ?? jurisdictionId,
  );
}

/**
 * HARDWIRED: a floor first applies in the school year that begins on or after
 * the law takes effect, on July 1. Arkansas's, Iowa's, Maine's, Missouri's
 * and New Mexico's floors each began with a school year or the fiscal year
 * starting July 1 (the starting-law rows' citations).
 */
const SCHOOL_YEAR_STARTS = "07-01";

/** The first July 1 on or after `date`. */
export function schoolYearStartOnOrAfter(date: IsoDate): IsoDate {
  const sameYear = makeIsoDate(`${yearOf(date)}-${SCHOOL_YEAR_STARTS}`);
  return sameYear >= date
    ? sameYear
    : makeIsoDate(`${yearOf(date) + 1}-${SCHOOL_YEAR_STARTS}`);
}

export interface TeacherSalaryFloor {
  /** Dollars a year. */
  readonly annual: number;
  /** Exact enacted measure or canonical starting-law key. */
  readonly measureId: EntityId;
  /** The first day the floor applies: a school year's first day. */
  readonly from: IsoDate;
}

/**
 * The minimum teacher salary in force where the job is on `onDate`, in
 * dollars a year, or null when the operative floor amount is unavailable.
 * `stateMedian` is the state's median teacher wage in dollars a
 * year, or null where BLS publishes none (then no floor is claimed).
 */
export function teacherSalaryFloorAt(
  world: World,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
  stateMedian: number | null,
): TeacherSalaryFloor | null {
  if (!jurisdictionId) return null;
  const proposition = teacherFloorProposition(world);
  if (!proposition) return null;
  // The law in force on the first day of the school year `onDate` falls in.
  const law = lawInForce(world, jurisdictionId, proposition, onDate);
  if (!law || law.answer !== "yes") return null;
  const from =
    law.origin === "in-force-at-start"
      ? law.operativeAt
      : schoolYearStartOnOrAfter(law.operativeAt);
  if (from > onDate) {
    // Enacted but its school year has not begun: the floor before it, if an
    // earlier law set one, still governs.
    const before = addDays(law.operativeAt, -1);
    return before < onDate
      ? teacherSalaryFloorAt(world, jurisdictionId, before, stateMedian)
      : null;
  }
  const startingFloor =
    law.origin === "in-force-at-start"
      ? readFinalEnactedLawTerm(world, law, {
          questionKey: TEACHER_SALARY_FLOOR_QUESTION,
          termKey: "floor",
          unit: "dollars/year",
          onDate,
        })
      : null;
  // A starting yes establishes the rule, not an invented numeric floor.
  if (
    law.origin === "in-force-at-start" &&
    (!startingFloor ||
      !Number.isFinite(startingFloor.value) ||
      startingFloor.value <= 0)
  )
    return null;
  if (!startingFloor && (stateMedian === null || stateMedian <= 0)) return null;
  return {
    annual:
      startingFloor?.value ??
      Math.round(stateMedian! * teacherFloorRatioAt(world, jurisdictionId)),
    measureId: law.measureId,
    from,
  };
}

const propositionIds = new WeakMap<object, EntityId | null>();

function teacherFloorProposition(world: World): EntityId | null {
  const catalog = world.policyCatalog;
  if (!catalog) return null;
  const cached = propositionIds.get(catalog);
  if (cached !== undefined) return cached;
  const found =
    catalog.propositionOrder.find(
      (id) =>
        catalog.propositions[id]?.stableKey === TEACHER_SALARY_FLOOR_QUESTION,
    ) ?? null;
  propositionIds.set(catalog, found);
  return found;
}

/** Cheap catalog gate before reading pay. The dated reader checks whether
 * starting or enacted law supplies an operative floor for the actual place.
 * Retained export name preserves the existing payroll caller contract.
 */
export function anyTeacherFloorLawEnacted(world: World): boolean {
  return teacherFloorProposition(world) !== null;
}
