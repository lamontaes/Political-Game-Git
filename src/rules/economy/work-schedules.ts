/** Full retained working-week, raw roster-index, shift and activity/absence priority math. No World writer or scheduler. */
import { daysBetween, makeIsoDate } from "../../simulation/dates";
import type {
  EntityId,
  IsoDate,
  SimulationMoment,
  WorkRelationship,
  WorkRoleRecord,
  World,
  ScheduledActivityStateRecord,
} from "../../simulation/types";
import type { organizationProfileAt as nativeProfile } from "../../simulation/life-queries";
import type { workAbsenceAt as nativeAbsence } from "../../simulation/living-world/work-absence";
export interface WorkScheduleFacts {
  readonly onDate: IsoDate;
  readonly onMoment: SimulationMoment;
  readonly records: Pick<
    World["history"],
    | "nextSequence"
    | "workStatuses"
    | "workRoles"
    | "organizations"
    | "workRelationships"
    | "scheduledActivities"
  >;
  readonly profiles: ReadonlyMap<EntityId, ReturnType<typeof nativeProfile>>;
  readonly activityStates: ReadonlyMap<EntityId, ScheduledActivityStateRecord>;
  readonly absences: ReadonlyMap<string, ReturnType<typeof nativeAbsence>>;
  readonly workplaces: readonly {
    readonly key: string;
    readonly existing?: string;
  }[];
}
export function workMomentKey(id: EntityId, moment: SimulationMoment) {
  return JSON.stringify([id, moment]);
}
function organizationProfileAt(facts: WorkScheduleFacts, id: EntityId) {
  if (!facts.profiles.has(id))
    throw Error("Missing source profile receipt: " + id);
  return facts.profiles.get(id) ?? null;
}
function scheduledActivityState(facts: WorkScheduleFacts, id: EntityId) {
  const state = facts.activityStates.get(id);
  if (!state) throw Error("Missing scheduled activity state: " + id);
  return state;
}
function workAbsenceAt(
  facts: WorkScheduleFacts,
  id: EntityId,
  moment: SimulationMoment,
) {
  const key = workMomentKey(id, moment);
  if (!facts.absences.has(key))
    throw Error("Missing source absence receipt: " + key);
  return facts.absences.get(key) ?? null;
}
function townWorkplaceFor(
  facts: WorkScheduleFacts,
  organizationStableKey: string,
  classification: string | null,
) {
  const employer = /:employer:([a-z-]+):\d+$/.exec(organizationStableKey);
  if (employer)
    return facts.workplaces.find((p) => p.key === employer[1]) ?? null;
  return (
    facts.workplaces.find((p) => p.existing && p.existing === classification) ??
    null
  );
}
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
export interface WorkShift {
  readonly startMinute: number;
  readonly minutes: number;
}
interface WorkPattern {
  readonly shifts: readonly WorkShift[];
  readonly kind: "week" | "rotating" | "cycle";
  readonly weekdays?: readonly Weekday[];
  readonly cycleDays?: number;
}
const hours = (from: number, length: number): WorkShift => ({
  startMinute: Math.round(from * 60),
  minutes: Math.round(length * 60),
});
const MON_FRI: readonly Weekday[] = [1, 2, 3, 4, 5];
// stopgapId: "economy.work-schedule-authored-patterns"
export const WORK_PATTERNS: Readonly<Record<WorkPatternKey, WorkPattern>> = {
  office: {
    kind: "week",
    weekdays: MON_FRI,
    shifts: [hours(8, 9), hours(9, 8)],
  },
  "public-office": { kind: "week", weekdays: MON_FRI, shifts: [hours(8, 8.5)] },
  school: { kind: "week", weekdays: MON_FRI, shifts: [hours(7.5, 8)] },
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
export interface WorkSchedule {
  readonly workRelationshipId: EntityId;
  readonly pattern: WorkPatternKey;
  readonly partTime: boolean;
  readonly shift: WorkShift;
  readonly weeklyHours: number;
  readonly place: string;
  readonly organizationId: EntityId | null;
  readonly worksOn: (date: IsoDate) => boolean;
}
const EPOCH = makeIsoDate("2000-01-02");
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
function jobShape(job: JobFacts): {
  pattern: WorkPatternKey;
  place: string;
} {
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
function fallbackPattern(job: JobFacts): WorkPatternKey {
  const kind = job.relationship.kind;
  if (/education/.test(kind)) return "school";
  if (/food/.test(kind)) return "diner";
  if (/retail/.test(kind)) return "store";
  if (/religious/.test(kind)) return "clergy";
  return "office";
}
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
interface JobIndex {
  readonly date: IsoDate;
  readonly byPerson: ReadonlyMap<EntityId, readonly JobFacts[]>;
  readonly byId: ReadonlyMap<EntityId, JobFacts>;
  readonly rosters: ReadonlyMap<string, readonly EntityId[]>;
  readonly shapes: ReadonlyMap<
    EntityId,
    {
      pattern: WorkPatternKey;
      place: string;
    }
  >;
}
const INDEXES = new WeakMap<
  WorkScheduleFacts["records"],
  Map<IsoDate, JobIndex>
>();
// stopgapId: "economy.work-schedule-history-frontier"
function jobIndex(facts: WorkScheduleFacts, date: IsoDate): JobIndex {
  const cached = INDEXES.get(facts.records)?.get(date);
  if (cached) return cached;
  const cutoff = {
    ...{
      asOfDate: facts.onDate,
      historySequenceExclusive: facts.records.nextSequence,
    },
    asOfDate: date,
  };
  const latestStatus = new Map<
    EntityId,
    {
      at: IsoDate;
      seq: number;
      status: string;
    }
  >();
  for (const record of facts.records.workStatuses) {
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
  for (const record of facts.records.workRoles) {
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
    facts.records.organizations.map((row) => [row.id, row.stableKey]),
  );
  const byPerson = new Map<EntityId, JobFacts[]>();
  const byId = new Map<EntityId, JobFacts>();
  const rosters = new Map<string, EntityId[]>();
  const shapes = new Map<
    EntityId,
    {
      pattern: WorkPatternKey;
      place: string;
    }
  >();
  for (const relationship of facts.records.workRelationships) {
    if (relationship.startedAt > date) continue;
    if (latestStatus.get(relationship.id)?.status !== "active") continue;
    const role = latestRole.get(relationship.id);
    if (!role) continue;
    const organizationKey = relationship.organizationId
      ? (organizationKeys.get(relationship.organizationId) ?? "")
      : "";
    const classification = relationship.organizationId
      ? (organizationProfileAt(facts, relationship.organizationId)
          ?.classification ?? null)
      : null;
    const workplace = organizationKey
      ? townWorkplaceFor(facts, organizationKey, classification)
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
  const perWorld = INDEXES.get(facts.records) ?? new Map<IsoDate, JobIndex>();
  if (perWorld.size > 8) perWorld.clear();
  perWorld.set(date, index);
  INDEXES.set(facts.records, perWorld);
  return index;
}
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
  const shiftCount = pattern.shifts.length;
  const lane = Math.floor(slot / shiftCount);
  const start = (lane * days + employerOffset(job)) % 7;
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
function employerOffset(job: JobFacts): number {
  const key = job.relationship.organizationId ?? job.relationship.id;
  let hash = 0;
  for (let n = 0; n < key.length; n += 1)
    hash = (hash * 31 + key.charCodeAt(n)) % 7;
  return hash;
}
export function workSchedulesFor(
  facts: WorkScheduleFacts,
  personId: EntityId,
  date: IsoDate = facts.onDate,
): readonly WorkSchedule[] {
  const index = jobIndex(facts, date);
  return (index.byPerson.get(personId) ?? []).map((job) =>
    scheduleOf(index, job),
  );
}
function previousDate(date: IsoDate): IsoDate {
  const at = new Date(`${date}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() - 1);
  return makeIsoDate(at.toISOString().slice(0, 10));
}
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
  const overflow = startMinute + minutes - 24 * 60;
  return (
    overflow > 0 &&
    moment.minuteOfDay < overflow &&
    schedule.worksOn(previousDate(today))
  );
}
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
  | {
      readonly kind: "home";
    }
  | {
      readonly kind: "absent";
      readonly recordId: EntityId;
      readonly reason: string;
    };
function minuteOf(moment: SimulationMoment): number {
  return daysBetween(EPOCH, moment.date) * 1440 + moment.minuteOfDay;
}
function activitiesUnderWay(
  facts: WorkScheduleFacts,
  moment: SimulationMoment,
): ReadonlyMap<
  EntityId,
  {
    activityId: EntityId;
    title: string;
  }
> {
  const now = minuteOf(moment);
  const found = new Map<
    EntityId,
    {
      activityId: EntityId;
      title: string;
    }
  >();
  for (const activity of facts.records.scheduledActivities) {
    const state = scheduledActivityState(facts, activity.id);
    if (state.status === "cancelled") continue;
    if (minuteOf(state.start) > now || now >= minuteOf(state.end)) continue;
    for (const personId of activity.participantPersonIds)
      if (!found.has(personId))
        found.set(personId, { activityId: activity.id, title: activity.title });
  }
  return found;
}
export function whereaboutsAt(
  facts: WorkScheduleFacts,
  personId: EntityId,
  moment: SimulationMoment = facts.onMoment,
  underWay?: ReturnType<typeof activitiesUnderWay>,
): PersonWhereabouts {
  const absence = workAbsenceAt(facts, personId, moment);
  if (absence)
    return {
      kind: "absent",
      recordId: absence.recordId,
      reason: absence.absence.reason,
    };
  const activity = (underWay ?? activitiesUnderWay(facts, moment)).get(
    personId,
  );
  if (activity) return { kind: "activity", ...activity };
  const index = jobIndex(facts, moment.date);
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
