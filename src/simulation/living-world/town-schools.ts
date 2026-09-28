/**
 * The town's school district: a government of its own, and what it counts
 * each school year.
 *
 * Before this, the town's public school was only an employer
 * (`town-employment.ts`, "<Town> Public Schools") and its pupils were
 * enrolled one by one (`town-residents.ts`). Nothing counted how many
 * children the district taught, how many teachers it had, or how that changed.
 *
 * At the opening the town gets one school district, recorded as an
 * organization of the school-district level of government in the town's
 * jurisdiction, and the district counts its year. Then every fall, on the
 * count day, it counts again. Each count is read from the world's own
 * records, never drawn:
 *
 * - enrollment: children with an active enrollment in one of the town's
 *   public schools on the count day;
 * - teachers: people whose active job on the count day is a teacher at one
 *   of those schools;
 * - students per teacher, from those two, or none when there is no teacher.
 *
 * A count after the first names what changed from the year before and why:
 * more or fewer pupils (enrollment), or more or fewer teachers (staffing).
 *
 * Money (spending per student, revenue by source, teacher pay) is not
 * recorded here yet: its opening values wait on approved research, and an
 * unknown amount is never written as zero.
 *
 * GAME ASSUMPTION, not read from a source: the district's name, "<Town>
 * School District", and the count day, October 1, which is the fall count
 * date many states use.
 */

import { ageOnDate } from "../dates";
import { organizationProfileAt } from "../life-queries";
import {
  createEducationEnrollment,
  createOrganization,
  recordEducationEnrollmentState,
} from "../life";
import { SCHOOL_AGES, schoolProgram } from "./town-residents";
import { createStableId } from "../ids";
import { scheduleFutureDueItem } from "../future-transitions";
import type {
  EducationProgramKind,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  SchoolDistrictYearCause,
  SchoolDistrictYearRecord,
  World,
} from "../types";

export const TOWN_SCHOOLS_VERSION = "town-schools-v1";
export const SCHOOL_DISTRICT_CLASSIFICATION = "service:school-district";
export const SCHOOL_DISTRICT_COUNT_TRANSITION_KEY =
  "school-district:fall-count";

/** GAME ASSUMPTION: the fall count day, as month and day. */
export const SCHOOL_COUNT_MONTH_DAY = "10-01";

/**
 * RESEARCH VALUE, labeled: pupils per teacher in U.S. public schools, fall
 * 2022 (NCES Common Core of Data, Digest of Education Statistics table
 * 208.20: 15.4). The town hires teachers up to its pupils divided by this,
 * and at least one per public school. One rule for every state and territory.
 */
export const PUPILS_PER_TEACHER = 15.4;

const PUBLIC_SCHOOL_CLASSIFICATION = "service:school";
const TEACHER_OCCUPATION = "profession:teacher";
const COUNT_KEY_PREFIX = `${TOWN_SCHOOLS_VERSION}:count:`;

export function schoolDistrictKey(town: EntityId): string {
  return `${TOWN_SCHOOLS_VERSION}:${town}:district`;
}

/** The school year a date falls in, named by its fall and spring: "2026-27". */
export function schoolYearOf(date: IsoDate): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const fall = month >= 7 ? year : year - 1;
  return `${fall}-${String((fall + 1) % 100).padStart(2, "0")}`;
}

/** The next count day strictly after `date`. */
export function nextSchoolCountDay(date: IsoDate): IsoDate {
  const year = Number(date.slice(0, 4));
  const thisYear = `${year}-${SCHOOL_COUNT_MONTH_DAY}` as IsoDate;
  return thisYear > date
    ? thisYear
    : (`${year + 1}-${SCHOOL_COUNT_MONTH_DAY}` as IsoDate);
}

function organizationsIn(
  world: World,
  town: EntityId,
  classification: string,
): readonly EntityId[] {
  return world.history.organizations
    .filter((organization) => {
      const profile = organizationProfileAt(world, organization.id);
      return (
        profile?.classification === classification &&
        profile.locationJurisdictionId === town
      );
    })
    .map((organization) => organization.id);
}

export function townSchoolDistrictId(
  world: World,
  town: EntityId,
): EntityId | null {
  const key = schoolDistrictKey(town);
  return (
    world.history.organizations.find((row) => row.stableKey === key)?.id ?? null
  );
}

/** Children enrolled today in the town's public schools. */
function enrolledPupils(
  world: World,
  schools: ReadonlySet<EntityId>,
  today: IsoDate,
): number {
  const latest = new Map<EntityId, string>();
  for (const row of world.history.educationEnrollmentStates)
    if (row.effectiveAt <= today) latest.set(row.enrollmentId, row.status);
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  const pupils = new Set<EntityId>();
  for (const enrollment of world.history.educationEnrollments) {
    if (!schools.has(enrollment.organizationId)) continue;
    if (enrollment.startedAt > today) continue;
    if (latest.get(enrollment.id) !== "active") continue;
    if (dead.has(enrollment.personId)) continue;
    const person = world.people[enrollment.personId];
    // A pupil who has aged past school is not taught here any longer.
    if (person && ageOnDate(person.birthDate, today) > 18) continue;
    pupils.add(enrollment.personId);
  }
  return pupils.size;
}

/** People whose active job today is teaching at one of the town's schools. */
function activeTeachers(
  world: World,
  schools: ReadonlySet<EntityId>,
  today: IsoDate,
): number {
  const status = new Map<EntityId, string>();
  for (const row of world.history.workStatuses)
    if (row.effectiveAt <= today)
      status.set(row.workRelationshipId, row.status);
  const role = new Map<EntityId, string | null>();
  for (const row of world.history.workRoles)
    if (row.effectiveAt <= today)
      role.set(row.workRelationshipId, row.occupationClassification);
  const teachers = new Set<EntityId>();
  for (const job of world.history.workRelationships) {
    if (!job.organizationId || !schools.has(job.organizationId)) continue;
    if (status.get(job.id) !== "active") continue;
    if (role.get(job.id) !== TEACHER_OCCUPATION) continue;
    teachers.add(job.personId);
  }
  return teachers.size;
}

/**
 * How many teachers the town's public schools need today: its enrolled pupils
 * at the national ratio, rounded up, and never fewer than one per school.
 */
export function townTeacherNeed(
  world: World,
  town: EntityId,
): { readonly needed: number; readonly teachers: number } {
  const schools = new Set(
    organizationsIn(world, town, PUBLIC_SCHOOL_CLASSIFICATION),
  );
  const today = world.currentDate;
  const pupils = enrolledPupils(world, schools, today);
  return {
    needed: Math.max(schools.size, Math.ceil(pupils / PUPILS_PER_TEACHER)),
    teachers: activeTeachers(world, schools, today),
  };
}

function studentsPerTeacher(enrollment: number, teachers: number) {
  return teachers === 0 ? null : Math.round((enrollment / teachers) * 10) / 10;
}

function causesBetween(
  previous: SchoolDistrictYearRecord | undefined,
  enrollment: number,
  teachers: number,
): readonly SchoolDistrictYearCause[] {
  if (!previous) return [];
  const causes: SchoolDistrictYearCause[] = [];
  if (enrollment !== previous.enrollment)
    causes.push({
      kind: "enrollment",
      change: enrollment - previous.enrollment,
    });
  if (teachers !== previous.teachers)
    causes.push({ kind: "staffing", change: teachers - previous.teachers });
  return causes;
}

/** The latest state of every enrollment on `today`. */
function latestEnrollmentStates(world: World, today: IsoDate) {
  const latest = new Map<
    EntityId,
    World["history"]["educationEnrollmentStates"][number]
  >();
  for (const row of world.history.educationEnrollmentStates)
    if (row.effectiveAt <= today) latest.set(row.enrollmentId, row);
  return latest;
}

/**
 * The fall start of a school year, before the count: every school-age child
 * living in town goes to the public school that teaches their age.
 *
 * - A child of school age with no school starts at the one for their age
 *   (a five-year-old starts school, a newcomer's child enrolls).
 * - A pupil who has outgrown their town school finishes there and starts at
 *   the next one (elementary to middle, middle to high school).
 * - A pupil past 17 finishes and leaves school.
 *
 * A child at a private or out-of-town school is left there, and so is the
 * player, whose own schooling has its own stages. Written through the same
 * enrollment writers the opening uses.
 */
export function startSchoolYear(world: World, town: EntityId): World {
  const today = world.currentDate;
  const schools = organizationsIn(world, town, PUBLIC_SCHOOL_CLASSIFICATION)
    .map((id) => ({ id, program: schoolProgram(world, id) }))
    .filter(
      (school): school is { id: EntityId; program: string } =>
        school.program !== null && school.program in SCHOOL_AGES,
    );
  if (schools.length === 0) return world;
  const publicIds = new Set(schools.map((school) => school.id));
  const schoolFor = (age: number) =>
    schools.find(({ program }) => {
      const [min, max] = SCHOOL_AGES[program]!;
      return age >= min && age <= max;
    }) ?? null;
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  const latest = latestEnrollmentStates(world, today);
  const active = new Map<
    EntityId,
    (typeof world.history.educationEnrollments)[number][]
  >();
  for (const enrollment of world.history.educationEnrollments) {
    if (latest.get(enrollment.id)?.status !== "active") continue;
    if (enrollment.startedAt > today) continue;
    active.set(enrollment.personId, [
      ...(active.get(enrollment.personId) ?? []),
      enrollment,
    ]);
  }
  const year = schoolYearOf(today);
  const provenance = {
    kind: "generated" as const,
    generatorKey: TOWN_SCHOOLS_VERSION,
  };
  let next = world;
  for (const person of Object.values(world.people)) {
    if (person.homeJurisdictionId !== town) continue;
    if (person.id === player || dead.has(person.id)) continue;
    const age = ageOnDate(person.birthDate, today);
    const current = active.get(person.id) ?? [];
    // A child at a school that is not one of the town's public schools stays.
    if (current.some((row) => !publicIds.has(row.organizationId))) continue;
    const fits = schoolFor(age);
    let placed = false;
    for (const enrollment of current) {
      if (fits && enrollment.organizationId === fits.id) {
        placed = true;
        continue;
      }
      const state = latest.get(enrollment.id)!;
      next = recordEducationEnrollmentState(next, {
        stableKey: `${enrollment.stableKey}:${TOWN_SCHOOLS_VERSION}:${year}:finished`,
        enrollmentId: enrollment.id,
        effectiveAt: today,
        status: "completed",
        contextKind: state.contextKind,
        reason: fits ? "moved-up" : "finished-school",
        provenance,
        supersedesStateId: state.id,
      });
    }
    if (placed || !fits) continue;
    next = createEducationEnrollment(next, {
      stableKey: `${TOWN_SCHOOLS_VERSION}:${town}:${person.id}:${year}:school`,
      personId: person.id,
      organizationId: fits.id,
      startedAt: today,
      programKind: fits.program as EducationProgramKind,
      contextKind: "stage:school",
      provenance,
    });
  }
  return next;
}

/** The district's counts, newest last. */
export function schoolDistrictYears(
  world: World,
  districtId: EntityId,
): readonly SchoolDistrictYearRecord[] {
  return (world.history.schoolDistrictYears ?? []).filter(
    (row) => row.districtOrganizationId === districtId,
  );
}

/** Counts the district's year on today's date, once per school year. */
export function countSchoolDistrictYear(world: World, town: EntityId): World {
  const districtId = townSchoolDistrictId(world, town);
  if (!districtId) return world;
  const today = world.currentDate;
  const schoolYear = schoolYearOf(today);
  const stableKey = `${schoolDistrictKey(town)}:year:${schoolYear}`;
  const years = world.history.schoolDistrictYears ?? [];
  if (years.some((row) => row.stableKey === stableKey)) return world;
  const schoolIds = organizationsIn(world, town, PUBLIC_SCHOOL_CLASSIFICATION);
  const schools = new Set(schoolIds);
  const enrollment = enrolledPupils(world, schools, today);
  const teachers = activeTeachers(world, schools, today);
  const previous = schoolDistrictYears(world, districtId).at(-1);
  const record: SchoolDistrictYearRecord = {
    id: createStableId("school-district-year", `${world.id}:${stableKey}`),
    stableKey,
    sequence: world.history.nextSequence,
    districtOrganizationId: districtId,
    jurisdictionId: town,
    schoolYear,
    countedAt: today,
    schoolIds,
    enrollment,
    teachers,
    studentsPerTeacher: studentsPerTeacher(enrollment, teachers),
    causes: causesBetween(previous, enrollment, teachers),
    provenance: { kind: "generated", generatorKey: TOWN_SCHOOLS_VERSION },
  };
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      schoolDistrictYears: [...years, record],
    },
  };
}

function scheduleNextCount(world: World, town: EntityId): World {
  const dueAt = nextSchoolCountDay(world.currentDate);
  const stableKey = `${COUNT_KEY_PREFIX}${town}:${dueAt}`;
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt,
    transitionKey: SCHOOL_DISTRICT_COUNT_TRANSITION_KEY,
    entityIds: [world.id],
    jurisdictionId: town,
    provenance: {
      kind: "initialization",
      reference: TOWN_SCHOOLS_VERSION,
    },
  });
}

/**
 * The town's school district, once, with its opening count and its next fall
 * count on the calendar. Unchanged when the town has no public school.
 */
export function ensureTownSchoolDistrict(world: World, town: EntityId): World {
  const jurisdiction = world.jurisdictions[town];
  if (!jurisdiction) return world;
  if (organizationsIn(world, town, PUBLIC_SCHOOL_CLASSIFICATION).length === 0)
    return world;
  let next = world;
  if (!townSchoolDistrictId(next, town))
    next = createOrganization(next, {
      stableKey: schoolDistrictKey(town),
      formedAt: next.currentDate,
      detailLevel: "lightweight",
      provenance: { kind: "generated", generatorKey: TOWN_SCHOOLS_VERSION },
      initialProfile: {
        name: `${jurisdiction.name} School District`,
        classification: SCHOOL_DISTRICT_CLASSIFICATION,
        locationJurisdictionId: town,
      },
    });
  return scheduleNextCount(countSchoolDistrictYear(next, town), town);
}

export function schoolDistrictCountHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== SCHOOL_DISTRICT_COUNT_TRANSITION_KEY)
    throw new Error("The school count received another transition.");
  const town = dueItem.jurisdictionId;
  if (!town || !townSchoolDistrictId(world, town))
    return {
      world,
      status: "cancelled",
      reasonKey: "school-district:no-district",
      context: null,
      outcomeEventId: null,
    };
  const next = scheduleNextCount(
    countSchoolDistrictYear(startSchoolYear(world, town), town),
    town,
  );
  return {
    world: next,
    status: "resolved",
    reasonKey: "school-district:counted",
    context: null,
    outcomeEventId: null,
  };
}
