/** The jobs engine's front door for reads: who is looking for work, what changed in a job, which openings stand. Each function answers one question; none returns a table. */
import type { ClaimRow } from "./jobs-benefits";
import type { CoreAPI, CoreState } from "./types";
import type { JobOfferRow, PositionRow } from "./modules/jobs";

/** The module's id, as its own file names it (a test holds the two equal): written here so a door reads the table without loading the engine. */
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
