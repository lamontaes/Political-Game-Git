/**
 * The public pay floor law: a yearly salary floor for public jobs, read by the
 * law engine the day a floor takes effect and at a monthly review while one is
 * in force, so later public hires are held to it too. A floor at a level binds
 * that government's own employers and every level under it; each job is
 * raised to the highest floor in force at its employer's level or above, the
 * way the teacher minimum salary raises teachers (through `rerateJob`). Each
 * worker the floor raises or holds is recorded as its reach (`lawApplied`):
 * a full person by name, the counted workers of each employer as a group.
 *
 * The teacher minimum salary question is held the same way for the town's
 * public school teachers (`holdTeacherPay`, and the hiring floor in
 * `publicPayFloorHourly`): the district's teachers, named and counted, are
 * raised to the floor and recorded as its reach.
 */
import data from "./data/laws/public-pay-floor.json" with { type: "json" };
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn, lawApplied, lawNoLongerApplies } from "./law-reach/applied";
import { jobsAt, questionRow } from "./law-reach/group-b-money";
import { reachParameter } from "./law-reach/group-b-people";
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./modules/laws";
import type { LawLevelName } from "./laws-starting";
import type { CoreAPI, CoreState, Source } from "./types";

export const PUBLIC_PAY_FLOOR = data.series;
export const PUBLIC_PAY_FLOOR_UNIT = data.unit;
export const PUBLIC_PAY_REVIEW = data.reviewKind;
const EMPLOYER_LEVELS = data.employerLevels as Readonly<
  Record<string, LawLevelName>
>;
/** Every public employer class, for screens that split public from private pay. */
export const PUBLIC_EMPLOYER_CLASSES: readonly string[] =
  Object.keys(EMPLOYER_LEVELS);
const ORDER: readonly LawLevelName[] = ["federal", "state", "county", "city"];

/** The teacher minimum salary question, and the jobs and employers it covers. */
export const TEACHER_FLOOR =
  "us-policy-positions:education.raise-teacher-minimum-salary";
const TEACHERS = "profession:teacher";
const DISTRICTS: readonly string[] = ["service:school"];

/** The teacher minimum salary in force for the town, with the law row that sets it (null while it is not law). */
function teacherFloor(api: CoreAPI): { dollars: number; lawId: string } | null {
  if (!(api.state as CoreState).modules.has(LAWS_MODULE_ID)) return null;
  const row = questionRow(api, TEACHER_FLOOR);
  return row
    ? { dollars: reachParameter("teacherMinimumSalaryDollars"), lawId: row.id }
    : null;
}

/** The hourly pay at which a job's daily wage meets a yearly floor, at its own hours. */
function hourlyAtFloor(
  floorDollars: number,
  job: { readonly hourlyMinor?: number; readonly wageDailyMinor: number },
): number {
  const floorDaily =
    (floorDollars * reachParameter("centsPerDollar")) /
    reachParameter("daysPerYear");
  return ((job.hourlyMinor ?? 0) * floorDaily) / job.wageDailyMinor;
}

/**
 * The level of government a public employer belongs to: by its class, or, for
 * a government's own treasury (the employer of its aides and appointed heads,
 * which has no class), by the government it is the treasury of.
 */
function levelOf(
  api: CoreAPI,
  organizationId: string,
): LawLevelName | undefined {
  const core = api.state as CoreState;
  const org = core.organizations.get(organizationId);
  const byClass = EMPLOYER_LEVELS[org?.classification ?? ""];
  if (byClass) return byClass;
  if (
    org?.kind !== "government-treasury" ||
    !core.modules.has(BUDGETS_MODULE_ID)
  )
    return undefined;
  return governments(api).find((row) => row.organizationId === organizationId)
    ?.level;
}

/** Jobs a government's treasury pays directly (its aides and appointed heads), here in town. */
function treasuryJobs(api: CoreAPI) {
  const core = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  return [...core.jobs.values()].filter((job) => {
    const org = core.organizations.get(job.organizationId);
    return (
      job.endsAt === undefined &&
      org?.kind === "government-treasury" &&
      org.placeId === town
    );
  });
}

/** The floor binding each level's employers today, with the law row that sets it. */
function floorsByLevel(api: CoreAPI) {
  const answer = lawInForce(api, PUBLIC_PAY_FLOOR);
  const out = new Map<LawLevelName, { dollars: number; lawId: string }>();
  let best: { dollars: number; lawId: string } | undefined;
  for (const level of ORDER) {
    const row = answer.levels.find((l) => l.level === level)?.row;
    if (row && (row.value ?? 0) > (best?.dollars ?? 0))
      best = { dollars: row.value ?? 0, lawId: row.id };
    if (best && best.dollars > 0) out.set(level, best);
  }
  return out;
}

/**
 * The hourly pay a public employer's job must reach today under the floor in
 * force at its level or above (0 where none binds it): the pay at which the
 * job's daily wage meets the yearly floor, at the job's own hours. The hiring
 * engines read it when they set a new hire's pay, so a public hire is never
 * paid under the floor for a month.
 */
export function publicPayFloorHourly(
  api: CoreAPI,
  organizationId: string,
  job: {
    readonly hourlyMinor?: number;
    readonly wageDailyMinor: number;
    readonly occupationClassification?: string;
  },
): number {
  // A world without the law engine has no floor to hold a hire to.
  if (!(api.state as CoreState).modules.has(LAWS_MODULE_ID)) return 0;
  const hourly = job.hourlyMinor ?? 0;
  if (hourly <= 0 || job.wageDailyMinor <= 0) return 0;
  const level = levelOf(api, organizationId);
  const floor = level ? floorsByLevel(api).get(level) : undefined;
  let to = floor ? hourlyAtFloor(floor.dollars, job) : 0;
  // A teacher at the town's district is also held to the teacher minimum.
  if (
    job.occupationClassification === TEACHERS &&
    DISTRICTS.includes(
      (api.state as CoreState).organizations.get(organizationId)
        ?.classification ?? "",
    )
  ) {
    const teachers = teacherFloor(api);
    if (teachers) to = Math.max(to, hourlyAtFloor(teachers.dollars, job));
  }
  return to > 0 ? Math.ceil(to) : 0;
}

/**
 * Raise every public job in town paid under its floor; returns the raises.
 * Every job the floor holds (raised today, or already paid at it) is the
 * law's reach: a full worker by name, an employer's counted workers as one
 * group; a worker it no longer holds (left, or paid above it) leaves it.
 * Schedules the next monthly review while any floor is in force.
 */
export function holdPublicPay(
  api: CoreAPI,
  source: Source,
): {
  jobId: string;
  personId: string;
  fromMinor: number;
  toMinor: number;
  lawId: string;
}[] {
  const floors = floorsByLevel(api);
  if (!floors.size) return [];
  const core = api.state as CoreState;
  const raised = [];
  const held = new Set<string>();
  const counted = new Map<string, { count: number; lawId: string }>();
  for (const job of [
    ...jobsAt(api, PUBLIC_EMPLOYER_CLASSES),
    ...treasuryJobs(api),
  ]) {
    const level = levelOf(api, job.organizationId);
    const floor = level ? floors.get(level) : undefined;
    if (!floor) continue;
    const floorDaily =
      (floor.dollars * reachParameter("centsPerDollar")) /
      reachParameter("daysPerYear");
    const hourly = job.hourlyMinor ?? 0;
    if (hourly <= 0 || job.wageDailyMinor <= 0) continue;
    // The hourly pay at which the job's daily wage meets the floor. A job
    // within a cent an hour of it is held at it (a raise's own rounding
    // leaves it there); one a cent or more under it is raised.
    const exact = (hourly * floorDaily) / job.wageDailyMinor;
    if (exact <= hourly - 1) continue;
    const to = exact >= hourly + 1 ? Math.ceil(exact) : hourly;
    if (to > hourly) {
      api.rerateJob(job.id, to, { ...source, asOf: core.date });
      raised.push({
        jobId: job.id,
        personId: job.personId,
        fromMinor: hourly,
        toMinor: to,
        lawId: floor.lawId,
      });
    }
    const what = to > hourly ? "raised-to-pay-floor" : "held-at-pay-floor";
    if (core.jobs.has(job.id)) {
      held.add(job.personId);
      lawApplied(api, {
        key: PUBLIC_PAY_FLOOR,
        lawId: floor.lawId,
        targetId: job.personId,
        target: "person",
        engine: LAWS_MODULE_ID,
        what,
      });
    } else {
      const group = `${job.organizationId}:counted-staff`;
      const at = counted.get(group);
      counted.set(group, { count: (at?.count ?? 0) + 1, lawId: floor.lawId });
    }
  }
  for (const [group, at] of counted) {
    held.add(group);
    lawApplied(api, {
      key: PUBLIC_PAY_FLOOR,
      lawId: at.lawId,
      targetId: group,
      target: "group",
      engine: LAWS_MODULE_ID,
      what: "held-at-pay-floor",
      count: at.count,
    });
  }
  for (const row of appliedOn(api, PUBLIC_PAY_FLOOR))
    if (!held.has(row.targetId))
      lawNoLongerApplies(api, PUBLIC_PAY_FLOOR, row.targetId);
  const next = new Date(`${core.date}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const date = makeIsoDate(next.toISOString().slice(0, 10));
  const calendar = api.moduleCalendar("core2-laws-v1");
  const key = `${PUBLIC_PAY_REVIEW}:${date}`;
  // Two floors taking effect the same day share the one review.
  if (calendar.get(key)) return raised;
  calendar.schedule({
    key,
    date: date > core.date ? date : addDays(makeIsoDate(core.date), 1),
    kind: PUBLIC_PAY_REVIEW,
    source: { ...source, asOf: core.date },
    sourceRecordIds: [...new Set([...floors.values()].map((f) => f.lawId))],
  });
  return raised;
}

/**
 * Raise every public school teacher in town paid under the teacher minimum
 * salary; returns the raises. Every covered teacher is the law's reach (the
 * minimum binds them all, whether it raised their pay, held it or found it
 * above): a full teacher by name, each district's counted teachers as one
 * group; a teacher it no longer covers (left, or the law repealed) leaves it.
 * Schedules the next monthly review while the question is law.
 */
export function holdTeacherPay(
  api: CoreAPI,
  source: Source,
): {
  jobId: string;
  personId: string;
  fromMinor: number;
  toMinor: number;
  lawId: string;
}[] {
  const floor = teacherFloor(api);
  const core = api.state as CoreState;
  const raised = [];
  const held = new Set<string>();
  const counted = new Map<string, { count: number; lawId: string }>();
  for (const job of floor ? jobsAt(api, DISTRICTS, TEACHERS) : []) {
    const hourly = job.hourlyMinor ?? 0;
    if (!floor || hourly <= 0 || job.wageDailyMinor <= 0) continue;
    // A job within a cent an hour of the floor is held at it; one a cent or
    // more under it is raised; one above it is left as it is.
    const exact = hourlyAtFloor(floor.dollars, job);
    const to = exact >= hourly + 1 ? Math.ceil(exact) : hourly;
    if (to > hourly) {
      api.rerateJob(job.id, to, { ...source, asOf: core.date });
      raised.push({
        jobId: job.id,
        personId: job.personId,
        fromMinor: hourly,
        toMinor: to,
        lawId: floor.lawId,
      });
    }
    if (core.jobs.has(job.id)) {
      held.add(job.personId);
      lawApplied(api, {
        key: TEACHER_FLOOR,
        lawId: floor.lawId,
        targetId: job.personId,
        target: "person",
        engine: LAWS_MODULE_ID,
        what:
          to > hourly
            ? "raised-to-teacher-minimum"
            : exact > hourly - 1
              ? "held-at-teacher-minimum"
              : "paid-above-teacher-minimum",
      });
    } else {
      const group = `${job.organizationId}:counted-teachers`;
      const at = counted.get(group);
      counted.set(group, { count: (at?.count ?? 0) + 1, lawId: floor.lawId });
    }
  }
  for (const [group, at] of counted) {
    held.add(group);
    lawApplied(api, {
      key: TEACHER_FLOOR,
      lawId: at.lawId,
      targetId: group,
      target: "group",
      engine: LAWS_MODULE_ID,
      what: "held-at-teacher-minimum",
      count: at.count,
    });
  }
  for (const row of appliedOn(api, TEACHER_FLOOR))
    if (!held.has(row.targetId))
      lawNoLongerApplies(api, TEACHER_FLOOR, row.targetId);
  if (!floor) return raised;
  const next = new Date(`${core.date}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const date = makeIsoDate(next.toISOString().slice(0, 10));
  const calendar = api.moduleCalendar("core2-laws-v1");
  const key = `${PUBLIC_PAY_REVIEW}:${date}`;
  // The public pay floor's review, when one is set, is the same review.
  if (calendar.get(key)) return raised;
  calendar.schedule({
    key,
    date: date > core.date ? date : addDays(makeIsoDate(core.date), 1),
    kind: PUBLIC_PAY_REVIEW,
    source: { ...source, asOf: core.date },
    sourceRecordIds: [floor.lawId],
  });
  return raised;
}
