/**
 * WORKING DAYS AND HOURS: the shapes a job's week takes. Moved from the old
 * engine's work-schedules so the opening reads them without the old world
 * type. A schedule is not stored. It is worked out from the job's own facts
 * (its employer, title, kind of work and weekly hours) and the employer's
 * roster, so the same job always has the same hours on the same day. Staff
 * who share a rotating pattern at one employer take turns, so a hospital or
 * a diner is staffed through the week rather than every nurse working Monday.
 *
 * Every pattern is a GAME ASSUMPTION, not a source; holidays and vacations
 * are not modeled.
 */

import { daysBetween, makeIsoDate } from "./kernel/dates";
import type { EntityId, IsoDate } from "./kernel/brands";
import {
  WORK_PATTERNS,
  type WorkPatternKey,
  type WorkShift,
  type Weekday,
} from "./work-patterns";

/** What a job's schedule is worked out from. */
export interface ScheduleJob {
  readonly id: EntityId;
  readonly organizationId: EntityId | null;
  /** The kind of work, e.g. "employment:education". */
  readonly kind: string;
  readonly title: string;
  /** The town workplace the employer was written from, when it was. */
  readonly workplaceKey: string | null;
  readonly minimumHours: number;
  readonly maximumHours: number;
}

/** Staff at one employer on one pattern share a roster, in hiring order. */
export function rosterKeyOf(job: ScheduleJob, pattern: WorkPatternKey): string {
  return `${job.organizationId ?? job.id}|${pattern}`;
}

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
  "county-clerk": "public-office",
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
  "county-clerk": "clerk-counter",
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

export const EPOCH = makeIsoDate("2000-01-02"); // a Sunday

function weekdayOf(date: IsoDate): Weekday {
  return new Date(`${date}T12:00:00Z`).getUTCDay() as Weekday;
}

function weekIndex(date: IsoDate): number {
  return Math.floor(daysBetween(EPOCH, date) / 7);
}

/** Which pattern and place a job has, from its employer and title. */
export function jobShape(job: ScheduleJob): {
  pattern: WorkPatternKey;
  place: string;
} {
  const title = job.title;
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
function fallbackPattern(job: ScheduleJob): WorkPatternKey {
  const kind = job.kind;
  if (/education/.test(kind)) return "school";
  if (/food/.test(kind)) return "diner";
  if (/retail/.test(kind)) return "store";
  if (/religious/.test(kind)) return "clergy";
  return "office";
}

/** A job the town did not write: its place from its kind of work. */
function fallbackPlace(job: ScheduleJob): string {
  const kind = job.kind;
  if (/education/.test(kind)) return "classroom";
  if (/health/.test(kind)) return "hospital-hallway";
  if (/food/.test(kind)) return "diner";
  if (/retail/.test(kind)) return "store";
  if (/religious/.test(kind)) return "church-supper-hall";
  if (/labor-union/.test(kind)) return "union-hall";
  return "office";
}

export function scheduleOf(
  job: ScheduleJob,
  shape: { pattern: WorkPatternKey; place: string },
  rosters: ReadonlyMap<string, readonly EntityId[]>,
): WorkSchedule {
  const pattern = WORK_PATTERNS[shape.pattern];
  const roster = rosters.get(rosterKeyOf(job, shape.pattern)) ?? [job.id];
  const slot = Math.max(0, roster.indexOf(job.id));
  const { minimumHours, maximumHours } = job;
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
      workRelationshipId: job.id,
      pattern: shape.pattern,
      partTime,
      shift,
      weeklyHours: (shiftHours * 7) / cycle,
      place: shape.place,
      organizationId: job.organizationId,
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
      workRelationshipId: job.id,
      pattern: shape.pattern,
      partTime,
      shift,
      weeklyHours: worked.size * shiftHours,
      place: shape.place,
      organizationId: job.organizationId,
      worksOn: (date) => worked.has(weekdayOf(date)),
    };
  }

  // Rotating: staff at one employer on one shift start on staggered days,
  // and the block moves one day each week, so each day of the week is
  // covered and nobody always has the weekend.
  const shiftCount = pattern.shifts.length;
  const lane = Math.floor(slot / shiftCount);
  // Each employer's rotation starts on its own day, so two small employers
  // do not leave the same night uncovered.
  const start = (lane * days + employerOffset(job)) % 7;
  return {
    workRelationshipId: job.id,
    pattern: shape.pattern,
    partTime,
    shift,
    weeklyHours: days * shiftHours,
    place: shape.place,
    organizationId: job.organizationId,
    worksOn: (date) => {
      const day = (weekdayOf(date) - start - weekIndex(date) + 7 * 1000) % 7;
      return day < days;
    },
  };
}

/** A fixed day of the week, 0 to 6, for an employer's rotation. */
function employerOffset(job: ScheduleJob): number {
  const key = job.organizationId ?? job.id;
  let hash = 0;
  for (let n = 0; n < key.length; n += 1)
    hash = (hash * 31 + key.charCodeAt(n)) % 7;
  return hash;
}
