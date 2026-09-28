/**
 * WORKING DAYS AND HOURS, AND WHERE PEOPLE ARE.
 *
 * Every job has working days and hours, read from its occupation and its
 * employer: office hours for clerks and city staff, 12-hour day and night
 * shifts for hospital staff and dispatchers, rotating 10-hour shifts for
 * police, 24 hours on and 48 off for firefighters, morning or evening shifts
 * for diner and store staff, and shorter or fewer shifts for part-time jobs
 * (recorded on the job's weekly hours at hire, `town-employment.ts`).
 *
 * A schedule is not stored. It is worked out from the job's records (its
 * employer, title, occupation and weekly hours) and the employer's roster,
 * so the same job always has the same hours on the same day. Staff who share
 * a rotating pattern at one employer take turns, so a hospital or a diner is
 * staffed through the week rather than every nurse working Monday.
 *
 * Where somebody is at a moment is a query too: at a recorded activity when
 * one is under way, at work when on shift, and otherwise at home.
 *
 * Every pattern here is a GAME ASSUMPTION, not a source. The weekly totals
 * follow the job's own recorded hours; the research in
 * docs/research/chatgpt-answers/2026-09-23-jobs-and-units-0311/ supports
 * weekly totals and full- or part-time status, not an employer's shift
 * times. Holidays and vacations are not modeled.
 */

import { daysBetween, makeIsoDate } from "../dates";
import { currentLifeCutoff, organizationProfileAt } from "../life-queries";
import { scheduledActivityState } from "../time-work";
import type {
  EntityId,
  IsoDate,
  SimulationMoment,
  WorkRelationship,
  WorkRoleRecord,
  World,
} from "../types";
import { townWorkplaceFor } from "./town-employment";

export const WORK_SCHEDULES_VERSION = "work-schedules-v1";

/** Sunday is 0, as in JavaScript dates. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WorkPatternKey =
  | "office"
  | "public-office"
  | "school"
  | "clergy"
  | "day-trade"
  | "farm"
  | "driver"
  | "factory"
  | "store"
  | "diner"
  | "hospital"
  | "police"
  | "fire"
  | "organizer";

/** One shift: its start and length in minutes, local time. */
export interface WorkShift {
  readonly startMinute: number;
  readonly minutes: number;
}

interface WorkPattern {
  /** The shifts a job of this pattern can be given; staff take turns. */
  readonly shifts: readonly WorkShift[];
  /**
   * "week": the same weekdays every week, `days` of them.
   * "rotating": `days` a week, staff staggered so every day is covered.
   * "cycle": one shift every `cycleDays` days (firefighters).
   */
  readonly kind: "week" | "rotating" | "cycle";
  /** The weekdays worked for a "week" pattern, full-time. */
  readonly weekdays?: readonly Weekday[];
  readonly cycleDays?: number;
}

const hours = (from: number, length: number): WorkShift => ({
  startMinute: Math.round(from * 60),
  minutes: Math.round(length * 60),
});

const MON_FRI: readonly Weekday[] = [1, 2, 3, 4, 5];

/** GAME ASSUMPTION: the shape of each kind of working week. */
export const WORK_PATTERNS: Readonly<Record<WorkPatternKey, WorkPattern>> = {
  office: {
    kind: "week",
    weekdays: MON_FRI,
    shifts: [hours(8, 9), hours(9, 8)],
  },
  "public-office": { kind: "week", weekdays: MON_FRI, shifts: [hours(8, 8.5)] },
  school: { kind: "week", weekdays: MON_FRI, shifts: [hours(7.5, 8)] },
  // Sunday services, then the weekday office; Monday off.
  clergy: {
    kind: "week",
    weekdays: [0, 2, 3, 4, 5],
    shifts: [hours(8, 8)],
  },
  "day-trade": { kind: "week", weekdays: MON_FRI, shifts: [hours(7, 8.5)] },
  farm: {
    kind: "week",
    weekdays: [1, 2, 3, 4, 5, 6],
    shifts: [hours(6, 8)],
  },
  driver: { kind: "week", weekdays: MON_FRI, shifts: [hours(6, 9)] },
  factory: {
    kind: "week",
    weekdays: MON_FRI,
    shifts: [hours(7, 8.5), hours(15, 8.5), hours(23, 8.5)],
  },
  store: { kind: "rotating", shifts: [hours(8, 8), hours(13, 8.5)] },
  diner: { kind: "rotating", shifts: [hours(6, 8), hours(14, 8)] },
  hospital: { kind: "rotating", shifts: [hours(7, 12), hours(19, 12)] },
  police: {
    kind: "rotating",
    shifts: [hours(6, 10), hours(14, 10), hours(22, 10)],
  },
  fire: { kind: "cycle", cycleDays: 3, shifts: [hours(8, 24)] },
  organizer: {
    kind: "week",
    weekdays: [1, 2, 3, 4, 5, 6],
    shifts: [hours(10, 8)],
  },
};

/** GAME ASSUMPTION: which pattern each town workplace works by. */
export const WORKPLACE_PATTERN: Readonly<Record<string, WorkPatternKey>> = {
  farm: "farm",
  quarry: "day-trade",
  utility: "day-trade",
  construction: "day-trade",
  manufacturing: "factory",
  wholesale: "factory",
  retail: "store",
  trucking: "driver",
  information: "office",
  bank: "office",
  insurance: "office",
  realty: "office",
  professional: "office",
  "regional-office": "office",
  "building-services": "day-trade",
  "private-school": "school",
  hospital: "hospital",
  clinic: "office",
  "care-home": "hospital",
  recreation: "store",
  restaurant: "diner",
  inn: "store",
  repair: "day-trade",
  "personal-care": "store",
  congregation: "clergy",
  organizing: "organizer",
  union: "office",
  "party-office": "office",
  "campaign-staff": "organizer",
  "public-school": "school",
  "city-hall": "public-office",
  police: "police",
  fire: "fire",
  "public-works": "day-trade",
  "public-health": "public-office",
  "state-office": "public-office",
  "post-office": "driver",
};

/** GAME ASSUMPTION: titles that work differently from their workplace. */
const TITLE_PATTERN: readonly (readonly [RegExp, WorkPatternKey])[] = [
  [/dispatcher/i, "hospital"],
  [/physician/i, "office"],
  [/medical records/i, "office"],
  [/postal clerk/i, "public-office"],
  [/manager|supervisor|principal/i, "office"],
  [/church office/i, "office"],
  [/receptionist/i, "office"],
  [/customer service/i, "office"],
  [/sales representative/i, "office"],
  [/janitor/i, "factory"],
];

/**
 * GAME ASSUMPTION: the place picture each town workplace is. A title can be
 * at a different place in the same building: the city clerk stands at the
 * clerk counter, not outside city hall.
 */
export const WORKPLACE_PLACE: Readonly<Record<string, string>> = {
  farm: "rural-farmhouse",
  quarry: "construction-site",
  utility: "office",
  construction: "construction-site",
  manufacturing: "factory-floor",
  wholesale: "factory-floor",
  retail: "store",
  trucking: "main-street",
  information: "office",
  bank: "office",
  insurance: "office",
  realty: "office",
  professional: "office",
  "regional-office": "office",
  "building-services": "office",
  "private-school": "classroom",
  hospital: "hospital-hallway",
  clinic: "hospital-hallway",
  "care-home": "hospital-hallway",
  recreation: "park",
  restaurant: "diner",
  inn: "main-street",
  repair: "main-street",
  "personal-care": "main-street",
  congregation: "church-supper-hall",
  organizing: "community-room",
  union: "union-hall",
  "party-office": "county-party-office",
  "campaign-staff": "campaign-storefront",
  "public-school": "classroom",
  "city-hall": "city-hall-exterior",
  police: "main-street",
  fire: "main-street",
  "public-works": "main-street",
  "public-health": "office",
  "state-office": "office",
  "post-office": "main-street",
};

const TITLE_PLACE: readonly (readonly [RegExp, string])[] = [
  [/city clerk|office assistant|postal clerk/i, "clerk-counter"],
  [/city planner|budget analyst/i, "office"],
  [/line worker/i, "main-street"],
  [/dispatcher/i, "office"],
];

/** A job's working week. */
export interface WorkSchedule {
  readonly workRelationshipId: EntityId;
  readonly pattern: WorkPatternKey;
  readonly partTime: boolean;
  readonly shift: WorkShift;
  /** Scheduled hours in an ordinary week (a cycle's weekly average). */
  readonly weeklyHours: number;
  /** The place picture the job is done at. */
  readonly place: string;
  readonly organizationId: EntityId | null;
  /** Whether a shift starts on `date`. */
  readonly worksOn: (date: IsoDate) => boolean;
}

const EPOCH = makeIsoDate("2000-01-02"); // a Sunday

function weekdayOf(date: IsoDate): Weekday {
  return new Date(`${date}T12:00:00Z`).getUTCDay() as Weekday;
}

function weekIndex(date: IsoDate): number {
  return Math.floor(daysBetween(EPOCH, date) / 7);
}

interface JobFacts {
  readonly relationship: WorkRelationship;
  readonly role: WorkRoleRecord;
  readonly workplaceKey: string | null;
}

/** Which pattern and place a job has, from its employer and title. */
function jobShape(job: JobFacts): { pattern: WorkPatternKey; place: string } {
  const title = job.role.title;
  const byTitle = TITLE_PATTERN.find(([test]) => test.test(title))?.[1];
  const byPlace = TITLE_PLACE.find(([test]) => test.test(title))?.[1];
  const key = job.workplaceKey;
  const pattern =
    byTitle ??
    (key ? WORKPLACE_PATTERN[key] : undefined) ??
    fallbackPattern(job);
  const place =
    byPlace ?? (key ? WORKPLACE_PLACE[key] : undefined) ?? fallbackPlace(job);
  return { pattern, place };
}

/** A job the town did not write: its pattern from its kind of work. */
function fallbackPattern(job: JobFacts): WorkPatternKey {
  const kind = job.relationship.kind;
  if (/education/.test(kind)) return "school";
  if (/food/.test(kind)) return "diner";
  if (/retail/.test(kind)) return "store";
  if (/religious/.test(kind)) return "clergy";
  return "office";
}

/** A job the town did not write: its place from its kind of work. */
function fallbackPlace(job: JobFacts): string {
  const kind = job.relationship.kind;
  if (/education/.test(kind)) return "classroom";
  if (/health/.test(kind)) return "hospital-hallway";
  if (/food/.test(kind)) return "diner";
  if (/retail/.test(kind)) return "store";
  if (/religious/.test(kind)) return "church-supper-hall";
  if (/labor-union/.test(kind)) return "union-hall";
  return "office";
}

/* -------------------------------------------------------------------------- */
/* The world's active jobs, gathered once per world.                          */
/* -------------------------------------------------------------------------- */

interface JobIndex {
  readonly date: IsoDate;
  readonly byPerson: ReadonlyMap<EntityId, readonly JobFacts[]>;
  readonly byId: ReadonlyMap<EntityId, JobFacts>;
  /** Staff by employer and pattern, in hiring order, for rotations. */
  readonly rosters: ReadonlyMap<string, readonly EntityId[]>;
  readonly shapes: ReadonlyMap<
    EntityId,
    { pattern: WorkPatternKey; place: string }
  >;
}

const INDEXES = new WeakMap<World["history"], Map<IsoDate, JobIndex>>();

function jobIndex(world: World, date: IsoDate): JobIndex {
  const cached = INDEXES.get(world.history)?.get(date);
  if (cached) return cached;
  const cutoff = { ...currentLifeCutoff(world), asOfDate: date };
  const latestStatus = new Map<
    EntityId,
    { at: IsoDate; seq: number; status: string }
  >();
  for (const record of world.history.workStatuses) {
    if (record.effectiveAt > date) continue;
    if (record.sequence >= cutoff.historySequenceExclusive) continue;
    const prior = latestStatus.get(record.workRelationshipId);
    if (
      !prior ||
      record.effectiveAt > prior.at ||
      (record.effectiveAt === prior.at && record.sequence > prior.seq)
    )
      latestStatus.set(record.workRelationshipId, {
        at: record.effectiveAt,
        seq: record.sequence,
        status: record.status,
      });
  }
  const latestRole = new Map<EntityId, WorkRoleRecord>();
  for (const record of world.history.workRoles) {
    if (record.effectiveAt > date) continue;
    const prior = latestRole.get(record.workRelationshipId);
    if (
      !prior ||
      record.effectiveAt > prior.effectiveAt ||
      (record.effectiveAt === prior.effectiveAt &&
        record.sequence > prior.sequence)
    )
      latestRole.set(record.workRelationshipId, record);
  }
  const organizationKeys = new Map(
    world.history.organizations.map((row) => [row.id, row.stableKey]),
  );
  const byPerson = new Map<EntityId, JobFacts[]>();
  const byId = new Map<EntityId, JobFacts>();
  const rosters = new Map<string, EntityId[]>();
  const shapes = new Map<
    EntityId,
    { pattern: WorkPatternKey; place: string }
  >();
  for (const relationship of world.history.workRelationships) {
    if (relationship.startedAt > date) continue;
    if (latestStatus.get(relationship.id)?.status !== "active") continue;
    const role = latestRole.get(relationship.id);
    if (!role) continue;
    const organizationKey = relationship.organizationId
      ? (organizationKeys.get(relationship.organizationId) ?? "")
      : "";
    const classification = relationship.organizationId
      ? (organizationProfileAt(world, relationship.organizationId)
          ?.classification ?? null)
      : null;
    const workplace = organizationKey
      ? townWorkplaceFor(organizationKey, classification)
      : null;
    const job: JobFacts = {
      relationship,
      role,
      workplaceKey: workplace?.key ?? null,
    };
    const list = byPerson.get(relationship.personId) ?? [];
    list.push(job);
    byPerson.set(relationship.personId, list);
    byId.set(relationship.id, job);
    const shape = jobShape(job);
    shapes.set(relationship.id, shape);
    const rosterKey = `${relationship.organizationId ?? relationship.id}|${shape.pattern}`;
    const roster = rosters.get(rosterKey) ?? [];
    roster.push(relationship.id);
    rosters.set(rosterKey, roster);
  }
  const index: JobIndex = { date, byPerson, byId, rosters, shapes };
  const perWorld = INDEXES.get(world.history) ?? new Map<IsoDate, JobIndex>();
  // A world is read on one or two dates at a time; keep the cache small.
  if (perWorld.size > 8) perWorld.clear();
  perWorld.set(date, index);
  INDEXES.set(world.history, perWorld);
  return index;
}

/* -------------------------------------------------------------------------- */
/* Schedules                                                                  */
/* -------------------------------------------------------------------------- */

function scheduleOf(index: JobIndex, job: JobFacts): WorkSchedule {
  const shape = index.shapes.get(job.relationship.id)!;
  const pattern = WORK_PATTERNS[shape.pattern];
  const roster = index.rosters.get(
    `${job.relationship.organizationId ?? job.relationship.id}|${shape.pattern}`,
  ) ?? [job.relationship.id];
  const slot = Math.max(0, roster.indexOf(job.relationship.id));
  const { minimumHours, maximumHours } = job.role.timeDemand.expectedWeekly;
  const target = (minimumHours + maximumHours) / 2;
  const partTime = maximumHours < 35;
  const base = pattern.shifts[slot % pattern.shifts.length]!;
  // Part-time staff work shorter shifts: about five and a half hours.
  const shift: WorkShift =
    partTime && base.minutes > 6 * 60
      ? { startMinute: base.startMinute, minutes: 330 }
      : base;
  const shiftHours = shift.minutes / 60;

  if (pattern.kind === "cycle") {
    const cycle = pattern.cycleDays!;
    const offset = slot % cycle;
    return {
      workRelationshipId: job.relationship.id,
      pattern: shape.pattern,
      partTime,
      shift,
      weeklyHours: (shiftHours * 7) / cycle,
      place: shape.place,
      organizationId: job.relationship.organizationId,
      worksOn: (date) =>
        (((daysBetween(EPOCH, date) - offset) % cycle) + cycle) % cycle === 0,
    };
  }

  const days = Math.max(1, Math.min(7, Math.round(target / shiftHours)));
  if (pattern.kind === "week") {
    const weekdays = pattern.weekdays!;
    // Full-time staff work every day of the pattern; part-time staff fewer.
    const worked = new Set(
      partTime ? weekdays.slice(0, Math.min(days, weekdays.length)) : weekdays,
    );
    return {
      workRelationshipId: job.relationship.id,
      pattern: shape.pattern,
      partTime,
      shift,
      weeklyHours: worked.size * shiftHours,
      place: shape.place,
      organizationId: job.relationship.organizationId,
      worksOn: (date) => worked.has(weekdayOf(date)),
    };
  }

  // Rotating: staff at one employer on one shift start on staggered days,
  // and the block moves one day each week, so each day of the week is
  // covered and nobody always has the weekend.
  const shiftCount = pattern.shifts.length;
  const lane = Math.floor(slot / shiftCount);
  const start = (lane * days) % 7;
  return {
    workRelationshipId: job.relationship.id,
    pattern: shape.pattern,
    partTime,
    shift,
    weeklyHours: days * shiftHours,
    place: shape.place,
    organizationId: job.relationship.organizationId,
    worksOn: (date) => {
      const day = (weekdayOf(date) - start - weekIndex(date) + 7 * 1000) % 7;
      return day < days;
    },
  };
}

/** A person's working weeks, one per active job, as of `date`. */
export function workSchedulesFor(
  world: World,
  personId: EntityId,
  date: IsoDate = world.currentDate,
): readonly WorkSchedule[] {
  const index = jobIndex(world, date);
  return (index.byPerson.get(personId) ?? []).map((job) =>
    scheduleOf(index, job),
  );
}

/** The day before a date, for shifts that run past midnight. */
function previousDate(date: IsoDate): IsoDate {
  const at = new Date(`${date}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() - 1);
  return makeIsoDate(at.toISOString().slice(0, 10));
}

/** Whether a schedule has its person at work at a local moment. */
export function onShiftAt(
  schedule: WorkSchedule,
  moment: SimulationMoment,
): boolean {
  const { startMinute, minutes } = schedule.shift;
  const today = moment.date;
  if (
    schedule.worksOn(today) &&
    moment.minuteOfDay >= startMinute &&
    moment.minuteOfDay < startMinute + minutes
  )
    return true;
  // A shift that began yesterday and runs past midnight.
  const overflow = startMinute + minutes - 24 * 60;
  return (
    overflow > 0 &&
    moment.minuteOfDay < overflow &&
    schedule.worksOn(previousDate(today))
  );
}

/* -------------------------------------------------------------------------- */
/* Where people are                                                           */
/* -------------------------------------------------------------------------- */

export type PersonWhereabouts =
  | {
      readonly kind: "activity";
      readonly activityId: EntityId;
      readonly title: string;
    }
  | {
      readonly kind: "work";
      readonly workRelationshipId: EntityId;
      readonly organizationId: EntityId | null;
      readonly title: string;
      readonly place: string;
    }
  | { readonly kind: "home" };

function minuteOf(moment: SimulationMoment): number {
  return daysBetween(EPOCH, moment.date) * 1440 + moment.minuteOfDay;
}

/** Everyone at a recorded activity under way at a moment. */
function activitiesUnderWay(
  world: World,
  moment: SimulationMoment,
): ReadonlyMap<EntityId, { activityId: EntityId; title: string }> {
  const now = minuteOf(moment);
  const found = new Map<EntityId, { activityId: EntityId; title: string }>();
  for (const activity of world.history.scheduledActivities) {
    const state = scheduledActivityState(world, activity.id);
    if (state.status === "cancelled") continue;
    if (minuteOf(state.start) > now || now >= minuteOf(state.end)) continue;
    for (const personId of activity.participantPersonIds)
      if (!found.has(personId))
        found.set(personId, { activityId: activity.id, title: activity.title });
  }
  return found;
}

/** Where a person is at a moment: a recorded activity, work, or home. */
export function whereaboutsAt(
  world: World,
  personId: EntityId,
  moment: SimulationMoment = world.currentMoment,
  underWay = activitiesUnderWay(world, moment),
): PersonWhereabouts {
  const activity = underWay.get(personId);
  if (activity) return { kind: "activity", ...activity };
  const index = jobIndex(world, moment.date);
  for (const job of index.byPerson.get(personId) ?? []) {
    const schedule = scheduleOf(index, job);
    if (onShiftAt(schedule, moment))
      return {
        kind: "work",
        workRelationshipId: job.relationship.id,
        organizationId: job.relationship.organizationId,
        title: job.role.title,
        place: schedule.place,
      };
  }
  return { kind: "home" };
}

/** A person at work at a place picture, and the job they are there for. */
export interface PersonAtWork {
  readonly personId: EntityId;
  readonly workRelationshipId: EntityId;
  readonly organizationId: EntityId | null;
  readonly title: string;
}

/**
 * The people on shift at a place picture at a moment, in one town. A person
 * at a recorded activity instead is not counted.
 */
export function peopleAtWorkAt(
  world: World,
  town: EntityId,
  place: string,
  moment: SimulationMoment = world.currentMoment,
): readonly PersonAtWork[] {
  const index = jobIndex(world, moment.date);
  const underWay = activitiesUnderWay(world, moment);
  const found: PersonAtWork[] = [];
  for (const job of index.byId.values()) {
    if (job.role.locationJurisdictionId !== town) continue;
    if (index.shapes.get(job.relationship.id)?.place !== place) continue;
    if (!onShiftAt(scheduleOf(index, job), moment)) continue;
    const where = whereaboutsAt(
      world,
      job.relationship.personId,
      moment,
      underWay,
    );
    if (
      where.kind !== "work" ||
      where.workRelationshipId !== job.relationship.id
    )
      continue;
    found.push({
      personId: job.relationship.personId,
      workRelationshipId: job.relationship.id,
      organizationId: job.relationship.organizationId,
      title: job.role.title,
    });
  }
  return found;
}
