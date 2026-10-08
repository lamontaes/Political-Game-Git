import {
  activeEducationEnrollmentsAt,
  currentLifeCutoff,
  didPeopleShareEducationOrganization,
} from "../life-queries";
import { schoolGradeOn, schoolTermOn } from "../school-calendar";
import type { EntityId, SimulationMoment, World } from "../types";
import { isPersonAliveAt } from "../vitality-integrity";
import { WORK_PATTERNS } from "./work-schedules";

/** GAME ASSUMPTION: a pupil's school day is the school workday shape. */
const SCHOOL_DAY = WORK_PATTERNS.school;

function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/**
 * Whether a pupil is in class at a moment: enrolled in a school program, the
 * shared school calendar has a term in session on the date, and the moment
 * falls in the school day of a school weekday. A summer morning, a weekend or
 * an evening is not class, and nobody is drawn to decide it.
 */
export function inClassAt(
  world: World,
  personId: EntityId,
  moment: SimulationMoment = world.currentMoment,
): boolean {
  if (!world.people[personId]) return false;
  if (schoolTermOn(moment.date) === null) return false;
  if (!SCHOOL_DAY.weekdays?.includes(weekdayOf(moment.date) as never))
    return false;
  const enrolled = activeEducationEnrollmentsAt(world, personId).some((entry) =>
    entry.enrollment.programKind.startsWith("schooling:"),
  );
  if (!enrolled) return false;
  return SCHOOL_DAY.shifts.some(
    (shift) =>
      moment.minuteOfDay >= shift.startMinute &&
      moment.minuteOfDay < shift.startMinute + shift.minutes,
  );
}

/**
 * The pupils in the same grade at the same school who are in class with this
 * pupil at a moment: alive, enrolled at a shared school, in class, and in the
 * same grade on the shared calendar. Read from the enrollment records; nobody
 * is drawn. Empty when this pupil is not in class or the school has nobody
 * else on record, which is true.
 */
export function classmatesInClassAt(
  world: World,
  personId: EntityId,
  moment: SimulationMoment = world.currentMoment,
): readonly EntityId[] {
  if (!inClassAt(world, personId, moment)) return [];
  const cutoff = currentLifeCutoff(world);
  const grade = schoolGradeOn(world, personId, moment.date);
  return world.personOrder.filter(
    (id) =>
      id !== personId &&
      isPersonAliveAt(world, id, cutoff) &&
      schoolGradeOn(world, id, moment.date) === grade &&
      inClassAt(world, id, moment) &&
      didPeopleShareEducationOrganization(world, personId, id, cutoff),
  );
}
