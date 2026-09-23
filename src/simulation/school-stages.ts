import { addDays, ageOnDate, makeIsoDate } from "./dates";
import { scheduleFutureDueItem } from "./future-transitions";
import {
  createEducationEnrollment,
  createOrganization,
  recordEducationEnrollmentState,
} from "./life";
import { residentNameForJurisdiction } from "./life-places";
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
  FutureTransitionHandlerResult,
  IsoDate,
  Jurisdiction,
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
 * PLACEHOLDER, NOT RESEARCHED — the same calendar a summarized childhood uses
 * (`how-a-summarized-childhood-varies`): a child who is five by September 1
 * starts kindergarten that fall; middle school six years on, high school three
 * after that, graduation four after that; school years start between August
 * 15 and September 8 and end between May 20 and June 15.
 */
export const SCHOOL_STAGE_TRANSITION_KEY = "schooling:stage-change" as const;

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

export const SCHOOL_STAGE_CALENDAR = {
  schoolAgeCutoff: "09-01",
  termStarts: { month: 8, day: 15, spreadDays: 25 },
  termEnds: { month: 5, day: 20, spreadDays: 27 },
  /** Years after kindergarten begins that each stage ends. */
  endsAfterYears: { elementary: 6, middle: 9, high: 13 },
  /** Years after kindergarten begins that each stage starts. */
  startsAfterYears: { elementary: 0, middle: 6, high: 9 },
} as const;

export type SchoolStageKey = keyof typeof SCHOOL_STAGE_CALENDAR.endsAfterYears;

const PROGRAM: Record<SchoolStageKey, EducationEnrollment["programKind"]> = {
  elementary: "schooling:elementary",
  middle: "schooling:middle",
  high: "schooling:secondary",
};
const CONTEXT = {
  elementary: "stage:elementary",
  middle: "stage:school",
  high: "stage:secondary",
} as const;
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

/** The fall a child starts kindergarten. */
function kindergartenYear(birthDate: IsoDate): number {
  const year = Number(birthDate.slice(0, 4));
  return birthDate.slice(5) <= SCHOOL_STAGE_CALENDAR.schoolAgeCutoff
    ? year + 5
    : year + 6;
}

function onCalendar(
  world: World,
  personId: EntityId,
  year: number,
  range: {
    readonly month: number;
    readonly day: number;
    readonly spreadDays: number;
  },
  suffix: string,
): IsoDate {
  const spread = new SeededRng(world.seed)
    .fork(`schooling:stages:${personId}:${year}:${suffix}`)
    .integer(0, range.spreadDays + 1);
  return addDays(
    makeIsoDate(
      `${String(year).padStart(4, "0")}-${String(range.month).padStart(2, "0")}-${String(range.day).padStart(2, "0")}`,
    ),
    spread,
  );
}

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
  let date = onCalendar(
    world,
    personId,
    year,
    SCHOOL_STAGE_CALENDAR.termEnds,
    "ends",
  );
  while (date <= world.currentDate) {
    year += 1;
    date = onCalendar(
      world,
      personId,
      year,
      SCHOOL_STAGE_CALENDAR.termEnds,
      "ends",
    );
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
    world,
    personId,
    kindergartenYear(world.people[personId]!.birthDate) +
      SCHOOL_STAGE_CALENDAR.startsAfterYears[stage],
    SCHOOL_STAGE_CALENDAR.termStarts,
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
    world,
    personId,
    kindergartenYear(world.people[personId]!.birthDate) +
      SCHOOL_STAGE_CALENDAR.endsAfterYears[stage],
    SCHOOL_STAGE_CALENDAR.termEnds,
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
  },
): World {
  return scheduleFutureDueItem(world, {
    stableKey: `${input.schoolKey}:stage:begins:${input.stage}`,
    dueAt: input.dueAt,
    transitionKey: SCHOOL_STAGE_TRANSITION_KEY,
    entityIds: [input.personId],
    jurisdictionId: input.jurisdictionId,
    provenance: { kind: "initialization", reference: input.schoolKey },
  });
}

function schoolYearStartsAfter(
  world: World,
  personId: EntityId,
  date: IsoDate,
): IsoDate {
  let year = Number(date.slice(0, 4));
  let start = onCalendar(
    world,
    personId,
    year,
    SCHOOL_STAGE_CALENDAR.termStarts,
    "starts",
  );
  while (start <= date) {
    year += 1;
    start = onCalendar(
      world,
      personId,
      year,
      SCHOOL_STAGE_CALENDAR.termStarts,
      "starts",
    );
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
  },
): World {
  return scheduleFutureDueItem(world, {
    stableKey: `${input.schoolKey}:stage:ends:${input.stage}`,
    dueAt: schoolStageEndsAt(world, input.personId, input.stage),
    transitionKey: SCHOOL_STAGE_TRANSITION_KEY,
    entityIds: [input.personId],
    jurisdictionId: input.jurisdictionId,
    provenance: { kind: "initialization", reference: input.schoolKey },
  });
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

/**
 * The grade the school calendar puts a child in on a date: 0 for
 * kindergarten, then 1 through 12, or null before kindergarten or after
 * senior year.
 *
 * The same calendar that moves children through school: kindergarten in the
 * fall after they are five by September 1. The summer counts as the grade
 * just finished, until this child's next school year starts.
 */
export function schoolGradeOn(
  world: World,
  personId: EntityId,
  date: IsoDate = world.currentDate,
): number | null {
  const person = world.people[personId];
  if (!person) return null;
  const year = Number(date.slice(0, 4));
  const starts = onCalendar(
    world,
    personId,
    year,
    SCHOOL_STAGE_CALENDAR.termStarts,
    "starts",
  );
  const schoolYear = date >= starts ? year : year - 1;
  const grade = schoolYear - kindergartenYear(person.birthDate);
  return grade >= 0 && grade <= 12 ? grade : null;
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
 * Whether this person is still a school-age pupil rather than somebody who
 * could apply to college: at a school or waiting on one, or under sixteen
 * without a high-school diploma.
 */
export function stillInGradeSchool(world: World, personId: EntityId): boolean {
  if (currentSchooling(world, personId)) return true;
  const person = world.people[personId];
  if (!person) return false;
  if (ageOnDate(person.birthDate, world.currentDate) >= 16) return false;
  return !world.history.educationEnrollments.some(
    (enrollment) =>
      enrollment.personId === personId &&
      enrollment.programKind === PROGRAM.high &&
      educationEnrollmentStateAt(world, enrollment.id)?.status === "completed",
  );
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
  const school = following
    ? world.history.organizations.find(
        (organization) =>
          organization.stableKey === `${schoolKey}:${following}`,
      )?.id
    : undefined;
  if (!following || !school) return done(next, FINISHED[stage]);
  const startsAt = schoolYearStartsAfter(next, personId!, today);
  for (const enrollment of classmates) {
    next = createEducationEnrollment(next, {
      stableKey: `${schoolKey}:${following}:${enrollment.personId}`,
      personId: enrollment.personId,
      organizationId: school,
      startedAt: startsAt,
      initialStatus: "expected",
      programKind: PROGRAM[following],
      contextKind: CONTEXT[following],
      provenance: PROVENANCE,
    });
  }
  next = scheduleFutureDueItem(next, {
    stableKey: `${schoolKey}:stage:begins:${following}`,
    dueAt: startsAt,
    transitionKey: SCHOOL_STAGE_TRANSITION_KEY,
    entityIds: [personId!],
    jurisdictionId: dueItem.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [personId!] },
  });
  return done(next, FINISHED[stage]);
}

const STAGES: readonly SchoolStageKey[] = ["elementary", "middle", "high"];

/** The stage a child started a school in, read from their age that day. */
function stageAtAge(age: number): SchoolStageKey {
  return age < 11 ? "elementary" : age < 14 ? "middle" : "high";
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
  const start = kindergartenYear(world.people[personId]!.birthDate);
  return (
    STAGES.find(
      (stage) =>
        world.currentDate <
        onCalendar(
          world,
          personId,
          start + SCHOOL_STAGE_CALENDAR.endsAfterYears[stage],
          SCHOOL_STAGE_CALENDAR.termEnds,
          "ends",
        ),
    ) ?? null
  );
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
      next = createEducationEnrollment(next, {
        stableKey: `${schoolKey}:${due}:${enrollment.personId}`,
        personId: enrollment.personId,
        organizationId: school,
        startedAt: today,
        programKind: PROGRAM[due],
        contextKind: CONTEXT[due],
        provenance: PROVENANCE,
      });
    }
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
