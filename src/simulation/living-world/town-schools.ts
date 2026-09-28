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
import {
  WORKING_AGE_MAX,
  fillTownJobs,
  laborStatus,
  townResidents,
} from "./town-employment";
import {
  educationLawOfficeKey,
  ruleValueInWorld,
} from "../enacted-rule-changes";
import { recordLawExposure } from "../law-exposure";
import { lifePlaceByJurisdictionId } from "../life-places";
import { outcomeFactor } from "../outcome-web";
import { parentsOf } from "../people-family";
import { SeededRng } from "../rng";
import { createStableId } from "../ids";
import { scheduleFutureDueItem } from "../future-transitions";
import type {
  EducationProgramKind,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  SchoolClassSizeLaw,
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

/**
 * RESEARCH VALUE, labeled: the average class in a public primary school's
 * self-contained classrooms, 21 pupils (NCES, National Teacher and Principal
 * Survey, 2017-18). It sits above PUPILS_PER_TEACHER because not every
 * teacher leads a class of their own; the game keeps that proportion, so a
 * cap on classes asks for teachers in the same proportion.
 */
export const NATIONAL_CLASS_SIZE = 21;

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

/** Children enrolled today in each of the town's public schools. */
function pupilsBySchool(
  world: World,
  schools: ReadonlySet<EntityId>,
  today: IsoDate,
): ReadonlyMap<EntityId, ReadonlySet<EntityId>> {
  const latest = new Map<EntityId, string>();
  for (const row of world.history.educationEnrollmentStates)
    if (row.effectiveAt <= today) latest.set(row.enrollmentId, row.status);
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  const bySchool = new Map<EntityId, Set<EntityId>>();
  for (const school of schools) bySchool.set(school, new Set());
  for (const enrollment of world.history.educationEnrollments) {
    if (!schools.has(enrollment.organizationId)) continue;
    if (enrollment.startedAt > today) continue;
    if (latest.get(enrollment.id) !== "active") continue;
    if (dead.has(enrollment.personId)) continue;
    const person = world.people[enrollment.personId];
    // A pupil who has aged past school is not taught here any longer.
    if (person && ageOnDate(person.birthDate, today) > 18) continue;
    bySchool.get(enrollment.organizationId)!.add(enrollment.personId);
  }
  return bySchool;
}

/** Children enrolled today in the town's public schools. */
function enrolledPupils(
  world: World,
  schools: ReadonlySet<EntityId>,
  today: IsoDate,
): number {
  const pupils = new Set<EntityId>();
  for (const set of pupilsBySchool(world, schools, today).values())
    for (const id of set) pupils.add(id);
  return pupils.size;
}

/** People whose active job today is teaching, by school. */
function teachersBySchool(
  world: World,
  schools: ReadonlySet<EntityId>,
  today: IsoDate,
): ReadonlyMap<EntityId, ReadonlySet<EntityId>> {
  const status = new Map<EntityId, string>();
  for (const row of world.history.workStatuses)
    if (row.effectiveAt <= today)
      status.set(row.workRelationshipId, row.status);
  const role = new Map<EntityId, string | null>();
  for (const row of world.history.workRoles)
    if (row.effectiveAt <= today)
      role.set(row.workRelationshipId, row.occupationClassification);
  const bySchool = new Map<EntityId, Set<EntityId>>();
  for (const school of schools) bySchool.set(school, new Set());
  for (const job of world.history.workRelationships) {
    if (!job.organizationId || !schools.has(job.organizationId)) continue;
    if (status.get(job.id) !== "active") continue;
    if (role.get(job.id) !== TEACHER_OCCUPATION) continue;
    bySchool.get(job.organizationId)!.add(job.personId);
  }
  return bySchool;
}

/** People whose active job today is teaching at one of the town's schools. */
function activeTeachers(
  world: World,
  schools: ReadonlySet<EntityId>,
  today: IsoDate,
): number {
  const teachers = new Set<EntityId>();
  for (const set of teachersBySchool(world, schools, today).values())
    for (const id of set) teachers.add(id);
  return teachers.size;
}

/**
 * The state class-size law in force in the town on `onDate`: an enacted
 * change to `education.classSize.maximum` under the state's education law.
 * Null when no law the game enacted sets one; the game compiles no state's
 * real class-size rules, so without a law only the national ratio applies.
 */
export function classSizeLawAt(
  world: World,
  town: EntityId,
  onDate: IsoDate,
): SchoolClassSizeLaw | null {
  const key = lifePlaceByJurisdictionId(town)?.stateJurisdictionKey ?? null;
  if (!key || !/^US-[A-Z]{2}$/.test(key)) return null;
  const law = ruleValueInWorld(
    world,
    {
      jurisdiction: key,
      officeKey: educationLawOfficeKey(key.slice(3)),
      field: "education.classSize.maximum",
      onDate,
    },
    null,
  );
  if (law.source !== "enacted" || typeof law.value !== "number") return null;
  return {
    measureId: law.measureId,
    designation: law.designation,
    maximum: law.value,
  };
}

export interface TownTeacherNeed {
  /** Teachers the schools need today. */
  readonly needed: number;
  /** What the national ratio alone asks for, one per school at the least. */
  readonly byRatio: number;
  readonly teachers: number;
  /** The class-size law, when it asks for more than the national ratio. */
  readonly law: SchoolClassSizeLaw | null;
}

/**
 * How many teachers the town's public schools need today: its enrolled pupils
 * at the national ratio, rounded up, and never fewer than one per school. A
 * state class-size law in force can ask for more: each school enough
 * teachers for classes no larger than the law allows.
 */
export function townTeacherNeed(world: World, town: EntityId): TownTeacherNeed {
  const schools = new Set(
    organizationsIn(world, town, PUBLIC_SCHOOL_CLASSIFICATION),
  );
  const today = world.currentDate;
  const pupils = enrolledPupils(world, schools, today);
  const byRatio = Math.max(
    schools.size,
    Math.ceil(pupils / PUPILS_PER_TEACHER),
  );
  const teachers = activeTeachers(world, schools, today);
  const law = schools.size > 0 ? classSizeLawAt(world, town, today) : null;
  if (!law) return { needed: byRatio, byRatio, teachers, law: null };
  // Teachers for classes of `maximum`, at the national proportion of
  // teachers to classes; a cap at or above the national class asks nothing.
  const perTeacher = (PUPILS_PER_TEACHER * law.maximum) / NATIONAL_CLASS_SIZE;
  const byLaw = Math.max(schools.size, Math.ceil(pupils / perTeacher));
  return byLaw > byRatio
    ? { needed: byLaw, byRatio, teachers, law }
    : { needed: byRatio, byRatio, teachers, law: null };
}

/** Teachers hired at one fall start, and how many a class-size law asked for. */
export interface SchoolHiring {
  readonly world: World;
  readonly hired: number;
  readonly underLaw: number;
  readonly law: SchoolClassSizeLaw | null;
  /** The schools that gained a teacher the law asked for. */
  readonly lawSchools: readonly EntityId[];
}

/**
 * The fall hiring, after the school year starts and before the count: the
 * district hires teachers from town residents who want work and hold no job
 * until its schools have what they need (`townTeacherNeed`). Each hire goes
 * to the school with the most pupils per teacher. Hires first fill what the
 * national ratio asks for; any beyond that were asked for by the class-size
 * law, and the count names it. When nobody in town can be hired, the rest
 * stay vacant and the count records them.
 */
export function hireSchoolTeachers(world: World, town: EntityId): SchoolHiring {
  const need = townTeacherNeed(world, town);
  const room = need.needed - need.teachers;
  const none = {
    world,
    hired: 0,
    underLaw: 0,
    law: need.law,
    lawSchools: [],
  };
  if (room <= 0) return none;
  const today = world.currentDate;
  const year = schoolYearOf(today);
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  const latest = new Map<EntityId, string>();
  for (const row of world.history.workStatuses)
    if (row.effectiveAt <= today)
      latest.set(row.workRelationshipId, row.status);
  const working = new Set<EntityId>();
  for (const job of world.history.workRelationships)
    if (latest.get(job.id) === "active") working.add(job.personId);
  const teacherMinAge = 22;
  const candidates = townResidents(world, town)
    .filter((resident) => {
      if (resident.personId === player || working.has(resident.personId))
        return false;
      if (resident.age < teacherMinAge || resident.age > WORKING_AGE_MAX)
        return false;
      const status = laborStatus(world, resident);
      return status === "employed" || status === "looking-for-work";
    })
    .map((resident) => ({
      resident,
      draw: new SeededRng(world.seed)
        .fork(
          `${TOWN_SCHOOLS_VERSION}:teacher-draw:${resident.personId}:${year}`,
        )
        .next(),
    }))
    .sort(
      (a, b) =>
        a.draw - b.draw ||
        a.resident.personId.localeCompare(b.resident.personId),
    )
    .map((entry) => entry.resident);
  const schools = new Set(
    organizationsIn(world, town, PUBLIC_SCHOOL_CLASSIFICATION),
  );
  const pupils = pupilsBySchool(world, schools, today);
  const staffed = new Map(
    [...teachersBySchool(world, schools, today)].map(
      ([id, set]) => [id, set.size] as const,
    ),
  );
  const ratioRoom = Math.max(0, need.byRatio - need.teachers);
  let next = world;
  let hired = 0;
  const lawSchools = new Set<EntityId>();
  for (const resident of candidates) {
    if (hired >= room) break;
    const school = [...schools]
      .map((id) => ({
        id,
        load: (pupils.get(id)?.size ?? 0) / Math.max(0.5, staffed.get(id) ?? 0),
      }))
      .sort((a, b) => b.load - a.load || a.id.localeCompare(b.id))[0];
    if (!school) break;
    const before = next.history.workRelationships.length;
    next = fillTownJobs(next, town, [resident], {
      round: `${TOWN_SCHOOLS_VERSION}:${year}`,
      into: {
        workplace: "public-school",
        organizationId: school.id,
        title: "Teacher",
      },
    });
    if (next.history.workRelationships.length === before) continue;
    hired += 1;
    staffed.set(school.id, (staffed.get(school.id) ?? 0) + 1);
    if (need.law && hired > ratioRoom) lawSchools.add(school.id);
  }
  return {
    world: next,
    hired,
    underLaw: need.law ? Math.max(0, hired - ratioRoom) : 0,
    law: need.law,
    lawSchools: [...lawSchools],
  };
}

/**
 * GAME PROFILE, labeled: the share of pupils at grade level before any link
 * moves it, 35%, the national average of the 2024 grade 4 NAEP math (39%)
 * and reading (31%) shares at or above Proficient. No state's own share is
 * compiled; every district starts from this one.
 */
export const PROFICIENT_BASE_PCT = 35;

/**
 * The district's class, at the national scale: the national class (or the
 * law's cap, when lower) when every teacher the schools need is at work,
 * and proportionally larger for each one missing. A town is a small sample
 * of its place, so its own pupils per teacher (a school of six pupils still
 * has its teacher) is not read as a class size. Null with no teacher.
 */
function classSizeOf(
  law: SchoolClassSizeLaw | null,
  needed: number,
  teachers: number,
): number | null {
  if (teachers === 0 || needed === 0) return null;
  const target = law
    ? Math.min(NATIONAL_CLASS_SIZE, law.maximum)
    : NATIONAL_CLASS_SIZE;
  return Math.round(((target * needed) / Math.min(teachers, needed)) * 10) / 10;
}

function studentsPerTeacher(enrollment: number, teachers: number) {
  return teachers === 0 ? null : Math.round((enrollment / teachers) * 10) / 10;
}

function causesBetween(
  previous: SchoolDistrictYearRecord | undefined,
  enrollment: number,
  teachers: number,
  hiring: SchoolHiring | null,
): readonly SchoolDistrictYearCause[] {
  if (!previous) return [];
  const causes: SchoolDistrictYearCause[] = [];
  if (enrollment !== previous.enrollment)
    causes.push({
      kind: "enrollment",
      change: enrollment - previous.enrollment,
    });
  const byLaw = hiring?.law ? hiring.underLaw : 0;
  if (byLaw > 0)
    causes.push({
      kind: "class-size-law",
      change: byLaw,
      measureId: hiring!.law!.measureId,
    });
  const other = teachers - previous.teachers - byLaw;
  if (other !== 0) causes.push({ kind: "staffing", change: other });
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

/**
 * Counts the district's year on today's date, once per school year. `hiring`
 * is the fall hiring just done, so the count can name the law behind it.
 */
export function countSchoolDistrictYear(
  world: World,
  town: EntityId,
  hiring: SchoolHiring | null = null,
): World {
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
  const need = townTeacherNeed(world, town);
  const law = classSizeLawAt(world, town, today);
  const counted: SchoolDistrictYearRecord = {
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
    causes: causesBetween(previous, enrollment, teachers, hiring),
    classSizeLaw: law,
    classSize: classSizeOf(law, need.needed, teachers),
    teacherVacancies: Math.max(0, need.needed - teachers),
    provenance: { kind: "generated", generatorKey: TOWN_SCHOOLS_VERSION },
  };
  // Scores read this year's own count through the outcome web, so the web
  // is asked of the world as it will stand with the count in it.
  const withCount: World = {
    ...world,
    history: { ...world.history, schoolDistrictYears: [...years, counted] },
  };
  const scores =
    counted.studentsPerTeacher === null
      ? null
      : outcomeFactor(withCount, town, "school.test-scores", today);
  const record: SchoolDistrictYearRecord = {
    ...counted,
    proficiencyPct: scores
      ? Math.round(PROFICIENT_BASE_PCT * scores.multiplier * 10) / 10
      : null,
    proficiencyCauses: (scores?.causes ?? []).map((cause) => ({
      key: cause.key,
      from: cause.from,
      factor: cause.factor,
      causeValue: cause.causeValue,
      causeBaseline: cause.causeBaseline,
    })),
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

/**
 * A class-size law reaches a family when their child's school gained a
 * teacher the law asked for: each living parent of a pupil there, once a
 * school year, as a public service (`law-exposure.ts`).
 */
function recordClassSizeExposures(
  world: World,
  town: EntityId,
  hiring: SchoolHiring,
): World {
  if (!hiring.law || hiring.lawSchools.length === 0) return world;
  const districtId = townSchoolDistrictId(world, town);
  const count = districtId
    ? schoolDistrictYears(world, districtId).at(-1)
    : null;
  if (!count || count.countedAt !== world.currentDate) return world;
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  const pupils = pupilsBySchool(
    world,
    new Set(hiring.lawSchools),
    world.currentDate,
  );
  const parents = new Set<EntityId>();
  for (const set of pupils.values())
    for (const pupil of set)
      for (const parent of parentsOf(world, pupil))
        if (world.people[parent] && !dead.has(parent)) parents.add(parent);
  let next = world;
  for (const parent of [...parents].sort())
    next = recordLawExposure(next, {
      stableKey: `${TOWN_SCHOOLS_VERSION}:class-size:${count.schoolYear}:${parent}`,
      personId: parent,
      measureId: hiring.law.measureId,
      channel: "public-service",
      direction: "none",
      amount: null,
      cadence: null,
      sourceRecordId: count.id,
      includeFamily: false,
    });
  return next;
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
  const hiring = hireSchoolTeachers(startSchoolYear(world, town), town);
  const counted = countSchoolDistrictYear(hiring.world, town, hiring);
  const next = scheduleNextCount(
    recordClassSizeExposures(counted, town, hiring),
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
