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

import { daysBetween, makeIsoDate } from "../../core2/kernel/dates";
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
import { workAbsenceAt } from "./work-absence";
import { isPersonAliveAt } from "../vitality-integrity";
import { townWorkplaceFor } from "../../core2/town-workplaces";

export const WORK_SCHEDULES_VERSION = "work-schedules-v1";

import {
  jobShape,
  rosterKeyOf,
  scheduleOf,
  type ScheduleJob,
  type WorkSchedule,
} from "../../core2/work-schedules";
import type { WorkPatternKey } from "../../core2/work-patterns";
import { EPOCH } from "../../core2/work-schedules";

interface JobFacts {
  readonly relationship: WorkRelationship;
  readonly role: WorkRoleRecord;
  readonly workplaceKey: string | null;
}

function scheduleJobOf(job: JobFacts): ScheduleJob {
  const { minimumHours, maximumHours } = job.role.timeDemand.expectedWeekly;
  return {
    id: job.relationship.id,
    organizationId: job.relationship.organizationId,
    kind: job.relationship.kind,
    title: job.role.title,
    workplaceKey: job.workplaceKey,
    minimumHours,
    maximumHours,
  };
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
    const scheduleJob = scheduleJobOf(job);
    const shape = jobShape(scheduleJob);
    shapes.set(relationship.id, shape);
    const rosterKey = rosterKeyOf(scheduleJob, shape.pattern);
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

function scheduleOfJob(index: JobIndex, job: JobFacts): WorkSchedule {
  return scheduleOf(
    scheduleJobOf(job),
    index.shapes.get(job.relationship.id)!,
    index.rosters,
  );
}

/** A person's working weeks, one per active job, as of `date`. */
export function workSchedulesFor(
  world: World,
  personId: EntityId,
  date: IsoDate = world.currentDate,
): readonly WorkSchedule[] {
  const index = jobIndex(world, date);
  return (index.byPerson.get(personId) ?? []).map((job) =>
    scheduleOfJob(index, job),
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
  | { readonly kind: "home" }
  | {
      readonly kind: "absent";
      readonly recordId: EntityId;
      readonly reason: string;
    };

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
  underWay?: ReturnType<typeof activitiesUnderWay>,
): PersonWhereabouts {
  const absence = workAbsenceAt(world, personId, moment);
  if (absence)
    return {
      kind: "absent",
      recordId: absence.recordId,
      reason: absence.absence.reason,
    };
  const activity = (underWay ?? activitiesUnderWay(world, moment)).get(
    personId,
  );
  if (activity) return { kind: "activity", ...activity };
  const index = jobIndex(world, moment.date);
  for (const job of index.byPerson.get(personId) ?? []) {
    const schedule = scheduleOfJob(index, job);
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
  underWay = activitiesUnderWay(world, moment),
): readonly PersonAtWork[] {
  const index = jobIndex(world, moment.date);
  const found: PersonAtWork[] = [];
  for (const job of index.byId.values()) {
    if (job.role.locationJurisdictionId !== town) continue;
    if (index.shapes.get(job.relationship.id)?.place !== place) continue;
    if (!onShiftAt(scheduleOfJob(index, job), moment)) continue;
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

/** Physical workplace identity: category alone cannot identify an employer's room. */
export interface WorkPlaceId {
  readonly jurisdictionId: EntityId;
  readonly place: string;
  readonly organizationId: EntityId | null;
}

/** Computed work whereabouts, never a saved room-attendance claim.
 * Scene/dialogue consumers must still require their central recorded presence.
 */
export function presentAt(
  world: World,
  placeId: WorkPlaceId,
  moment: SimulationMoment = world.currentMoment,
): readonly (PersonAtWork & {
  readonly presenceBasis: "computed-work-schedule";
})[] {
  if (!placeId.organizationId) return [];
  const underWay = activitiesUnderWay(world, moment);
  return peopleAtWorkAt(
    world,
    placeId.jurisdictionId,
    placeId.place,
    moment,
    underWay,
  )
    .filter((worker) => worker.organizationId === placeId.organizationId)
    .filter((worker) =>
      isPersonAliveAt(world, worker.personId, {
        asOfDate:
          moment.date <= world.currentDate ? moment.date : world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      }),
    )
    .filter((worker) => {
      const where = whereaboutsAt(world, worker.personId, moment, underWay);
      return (
        where.kind === "work" &&
        where.place === placeId.place &&
        where.organizationId === placeId.organizationId &&
        where.workRelationshipId === worker.workRelationshipId
      );
    })
    .map((worker) => ({
      ...worker,
      presenceBasis: "computed-work-schedule" as const,
    }));
}
