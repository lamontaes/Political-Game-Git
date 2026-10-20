/**
 * The public pay floor law: a yearly salary floor for public jobs, read by the
 * law engine the day a floor takes effect and at a monthly review while one is
 * in force, so later public hires are held to it too. A floor at a level binds
 * that government's own employers and every level under it; each job is
 * raised to the highest floor in force at its employer's level or above, the
 * way the teacher minimum salary raises teachers (through `rerateJob`).
 */
import data from "./data/laws/public-pay-floor.json" with { type: "json" };
import { addDays, makeIsoDate } from "./kernel/dates";
import { jobsAt } from "./law-reach/group-b-money";
import { reachParameter } from "./law-reach/group-b-people";
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { lawChain, lawInForce } from "./modules/laws";
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
  job: { readonly hourlyMinor?: number; readonly wageDailyMinor: number },
): number {
  const level = levelOf(api, organizationId);
  if (!level) return 0;
  const floor = floorsByLevel(api).get(level);
  const hourly = job.hourlyMinor ?? 0;
  if (!floor || hourly <= 0 || job.wageDailyMinor <= 0) return 0;
  const floorDaily =
    (floor.dollars * reachParameter("centsPerDollar")) /
    reachParameter("daysPerYear");
  return Math.ceil((hourly * floorDaily) / job.wageDailyMinor);
}

/**
 * Raise every public job in town paid under its floor; returns the raises.
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
    if (hourly <= 0 || job.wageDailyMinor >= floorDaily) continue;
    const to = Math.ceil((hourly * floorDaily) / job.wageDailyMinor);
    api.rerateJob(job.id, to, { ...source, asOf: core.date });
    raised.push({
      jobId: job.id,
      personId: job.personId,
      fromMinor: hourly,
      toMinor: to,
      lawId: floor.lawId,
    });
  }
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
