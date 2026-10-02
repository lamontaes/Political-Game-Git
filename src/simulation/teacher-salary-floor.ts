/** A public teacher's annual floor comes from the operative law's saved terms. */

import { addDays, makeIsoDate, yearOf } from "./dates";
import { lawInForce } from "./governing/law-in-force";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import startingLaw from "../../data/research/laws/starting-law-2026.json" with { type: "json" };
import type { EntityId, IsoDate, World } from "./types";

export const TEACHER_SALARY_FLOOR_QUESTION =
  "us-policy-positions:education.raise-teacher-minimum-salary";

/** The occupation and employer a state teacher salary floor covers. */
export const TEACHER_FLOOR_OCCUPATION = "profession:teacher";
export const TEACHER_FLOOR_EMPLOYER = "service:school";

const HAS_STARTING_FLOOR = Object.values(
  startingLaw.questions[TEACHER_SALARY_FLOOR_QUESTION].answers,
).some((row) => "lawTerms" in row && row.lawTerms.length > 0);

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
  /** The enacted measure that set it. */
  readonly measureId: EntityId;
  /** The first day the floor applies: a school year's first day. */
  readonly from: IsoDate;
}

/**
 * The minimum teacher salary in force where the job is on `onDate`, in
 * dollars a year. The numeric floor is annual USD minor units in the
 * adopted `floor` term, independent of wage surveys. Missing terms supply
 * no floor. The unused median argument is retained for existing callers.
 */
export function teacherSalaryFloorAt(
  world: World,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
  _stateMedian: number | null,
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
      ? teacherSalaryFloorAt(world, jurisdictionId, before, _stateMedian)
      : null;
  }
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey: TEACHER_SALARY_FLOOR_QUESTION,
    termKey: "floor",
    unit: "minor",
    onDate,
  });
  if (!term || !Number.isSafeInteger(term.value) || term.value < 0) return null;
  return { annual: term.value / 100, measureId: law.measureId, from };
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

/**
 * Whether a saved starting or enacted law could set a floor. The law itself
 * is read through `lawInForce`, including amendments and riders.
 */
export function anyTeacherFloorLawEnacted(world: World): boolean {
  return (
    teacherFloorProposition(world) !== null &&
    (HAS_STARTING_FLOOR ||
      (world.history.legislativeEnactments ?? []).some(
        (enactment) => enactment.outcome === "enacted",
      ))
  );
}
