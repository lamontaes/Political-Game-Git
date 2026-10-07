import { ageOnDate } from "../dates";
import {
  activeEducationEnrollmentsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import type { EntityId, SimulationMoment, World } from "../types";
import { isPersonAliveAt } from "../vitality-integrity";
import { WORK_PATTERNS, whereaboutsAt } from "./work-schedules";

/** GAME ASSUMPTION: a child's school day is the school workday shape above. */
const SCHOOL_DAY = WORK_PATTERNS.school;

function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/**
 * Whether an enrolled minor is in class at a moment. Whereabouts follow jobs
 * and recorded activities, so a student's school day is read here from the
 * same school week the town's school staff work.
 */
function inClassAt(
  world: World,
  personId: EntityId,
  moment: SimulationMoment,
): boolean {
  const person = world.people[personId];
  if (!person || ageOnDate(person.birthDate, moment.date) >= 19) return false;
  if (!SCHOOL_DAY.weekdays?.includes(weekdayOf(moment.date) as never))
    return false;
  if (activeEducationEnrollmentsAt(world, personId).length === 0) return false;
  return SCHOOL_DAY.shifts.some(
    (shift) =>
      moment.minuteOfDay >= shift.startMinute &&
      moment.minuteOfDay < shift.startMinute + shift.minutes,
  );
}

/**
 * The people who share this person's primary home and are at home at a moment:
 * alive, not on shift or at a recorded activity, and not in class. It reads
 * the household record and the work week the world already holds; nothing is
 * drawn. A moment when everyone else is out gives nobody, which is true.
 */
export function householdMembersAtHome(
  world: World,
  personId: EntityId,
  moment: SimulationMoment = world.currentMoment,
): readonly EntityId[] {
  const membership = householdMembershipsAt(world, personId).find(
    (entry) => entry.state.residenceRole === "primary",
  );
  if (!membership) return [];
  const cutoff = currentLifeCutoff(world);
  return peopleInHouseholdAt(world, membership.household.id, cutoff).filter(
    (id) =>
      id !== personId &&
      world.people[id] !== undefined &&
      isPersonAliveAt(world, id, cutoff) &&
      whereaboutsAt(world, id, moment).kind === "home" &&
      !inClassAt(world, id, moment),
  );
}
