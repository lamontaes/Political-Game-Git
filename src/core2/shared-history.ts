/**
 * What two people have done together, read from the records that say so: the
 * one source the director's casting, its scene leads and the conversation
 * read for a tie's history (owner, Oct 27, 4 PM Eastern: "Systems are being
 * made for individually instead of linking everything together"). It writes
 * nothing; each kind names the record it comes from.
 */
import { stableHash } from "./kernel/ids";
import { parameter } from "./parameters";
import { coreAPI } from "./state";
import { stopgap } from "./stopgaps";
import type { CoreState, IsoDate, JobInput, PersonId } from "./types";

const ELECTIONS_MODULE_ID = "core2-elections-v1";
const SCHOOL_MODULE_ID = "core2-school-days-v1";
const STOPGAP = "SG-P15-coworker-groups";
const CAMPAIGNS_MODULE_ID = "core2-campaigns-v1";

export type SharedHistoryKind =
  /** One lives in the other's household. */
  | "household"
  /** Kin on either's family record. */
  | "family"
  /** Both hold, or held, jobs at one employer (the jobs engine's records). */
  | "coworker"
  /** Both attended one school in one school year (the school engine's records). */
  | "schoolmate"
  /** One works on the other's campaign (its volunteers). */
  | "campaign";

export interface SharedHistory {
  kind: SharedHistoryKind;
  /** The record that says so: the household, the employer, the school or the filing. */
  recordId: string;
  /** Shared work that ended: the later of the two jobs' end dates. */
  endedOn?: IsoDate;
  /** Schoolmates: the school year they shared (its first calendar year). */
  year?: number;
}

/** The school engine's attended row: the school a person last attended, and its year. */
export interface AttendedRow {
  id: string;
  schoolId: string;
  year: number;
}

/** The school a person last attended, with the school year it was in. */
export function attendedSchool(
  core: Readonly<CoreState>,
  personId: PersonId,
): AttendedRow | undefined {
  if (!core.modules.has(SCHOOL_MODULE_ID)) return undefined;
  return coreAPI(core as CoreState)
    .moduleState(SCHOOL_MODULE_ID)
    .table("attended")
    .get(personId) as unknown as AttendedRow | undefined;
}

/** Every job an employer's records hold, held now or ended. */
function jobsAt(core: Readonly<CoreState>, organizationId: string): JobInput[] {
  return [...(core.finance.jobsByOrganization.get(organizationId) ?? [])]
    .map((id) => core.jobs.get(id))
    .filter((job): job is JobInput => job !== undefined);
}

/**
 * Work two people shared: an employer where one works now and the other
 * works or worked. Read from the employer's staff (the jobs engine's records,
 * kept after a job ends), never from a generated fact.
 */
function sharedWork(
  core: Readonly<CoreState>,
  a: PersonId,
  b: PersonId,
): SharedHistory[] {
  const out: SharedHistory[] = [];
  const seen = new Set<string>();
  for (const [self, peer] of [
    [a, b],
    [b, a],
  ] as const) {
    const job = core.people.get(self)?.jobId;
    const organizationId = job ? core.jobs.get(job)?.organizationId : undefined;
    if (!organizationId || seen.has(organizationId)) continue;
    seen.add(organizationId);
    const staff = jobsAt(core, organizationId);
    const mine = staff.filter((row) => row.personId === self);
    const theirs = staff.filter((row) => row.personId === peer);
    if (!mine.length || !theirs.length) continue;
    // Their spans are not checked: a job record keeps no start date
    // (SG-P15-coworker-groups).
    stopgap(STOPGAP);
    const open = (rows: JobInput[]) => rows.some((row) => !row.endsAt);
    const ends = [...mine, ...theirs]
      .map((row) => row.endsAt)
      .filter((date): date is IsoDate => date !== undefined)
      .sort();
    out.push({
      kind: "coworker",
      recordId: organizationId,
      ...(open(mine) && open(theirs) ? {} : { endedOn: ends.at(-1)! }),
    });
  }
  return out;
}

/**
 * The coworkers someone knows by name from their first day: the others in
 * their workgroup at their employer. An employer's staff splits into groups
 * of about openingCoworkerGroupSize, each person's group drawn from the
 * world's seed (who knows whom, never what anyone does), so a staff small
 * enough is one group. Read from the jobs engine's staff list.
 */
export function workgroupOf(
  core: Readonly<CoreState>,
  personId: PersonId,
): PersonId[] {
  const job = core.people.get(personId)?.jobId;
  const organizationId = job ? core.jobs.get(job)?.organizationId : undefined;
  if (!organizationId) return [];
  stopgap(STOPGAP);
  const p = (key: string) => parameter(key, core.data.parameters);
  const staff = jobsAt(core, organizationId)
    .filter((row) => !row.endsAt && core.people.has(row.personId))
    .map((row) => row.personId);
  const groups = Math.max(
    p("one"),
    Math.ceil(staff.length / p("openingCoworkerGroupSize")),
  );
  const group = (id: PersonId) =>
    Number.parseInt(
      stableHash(JSON.stringify([core.seed, organizationId, id])).slice(
        p("zero"),
        p("seedHashDigits"),
      ),
      p("seedPlaceHashRadix"),
    ) % groups;
  const mine = group(personId);
  return [...new Set(staff)]
    .filter((id) => id !== personId && group(id) === mine)
    .sort();
}

/** The campaigns a candidate runs, by their filings, with their volunteers. */
function campaignsOf(
  core: Readonly<CoreState>,
  candidateId: PersonId,
): { filingId: string; volunteerIds: readonly string[] }[] {
  if (
    !core.modules.has(ELECTIONS_MODULE_ID) ||
    !core.modules.has(CAMPAIGNS_MODULE_ID)
  )
    return [];
  const api = coreAPI(core as CoreState);
  const filings = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byPerson", [candidateId]) as unknown as { id: string }[];
  const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID).table("campaigns");
  return filings.flatMap((filing) => {
    const row = campaigns.get(filing.id) as unknown as
      { volunteerIds?: readonly string[] } | undefined;
    return row?.volunteerIds?.length
      ? [{ filingId: filing.id, volunteerIds: row.volunteerIds }]
      : [];
  });
}

/** Everything the records say two people did or share, closest first. */
export function sharedHistory(
  core: Readonly<CoreState>,
  a: PersonId,
  b: PersonId,
): SharedHistory[] {
  const one = core.people.get(a);
  const other = core.people.get(b);
  if (!one || !other || a === b) return [];
  const out: SharedHistory[] = [];
  if (one.householdId && one.householdId === other.householdId)
    out.push({ kind: "household", recordId: one.householdId });
  if (one.familyIds.has(b) || other.familyIds.has(a))
    out.push({ kind: "family", recordId: `${a}:${b}` });
  out.push(...sharedWork(core, a, b));
  const schoolA = attendedSchool(core, a);
  const schoolB = attendedSchool(core, b);
  if (
    schoolA &&
    schoolB &&
    schoolA.schoolId === schoolB.schoolId &&
    schoolA.year === schoolB.year
  )
    out.push({
      kind: "schoolmate",
      recordId: schoolA.schoolId,
      year: schoolA.year,
    });
  for (const [candidate, helper] of [
    [a, b],
    [b, a],
  ] as const)
    for (const row of campaignsOf(core, candidate))
      if (row.volunteerIds.includes(helper))
        out.push({ kind: "campaign", recordId: row.filingId });
  return out;
}
