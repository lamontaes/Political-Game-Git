/**
 * What two people have done together, read from the records that say so: the
 * one source the director's casting, its scene leads and the conversation
 * read for a tie's history (owner, Oct 27, 4 PM Eastern: "Systems are being
 * made for individually instead of linking everything together"). It writes
 * nothing; each kind names the record it comes from.
 */
import { coreAPI } from "./state";
import type { CoreState, PersonId } from "./types";

const ELECTIONS_MODULE_ID = "core2-elections-v1";
const CAMPAIGNS_MODULE_ID = "core2-campaigns-v1";

export type SharedHistoryKind =
  /** One lives in the other's household. */
  | "household"
  /** Kin on either's family record. */
  | "family"
  /** Both hold open jobs at one employer. */
  | "coworker"
  /** One works on the other's campaign (its volunteers). */
  | "campaign";

export interface SharedHistory {
  kind: SharedHistoryKind;
  /** The record that says so: the household, the employer or the filing. */
  recordId: string;
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
  const jobA = one.jobId ? core.jobs.get(one.jobId) : undefined;
  const jobB = other.jobId ? core.jobs.get(other.jobId) : undefined;
  if (
    jobA &&
    jobB &&
    !jobA.endsAt &&
    !jobB.endsAt &&
    jobA.organizationId === jobB.organizationId
  )
    out.push({ kind: "coworker", recordId: jobA.organizationId });
  for (const [candidate, helper] of [
    [a, b],
    [b, a],
  ] as const)
    for (const row of campaignsOf(core, candidate))
      if (row.volunteerIds.includes(helper))
        out.push({ kind: "campaign", recordId: row.filingId });
  return out;
}
