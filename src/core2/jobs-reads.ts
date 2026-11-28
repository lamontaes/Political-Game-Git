/** The jobs engine's front door for reads: who is looking for work, what changed in a job, which openings stand. Each function answers one question; none returns a table. */
import type { ClaimRow } from "./jobs-benefits";
import type { CoreAPI, CoreState } from "./types";
import type { JobOfferRow, PositionRow } from "./modules/jobs";
import type { LawRowInput, LawInForceAnswer } from "./laws-in-force";
import type { Source } from "./types";
import type { UnemploymentTerms } from "./jobs-benefits";

/** The module's id, written here (the engine's own file names the same string) so a door reads the table without loading the engine. A door that named the wrong table fails `economy-reads.test.ts`, which reads each door in a played world. */
const JOBS_MODULE_ID = "jobs";

/** One change in a job: a hire, quit, layoff, shed, closure or leaving work, kept with the heads it stood for. */
export interface JobChangeRow {
  readonly id: string;
  readonly date: string;
  readonly personId: string;
  readonly organizationId: string;
  readonly jobId: string;
  readonly kind:
    "hire" | "quit" | "layoff" | "staff-shed" | "closure" | "left-work";
  readonly reasonKey: string;
  readonly decidedBy: string;
  readonly values?: Readonly<Record<string, number>>;
  readonly tradingId?: string;
  readonly heads?: number;
}

/** A named person on the job-seeker list (kept until they are hired), as the jobs engine writes it. */
export interface JobSeekerRow {
  readonly id: string;
  readonly isSeeker: true;
  readonly personId: string;
  readonly placeId: string;
  /** True for a seeker who has just been hired and is about to leave the list. */
  readonly employed: boolean;
  readonly since: string;
  readonly reasonKey: string;
  readonly referenceHourlyMinor: number;
}

/** A counted person on the job-seeker list: the same row without the hired flag (a counted seeker leaves the list when hired). */
export interface CountedSeekerRow {
  readonly id: string;
  readonly isSeeker: true;
  readonly personId: string;
  readonly placeId: string;
  readonly since: string;
  readonly reasonKey: string;
  readonly referenceHourlyMinor: number;
}

function store(api: CoreAPI) {
  return api.moduleState(JOBS_MODULE_ID);
}

/** Whether this world keeps the jobs engine. */
export function jobsKept(api: CoreAPI): boolean {
  return (api.state as CoreState).modules.has(JOBS_MODULE_ID);
}

/** Whether the jobs engine has opened (its first record is written). */
export function jobsOpened(api: CoreAPI): boolean {
  return jobsKept(api) && !!store(api).table("state").get("jobs:state");
}

/** One job change by its record id. */
export function jobChange(api: CoreAPI, id: string): JobChangeRow | undefined {
  if (!jobsKept(api)) return undefined;
  return store(api).table("changes").get(id) as unknown as
    JobChangeRow | undefined;
}

/** The change of one kind that ended a job on a date (`job-change:<date>:<job>:<kind>`). */
export function jobChangeOn(
  api: CoreAPI,
  date: string,
  jobId: string,
  kind: JobChangeRow["kind"],
): JobChangeRow | undefined {
  return jobChange(api, `job-change:${date}:${jobId}:${kind}`);
}

/** Every change a person's jobs went through. */
export function jobChangesOf(
  api: CoreAPI,
  personId: string,
): readonly JobChangeRow[] {
  if (!jobsKept(api)) return [];
  return store(api)
    .table("changes")
    .query("byPerson", [personId]) as unknown as JobChangeRow[];
}

/** Every change of one kind (closures, layoffs). */
export function jobChangesOfKind(
  api: CoreAPI,
  kind: JobChangeRow["kind"],
): readonly JobChangeRow[] {
  if (!jobsKept(api)) return [];
  return store(api)
    .table("changes")
    .query("byKind", [kind]) as unknown as JobChangeRow[];
}

/** Every change the world has kept. */
export function allJobChanges(api: CoreAPI): readonly JobChangeRow[] {
  if (!jobsKept(api)) return [];
  return store(api).table("changes").rows() as unknown as JobChangeRow[];
}

/** The day a job was last given its pay, if it has been (when the job began for pay). */
export function jobPaidSince(api: CoreAPI, jobId: string): string | undefined {
  if (!jobsKept(api)) return undefined;
  return (store(api).table("pay").get(jobId) as { since?: string } | undefined)
    ?.since;
}

/** A full person's row on the job-seeker list, if they are on it. */
export function seekerOf(
  api: CoreAPI,
  personId: string,
): JobSeekerRow | undefined {
  if (!jobsKept(api)) return undefined;
  return store(api).table("seekers").get(personId) as unknown as
    JobSeekerRow | undefined;
}

/** Every full person on the job-seeker list. */
export function allSeekers(api: CoreAPI): readonly JobSeekerRow[] {
  if (!jobsKept(api)) return [];
  return store(api).table("seekers").rows() as unknown as JobSeekerRow[];
}

/** A counted person's row on the job-seeker list, if they are on it. */
export function countedSeekerOf(
  api: CoreAPI,
  personId: string,
): CountedSeekerRow | undefined {
  if (!jobsKept(api)) return undefined;
  return store(api).table("countedSeekers").get(personId) as unknown as
    CountedSeekerRow | undefined;
}

/** Every counted person on the job-seeker list. */
export function allCountedSeekers(api: CoreAPI): readonly CountedSeekerRow[] {
  if (!jobsKept(api)) return [];
  return store(api)
    .table("countedSeekers")
    .rows() as unknown as CountedSeekerRow[];
}

/** Every opening the jobs engine keeps, whatever its status. */
export function allPositions(api: CoreAPI): readonly PositionRow[] {
  if (!jobsKept(api)) return [];
  return store(api).table("positions").rows() as unknown as PositionRow[];
}

/** One opening by its record id. */
export function positionOf(
  api: CoreAPI,
  positionId: string,
): PositionRow | undefined {
  if (!jobsKept(api)) return undefined;
  return store(api).table("positions").get(positionId) as unknown as
    PositionRow | undefined;
}

/** One offer by its record id. */
export function offerOf(
  api: CoreAPI,
  offerId: string,
): JobOfferRow | undefined {
  if (!jobsKept(api)) return undefined;
  return store(api).table("offers").get(offerId) as unknown as
    JobOfferRow | undefined;
}

/** Whether the player's person has applied to an opening. */
export function hasApplied(api: CoreAPI, positionId: string): boolean {
  if (!jobsKept(api)) return false;
  return !!store(api).table("playerApplications").get(positionId);
}

/** Every unemployment claim that is open now. */
export function openClaims(api: CoreAPI): readonly ClaimRow[] {
  if (!jobsKept(api)) return [];
  return store(api)
    .table("claims")
    .query("open", [true]) as unknown as ClaimRow[];
}

/** Everyone out of work and looking, from either seeker list, each person once. */
export function lookingForWork(
  api: CoreAPI,
): readonly (JobSeekerRow | CountedSeekerRow)[] {
  const out = new Map<string, JobSeekerRow | CountedSeekerRow>();
  for (const row of allSeekers(api))
    if (!row.employed) out.set(row.personId, row);
  for (const row of allCountedSeekers(api))
    if (!out.has(row.personId)) out.set(row.personId, row);
  return [...out.values()];
}

export const DAYS_PER_WEEK = 7;

const QUARTERS_PER_YEAR = 4;

function lawSource(row: LawRowInput, asOf: string): Source {
  const where = Array.isArray(row.source)
    ? row.source.join(" ; ")
    : (row.source as string);
  const citation = `${row.id}: ${where}`;
  return row.estimate
    ? { tag: "ESTIMATED", asOf, citation, estimatedFrom: citation }
    : { tag: "SOURCED", asOf, citation };
}

export const NO_PROGRAM = (asOf: string): UnemploymentTerms => ({
  hasProgram: false,
  weeklyShare: 0,
  weeklyMaximumMinor: 0,
  maxWeeks: 0,
  waitingWeek: false,
  minimumBasePeriodMinor: 0,
  source: {
    tag: "ESTIMATED",
    asOf,
    citation: "No unemployment insurance law is in force here.",
    estimatedFrom: "The laws module's starting law records no program.",
  },
});

/**
 * The same terms from any state's law answers: the town reads its own state's,
 * and the country tier reads every state's (one rule, two tiers).
 */
export function unemploymentTermsOf(
  program: LawInForceAnswer,
  maximumAnswer: LawInForceAnswer,
  parameter: (key: string) => number,
  asOf: string,
): UnemploymentTerms {
  const row = program.governing;
  const t = row?.terms as
    | {
        waitingWeek?: boolean;
        maxWeeks?: number | null;
        weeklyBenefitFraction?: number | null;
        weeklyBenefitBasisQuarters?: number | null;
        baseEarnings?: {
          minimumBasePeriodWages?: number | null;
          minimumHighQuarterWages?: number | null;
        };
      }
    | undefined;
  const maximum = maximumAnswer.value;
  // The enacted amount is availability. The starting research also carries
  // a hasProgram field, but retaining its formula must not override repeal.
  if (!row || !t || row.value !== 1) return NO_PROGRAM(asOf);
  if (typeof t.maxWeeks !== "number" || maximum === null)
    return NO_PROGRAM(asOf);
  const minor = parameter("minorPerDollar");
  const quarterWeeks =
    parameter("jobsDaysPerYear") / DAYS_PER_WEEK / QUARTERS_PER_YEAR;
  const quarters = t.weeklyBenefitBasisQuarters ?? undefined;
  // A fraction of the basis wages is a share of weekly pay once the basis's
  // weeks are counted; a row that gives none falls to the program's median.
  const weeklyShare =
    typeof t.weeklyBenefitFraction === "number" && quarters !== undefined
      ? t.weeklyBenefitFraction * (quarters === 0 ? 1 : quarters * quarterWeeks)
      : parameter("jobsBenefitWeeklyShare");
  const wages =
    t.baseEarnings?.minimumBasePeriodWages ??
    t.baseEarnings?.minimumHighQuarterWages;
  return {
    hasProgram: true,
    weeklyShare,
    ...(typeof t.weeklyBenefitFraction === "number" && quarters !== undefined
      ? {
          weeklyFraction: t.weeklyBenefitFraction,
          basisQuarters: quarters,
        }
      : {}),
    weeklyMaximumMinor: maximum * minor,
    maxWeeks: t.maxWeeks,
    waitingWeek: t.waitingWeek === true,
    minimumBasePeriodMinor:
      typeof wages === "number"
        ? Math.round(wages * minor)
        : parameter("jobsBenefitMinimumBasePeriodMinor"),
    lawId: row.id,
    ...(maximumAnswer.governing
      ? { maximumLawId: maximumAnswer.governing.id }
      : {}),
    source: lawSource(row, asOf),
  };
}
