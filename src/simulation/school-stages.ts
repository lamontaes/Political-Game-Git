import { addDays, makeIsoDate } from "./dates";
import { scheduleFutureDueItem } from "./future-transitions";
import {
  createEducationEnrollment,
  recordEducationEnrollmentState,
} from "./life";
import { educationEnrollmentStateAt } from "./life-queries";
import { SeededRng } from "./rng";
import type {
  EducationEnrollment,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
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

export const SCHOOL_STAGE_CALENDAR = {
  schoolAgeCutoff: "09-01",
  termStarts: { month: 8, day: 15, spreadDays: 25 },
  termEnds: { month: 5, day: 20, spreadDays: 27 },
  /** Years after kindergarten begins that each stage ends. */
  endsAfterYears: { elementary: 6, middle: 9, high: 13 },
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
