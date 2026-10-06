import { ageOnDate, makeIsoDate } from "./dates";
import {
  futureDueItemStateAt,
  scheduleFutureDueItem,
} from "./future-transitions";
import {
  createEducationEnrollment,
  createOrganization,
  recordEducationEnrollmentState,
} from "./life";
import { residentNameForJurisdiction } from "./life-places";
import {
  kindergartenYear,
  onCalendar,
  SCHOOL_STAGE_CALENDAR,
  SCHOOL_STAGE_CONTEXT,
  SCHOOL_STAGE_PROGRAM,
  SCHOOL_STAGE_TRANSITION_KEY,
  schoolGradeOn,
  schoolStageForGrade,
  type SchoolStageKey,
} from "./school-calendar";
import { recordsByStringField } from "./history-index";
import {
  educationEnrollmentStateAt,
  organizationProfileAt,
} from "./life-queries";
import { SeededRng } from "./rng";
import { generateSchoolNames, SCHOOL_NAMES_V2_VERSION } from "./school-names";
import { STATES } from "./state-reference";
import type {
  EducationEnrollment,
  EntityId,
  FutureDueItem,
  FutureDueItemProvenance,
  FutureTransitionHandlerResult,
  IsoDate,
  Jurisdiction,
  LifeRecordProvenance,
  World,
} from "./types";

/**
 * A child in school moves through it while the game is played: elementary,
 * then middle school, then high school, then a diploma.
 *
 * A new game that starts a child in school used to write one enrollment and
 * nothing after it, so a five-year-old was still at the elementary school at
 * eighteen. Now the start also schedules the end of the stage the child is in;
 * that end enrolls them in the next school for the fall, and the fall's first
 * day schedules the end of that one, until they graduate.
 *
 * ESTIMATED FROM AVERAGE — the same calendar a summarized childhood uses
 * (`how-a-summarized-childhood-varies`). The basis is the common K-5, 6-8,
 * 9-12 sequence in national NCES enrollment tables and a September 1 age-five
 * cutoff representative of California, Minnesota, and Texas: a child who is
 * five by September 1 starts kindergarten that fall; middle school six years
 * on, high school three after that, graduation four after that. A school year
 * starts on the first Monday on or after August 24 and ends on the Friday of
 * its fortieth week (May 28 to June 3), the same days for every child in the
 * district: one calendar a year, not one drawn per child (A140). Every
 * district keeps the same rule until district calendars are researched.
 */
export { SCHOOL_STAGE_TRANSITION_KEY } from "./school-calendar";

/**
 * Absent on a replay descriptor keeps the old start: one enrollment and
 * nothing after it, so an old save rebuilds the world it described.
 */
export const SCHOOL_STAGES_V1 = "school-stages-v1" as const;
/**
 * The start also dates the school it writes from this calendar: a child
 * starts each stage on the first day of a school year, not on a birthday, and
 * a five-year-old not yet due in kindergarten waits for the fall. Under v1 the
 * first school began on the fifth birthday, so a child born after September 1
 * was a year ahead of the calendar that moves them on, and spent seven years
 * in elementary school.
 */
export const SCHOOL_STAGES_V2 = "school-stages-v2" as const;
export type SchoolStageVersion =
  typeof SCHOOL_STAGES_V1 | typeof SCHOOL_STAGES_V2;

export {
  kindergartenYear,
  SCHOOL_STAGE_CALENDAR,
  schoolGradeOn,
  schoolTermOn,
} from "./school-calendar";

export type { SchoolStageKey } from "./school-calendar";

const PROGRAM = SCHOOL_STAGE_PROGRAM;
const CONTEXT = SCHOOL_STAGE_CONTEXT;
const FINISHED: Record<SchoolStageKey, string> = {
  elementary: "Completed elementary school.",
  middle: "Completed the middle-school program.",
  high: "Graduated from high school.",
};
const NEXT: Record<SchoolStageKey, SchoolStageKey | null> = {
  elementary: "middle",
  middle: "high",
  high: null,
};
const PROVENANCE = {
  kind: "generated" as const,
  generatorKey: "school-stages-v1",
};

/**
 * The day a stage's last school year ends for this child. A start that placed
 * the child a year ahead of the calendar (the start reads age, not grade)
 * finishes the stage at the next spring rather than in the past.
 */
export function schoolStageEndsAt(
  world: World,
  personId: EntityId,
  stage: SchoolStageKey,
): IsoDate {
  const person = world.people[personId]!;
  let year =
    kindergartenYear(person.birthDate) +
    SCHOOL_STAGE_CALENDAR.endsAfterYears[stage];
  let date = onCalendar(year, "ends");
  while (date <= world.currentDate) {
    year += 1;
    date = onCalendar(year, "ends");
  }
  return date;
}

/** The first day of the stage on this child's calendar. */
export function schoolStageCalendarStart(
  world: World,
  personId: EntityId,
  stage: SchoolStageKey,
): IsoDate {
  return onCalendar(
    kindergartenYear(world.people[personId]!.birthDate) +
      SCHOOL_STAGE_CALENDAR.startsAfterYears[stage],
    "starts",
  );
}

/** The last day of the stage on this child's calendar. */
export function schoolStageCalendarEnd(
  world: World,
  personId: EntityId,
  stage: SchoolStageKey,
): IsoDate {
  return onCalendar(
    kindergartenYear(world.people[personId]!.birthDate) +
      SCHOOL_STAGE_CALENDAR.endsAfterYears[stage],
    "ends",
  );
}

/**
 * Where the calendar puts the child today: not started yet, in a stage (the
 * summer before a stage counts as that stage), or past the end of high school.
 */
export function schoolStageToday(
  world: World,
  personId: EntityId,
): SchoolStageKey | "before" | "after" {
  if (
    world.currentDate < schoolStageCalendarStart(world, personId, "elementary")
  )
    return "before";
  return (
    (["elementary", "middle", "high"] as const).find(
      (stage) =>
        world.currentDate < schoolStageCalendarEnd(world, personId, stage),
    ) ?? "after"
  );
}

/** Schedules the first day of a stage a child is waiting to start. */
export function scheduleSchoolStageBegin(
  world: World,
  input: {
    readonly schoolKey: string;
    readonly personId: EntityId;
    readonly stage: SchoolStageKey;
    readonly jurisdictionId: EntityId | null;
    readonly dueAt: IsoDate;
    readonly provenance?: FutureDueItemProvenance;
  },
): World {
  return scheduleFutureDueItem(world, {
    stableKey: `${input.schoolKey}:stage:begins:${input.stage}`,
    dueAt: input.dueAt,
    transitionKey: SCHOOL_STAGE_TRANSITION_KEY,
    entityIds: [input.personId],
    jurisdictionId: input.jurisdictionId,
    provenance: input.provenance ?? {
      kind: "initialization",
      reference: input.schoolKey,
    },
  });
}

function schoolYearStartsAfter(date: IsoDate): IsoDate {
  let year = Number(date.slice(0, 4));
  let start = onCalendar(year, "starts");
  while (start <= date) {
    year += 1;
    start = onCalendar(year, "starts");
  }
  return start;
}

/**
 * Schedules the end of the stage a child is in now. The school for each later
 * stage is already in the world, under `${schoolKey}:${stage}`.
 */
export function scheduleSchoolStageEnd(
  world: World,
  input: {
    readonly schoolKey: string;
    readonly personId: EntityId;
    readonly stage: SchoolStageKey;
    readonly jurisdictionId: EntityId | null;
    readonly provenance?: FutureDueItemProvenance;
  },
): World {
  return scheduleFutureDueItem(world, {
    stableKey: `${input.schoolKey}:stage:ends:${input.stage}`,
    dueAt: schoolStageEndsAt(world, input.personId, input.stage),
    transitionKey: SCHOOL_STAGE_TRANSITION_KEY,
    entityIds: [input.personId],
    jurisdictionId: input.jurisdictionId,
    provenance: input.provenance ?? {
      kind: "initialization",
      reference: input.schoolKey,
    },
  });
}

/**
 * The one opener of a grade-school place: it enrolls a class (one pupil or
 * many who start together) at a school for a stage, and schedules what comes
 * next for the class under its key. An active place schedules the end of the
 * stage (`scheduleSchoolStageEnd`); a place waiting for the fall schedules
 * its first day (`scheduleSchoolStageBegin`). The stage handler, the legacy
 * catch-up and a pupil who moved (`school-moves.ts`) all open places here.
 */
export function enrollClassInStage(
  world: World,
  input: {
    /** What the class's due items are filed under. */
    readonly schoolKey: string;
    /** The pupil the due items name; the whole class moves with them. */
    readonly anchorPersonId: EntityId;
    readonly pupils: readonly {
      readonly stableKey: string;
      readonly personId: EntityId;
    }[];
    readonly organizationId: EntityId;
    readonly stage: SchoolStageKey;
    /** The stage's own program unless the school teaches all grades. */
    readonly programKind?: EducationEnrollment["programKind"];
    readonly startedAt: IsoDate;
    readonly status: "active" | "expected";
    readonly provenance: LifeRecordProvenance;
    readonly jurisdictionId: EntityId | null;
    readonly scheduleProvenance?: FutureDueItemProvenance;
  },
): World {
  let next = world;
  for (const pupil of input.pupils)
    next = createEducationEnrollment(next, {
      stableKey: pupil.stableKey,
      personId: pupil.personId,
      organizationId: input.organizationId,
      startedAt: input.startedAt,
      initialStatus: input.status,
      programKind: input.programKind ?? PROGRAM[input.stage],
      contextKind: CONTEXT[input.stage],
      provenance: input.provenance,
    });
  const schedule = {
    schoolKey: input.schoolKey,
    personId: input.anchorPersonId,
    stage: input.stage,
    jurisdictionId: input.jurisdictionId,
    ...(input.scheduleProvenance
      ? { provenance: input.scheduleProvenance }
      : {}),
  };
  return input.status === "active"
    ? scheduleSchoolStageEnd(next, schedule)
    : scheduleSchoolStageBegin(next, { ...schedule, dueAt: input.startedAt });
}

// Organizations by the place any of their profiles names, built once per
// profile list (append-only, so a new list means a new index).
const BY_PLACE = new WeakMap<
  World["history"]["organizationProfiles"],
  Map<EntityId, Set<EntityId>>
>();

function organizationsByPlace(world: World): Map<EntityId, Set<EntityId>> {
  const profiles = world.history.organizationProfiles;
  let index = BY_PLACE.get(profiles);
  if (!index) {
    index = new Map();
    for (const profile of profiles) {
      if (!profile.locationJurisdictionId) continue;
      let set = index.get(profile.locationJurisdictionId);
      if (!set) index.set(profile.locationJurisdictionId, (set = new Set()));
      set.add(profile.organizationId);
    }
    BY_PLACE.set(profiles, index);
  }
  return index;
}

/**
 * The school a place records for a stage: an open organization there whose
 * own pupils were enrolled in the stage's program, or else in a program for
 * all grades. A building nobody attended teaches no grade the World knows.
 * HARDWIRED: among several, the one with the most pupils attending, then the
 * lowest id. Null when the place records none.
 */
export function recordedSchoolFor(
  world: World,
  jurisdictionId: EntityId,
  stage: SchoolStageKey,
): {
  readonly id: EntityId;
  readonly programKind: EducationEnrollment["programKind"];
} | null {
  const choices: {
    id: EntityId;
    pupils: number;
    programKind: EducationEnrollment["programKind"];
  }[] = [];
  for (const id of organizationsByPlace(world).get(jurisdictionId) ?? []) {
    const profile = organizationProfileAt(world, id);
    if (
      !profile ||
      profile.closed ||
      profile.locationJurisdictionId !== jurisdictionId
    )
      continue;
    const rows = recordsByStringField(
      world.history.educationEnrollments,
      "organizationId",
      id,
    );
    for (const programKind of [PROGRAM[stage], "schooling:general"] as const) {
      const taught = rows.filter((row) => row.programKind === programKind);
      if (taught.length === 0) continue;
      choices.push({
        id,
        programKind,
        pupils: taught.filter(
          (row) =>
            educationEnrollmentStateAt(world, row.id)?.status === "active",
        ).length,
      });
      break;
    }
  }
  choices.sort((a, b) => b.pupils - a.pupils || a.id.localeCompare(b.id));
  const best = choices[0];
  return best ? { id: best.id, programKind: best.programKind } : null;
}

/** The person's schooling enrollment still open today, if any. */
function openSchooling(
  world: World,
  personId: EntityId,
  status: "active" | "expected",
): EducationEnrollment | undefined {
  return world.history.educationEnrollments.find(
    (enrollment) =>
      enrollment.personId === personId &&
      enrollment.programKind.startsWith("schooling:") &&
      educationEnrollmentStateAt(world, enrollment.id)?.status === status,
  );
}

export interface CurrentSchooling {
  readonly enrollment: EducationEnrollment;
  /** "expected" is a place waiting for the next school year. */
  readonly status: "active" | "expected";
  readonly schoolName: string | null;
  /** From the calendar on the day they attend it; null when it says none. */
  readonly grade: number | null;
}

/**
 * The school a child attends now or, over the summer, the one waiting for
 * them in the fall. Null for a life with no schooling enrollment open.
 */
export function currentSchooling(
  world: World,
  personId: EntityId,
): CurrentSchooling | null {
  const active = openSchooling(world, personId, "active");
  const enrollment = active ?? openSchooling(world, personId, "expected");
  if (!enrollment) return null;
  return {
    enrollment,
    status: active ? "active" : "expected",
    schoolName:
      organizationProfileAt(world, enrollment.organizationId)?.name ?? null,
    grade: schoolGradeOn(
      world,
      personId,
      active || enrollment.startedAt < world.currentDate
        ? world.currentDate
        : enrollment.startedAt,
    ),
  };
}

/**
 * The name of the school this person attends today, for a scene set there.
 *
 * Null outside term-time enrollment, and for the placeholder an old replay
 * gave a child who started in school ("Ely, Nevada public school"), which is
 * not what anybody calls a school and reads worse in a sentence than
 * "school" does.
 */
export function schoolNameToday(
  world: World,
  personId: EntityId,
): string | null {
  const schooling = currentSchooling(world, personId);
  if (schooling?.status !== "active" || !schooling.schoolName) return null;
  if (/ public school$/.test(schooling.schoolName)) return null;
  return schooling.schoolName;
}

/**
 * Whether this person is still a school-age pupil rather than somebody who
 * could apply to college: at a school or waiting on one, or under sixteen
 * without a high-school diploma.
 */
export function stillInGradeSchool(world: World, personId: EntityId): boolean {
  if (currentSchooling(world, personId)) return true;
  const person = world.people[personId];
  if (!person) return false;
  if (ageOnDate(person.birthDate, world.currentDate) >= 16) return false;
  return !finishedHighSchool(world, personId);
}

/** Whether this person's record holds a finished high school. */
export function finishedHighSchool(world: World, personId: EntityId): boolean {
  return world.history.educationEnrollments.some(
    (enrollment) =>
      enrollment.personId === personId &&
      enrollment.programKind === PROGRAM.high &&
      educationEnrollmentStateAt(world, enrollment.id)?.status === "completed",
  );
}

/**
 * Whether a pupil is in their last year of high school: from the day their
 * twelfth-grade year starts until they leave school.
 */
export function inFinalHighSchoolYear(
  world: World,
  personId: EntityId,
): boolean {
  return (
    stillInGradeSchool(world, personId) && schoolGradeOn(world, personId) === 12
  );
}

/**
 * The day a pupil's high school ends, or null for somebody no longer in
 * grade school. The end already scheduled for them is used where there is
 * one, so this agrees with the day they actually graduate.
 */
export function highSchoolEndsAt(
  world: World,
  personId: EntityId,
): IsoDate | null {
  if (!stillInGradeSchool(world, personId)) return null;
  const scheduled = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === SCHOOL_STAGE_TRANSITION_KEY &&
      item.entityIds[0] === personId &&
      item.stableKey.endsWith(":stage:ends:high") &&
      futureDueItemStateAt(world, item.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })?.status === "scheduled",
  );
  return scheduled?.dueAt ?? schoolStageEndsAt(world, personId, "high");
}

/** Everybody in the same class at the same school: started there together. */
function classOf(
  world: World,
  enrollment: EducationEnrollment,
  status: "active" | "expected",
) {
  return world.history.educationEnrollments.filter(
    (other) =>
      other.organizationId === enrollment.organizationId &&
      other.startedAt === enrollment.startedAt &&
      other.programKind.startsWith("schooling:") &&
      educationEnrollmentStateAt(world, other.id)?.status === status,
  );
}

function setState(
  world: World,
  enrollment: EducationEnrollment,
  status: "active" | "completed",
  stage: SchoolStageKey,
  effectiveAt: IsoDate,
  reason: string | null,
): World {
  const previous = educationEnrollmentStateAt(world, enrollment.id)!;
  return recordEducationEnrollmentState(world, {
    stableKey: `${enrollment.stableKey}:${status}`,
    enrollmentId: enrollment.id,
    effectiveAt,
    status,
    contextKind: CONTEXT[stage],
    reason,
    provenance: PROVENANCE,
    supersedesStateId: previous.id,
  });
}

function stageOf(dueItem: FutureDueItem): {
  readonly phase: "ends" | "begins";
  readonly stage: SchoolStageKey;
  /** The key the stage schools are filed under. */
  readonly schoolKey: string;
} {
  const match = /^(.*):stage:(ends|begins):(elementary|middle|high)$/.exec(
    dueItem.stableKey,
  );
  if (!match)
    throw new Error(`Not a school stage change: ${dueItem.stableKey}`);
  return {
    schoolKey: match[1]!,
    phase: match[2] as "ends" | "begins",
    stage: match[3] as SchoolStageKey,
  };
}

export function schoolStageTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== SCHOOL_STAGE_TRANSITION_KEY) {
    throw new Error("The school stage handler received another transition.");
  }
  const done = (
    next: World,
    context: string,
  ): FutureTransitionHandlerResult => ({
    world: next,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId: null,
  });
  const personId = dueItem.entityIds[0];
  const person = personId ? world.people[personId] : undefined;
  if (!person) return done(world, "Nobody is left to go to school.");
  const died = world.history.personDeaths.some(
    (death) => death.personId === personId && death.diedAt <= dueItem.dueAt,
  );
  if (died) return done(world, "They died before the school year ended.");
  const { schoolKey, phase, stage } = stageOf(dueItem);
  const today = makeIsoDate(dueItem.dueAt);

  if (phase === "begins") {
    const expected = openSchooling(world, personId!, "expected");
    if (!expected) return done(world, "No school place was waiting.");
    let next = world;
    for (const enrollment of classOf(world, expected, "expected"))
      next = setState(next, enrollment, "active", stage, today, null);
    next = scheduleFutureDueItem(next, {
      stableKey: `${schoolKey}:stage:ends:${stage}`,
      dueAt: schoolStageEndsAt(next, personId!, stage),
      transitionKey: SCHOOL_STAGE_TRANSITION_KEY,
      entityIds: [personId!],
      jurisdictionId: dueItem.jurisdictionId,
      provenance: { kind: "simulated", sourceEntityIds: [personId!] },
    });
    return done(next, `Started ${stage} school.`);
  }

  // The stage ends for the whole class, not only the player.
  const current = openSchooling(world, personId!, "active");
  if (!current) return done(world, "They had already left school.");
  const classmates = classOf(world, current, "active");
  let next = world;
  for (const enrollment of classmates)
    next = setState(
      next,
      enrollment,
      "completed",
      stage,
      today,
      FINISHED[stage],
    );
  const following = NEXT[stage];
  if (!following) return done(next, FINISHED[stage]);
  // The school the class was filed with for the next stage, or else the one
  // the place where they go to school records for it (a pupil who moved in).
  const keyed = world.history.organizations.find(
    (organization) => organization.stableKey === `${schoolKey}:${following}`,
  )?.id;
  const place = organizationProfileAt(
    world,
    current.organizationId,
  )?.locationJurisdictionId;
  const school = keyed
    ? { id: keyed, programKind: PROGRAM[following] }
    : place
      ? recordedSchoolFor(world, place, following)
      : null;
  if (!school) return done(next, FINISHED[stage]);
  next = enrollClassInStage(next, {
    schoolKey,
    anchorPersonId: personId!,
    pupils: classmates.map((enrollment) => ({
      stableKey: `${schoolKey}:${following}:${enrollment.personId}`,
      personId: enrollment.personId,
    })),
    organizationId: school.id,
    stage: following,
    programKind: school.programKind,
    startedAt: schoolYearStartsAfter(today),
    status: "expected",
    provenance: PROVENANCE,
    jurisdictionId: dueItem.jurisdictionId,
    scheduleProvenance: { kind: "simulated", sourceEntityIds: [personId!] },
  });
  return done(next, FINISHED[stage]);
}

const STAGES: readonly SchoolStageKey[] = ["elementary", "middle", "high"];

/**
 * The stage a child started a school in, read from their age that day: the
 * grade that age starts (age less five) on the one grade-to-stage rule.
 */
function stageAtAge(age: number): SchoolStageKey {
  return schoolStageForGrade(Math.max(0, age - 5));
}

function wholeYearsBetween(from: IsoDate, to: IsoDate): number {
  const years = Number(to.slice(0, 4)) - Number(from.slice(0, 4));
  return to.slice(5) < from.slice(5) ? years - 1 : years;
}

/**
 * The stage the school calendar puts this child in today, or null once the
 * last of them has ended.
 */
function stageOnCalendar(
  world: World,
  personId: EntityId,
): SchoolStageKey | null {
  // The school year whose last day is still ahead (the summer belongs to the
  // year after it), read as a grade, on the one grade-to-stage rule.
  let year = Number(world.currentDate.slice(0, 4)) - 1;
  while (onCalendar(year + 1, "ends") <= world.currentDate) year += 1;
  const grade = year - kindergartenYear(world.people[personId]!.birthDate);
  return grade > 12 ? null : schoolStageForGrade(Math.max(0, grade));
}

/**
 * A life saved before children moved on through school.
 *
 * Those saves hold one enrollment, at the school the new game wrote under
 * `${stableKey}:school`, and nothing after it, so a teenager (or a grown
 * adult) is still at the elementary school they started in. The first time
 * such a save moves forward, it is caught up to today from the same
 * calendar a new game uses:
 *
 * 1. A child still in the stage they started in stays at that school, and the
 *    end of the stage is scheduled as a new game would.
 * 2. A child the calendar has moved past it leaves that school today and
 *    starts the school for their stage today, with the rest of their class.
 *    Nothing is back-dated: the save never recorded the years between, so
 *    none are written.
 * 3. Somebody past the end of high school leaves school today.
 *
 * The later schools are named the way a new game names them, in the town the
 * child's school is in. A save that already has a stage change, or whose
 * schooling is not that shape, is left alone, so running this again changes
 * nothing.
 */
export function catchUpLegacySchoolStages(world: World): World {
  let next = world;
  for (const organization of world.history.organizations) {
    if (!organization.stableKey.endsWith(":school")) continue;
    const schoolKey = organization.stableKey;
    const lead = next.history.educationEnrollments.find(
      (enrollment) =>
        enrollment.stableKey ===
          `${schoolKey.slice(0, -":school".length)}:enrollment` &&
        enrollment.organizationId === organization.id &&
        enrollment.programKind === "schooling:general",
    );
    if (!lead) continue;
    if (educationEnrollmentStateAt(next, lead.id)?.status !== "active")
      continue;
    if (
      next.history.futureDueItems.some((item) =>
        item.stableKey.startsWith(`${schoolKey}:stage:`),
      )
    )
      continue;
    const person = next.people[lead.personId];
    if (!person) continue;
    if (next.history.personDeaths.some((death) => death.personId === person.id))
      continue;
    next = catchUpSchool(next, schoolKey, lead);
  }
  return next;
}

function catchUpSchool(
  world: World,
  schoolKey: string,
  lead: EducationEnrollment,
): World {
  const personId = lead.personId;
  const today = makeIsoDate(world.currentDate);
  const started = stageAtAge(
    wholeYearsBetween(world.people[personId]!.birthDate, lead.startedAt),
  );
  const due = stageOnCalendar(world, personId);
  const jurisdictionId =
    organizationProfileAt(world, lead.organizationId)?.locationJurisdictionId ??
    null;
  const classmates = classOf(world, lead, "active");

  if (due === null) {
    let next = world;
    for (const enrollment of classmates)
      next = recordEducationEnrollmentState(next, {
        stableKey: `${enrollment.stableKey}:ended`,
        enrollmentId: enrollment.id,
        effectiveAt: today,
        status: "ended",
        contextKind: CONTEXT[started],
        reason: "Left school.",
        provenance: PROVENANCE,
        supersedesStateId: educationEnrollmentStateAt(next, enrollment.id)!.id,
      });
    return next;
  }

  // Without the town the school is in there is nothing to name the next
  // school after, and no name is invented: the save is left as it was.
  const jurisdiction = jurisdictionId
    ? world.jurisdictions[jurisdictionId]
    : undefined;
  if (!jurisdiction) return world;
  const ahead = STAGES.slice(STAGES.indexOf(due));
  const names = stageSchoolNames(world, jurisdiction);
  let next = world;
  for (const stage of ahead) {
    if (stage === due && due === started) continue;
    const stableKey = `${schoolKey}:${stage}`;
    if (next.history.organizations.some((o) => o.stableKey === stableKey))
      continue;
    next = createOrganization(next, {
      stableKey,
      formedAt: today,
      provenance: PROVENANCE,
      initialProfile: {
        name: names[stage],
        classification: "sector:education",
        locationJurisdictionId: jurisdictionId,
      },
    });
  }

  if (due !== started) {
    const school = next.history.organizations.find(
      (organization) => organization.stableKey === `${schoolKey}:${due}`,
    )!.id;
    for (const enrollment of classmates) {
      next = recordEducationEnrollmentState(next, {
        stableKey: `${enrollment.stableKey}:transferred`,
        enrollmentId: enrollment.id,
        effectiveAt: today,
        status: "transferred",
        contextKind: CONTEXT[started],
        reason: `Moved on to ${due === "high" ? "high" : "middle"} school.`,
        provenance: PROVENANCE,
        supersedesStateId: educationEnrollmentStateAt(next, enrollment.id)!.id,
      });
    }
    return enrollClassInStage(next, {
      schoolKey,
      anchorPersonId: personId,
      pupils: classmates.map((enrollment) => ({
        stableKey: `${schoolKey}:${due}:${enrollment.personId}`,
        personId: enrollment.personId,
      })),
      organizationId: school,
      stage: due,
      startedAt: today,
      status: "active",
      provenance: PROVENANCE,
      jurisdictionId,
    });
  }
  return scheduleSchoolStageEnd(next, {
    schoolKey,
    personId,
    stage: due,
    jurisdictionId,
  });
}

/** The same draw a new game makes for a town's three schools. */
function stageSchoolNames(
  world: World,
  jurisdiction: Jurisdiction,
): Readonly<Record<SchoolStageKey, string>> {
  const state = jurisdiction.parentName
    ? (Object.entries(STATES).find(
        ([, reference]) => reference.name === jurisdiction.parentName,
      )?.[0] ?? null)
    : null;
  return generateSchoolNames(
    new SeededRng(world.seed).fork("production-world-v1:child-school"),
    residentNameForJurisdiction(jurisdiction.name, jurisdiction.parentName),
    SCHOOL_NAMES_V2_VERSION,
    { state },
  );
}
