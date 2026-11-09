/**
 * A criminal record and the hiring decision. Where no law bars it, a public
 * employer weighs an applicant with a conviction on record down by a
 * researched amount. A ban-the-box law that is in force in the town takes the
 * question off the application: the penalty is not applied, and where that
 * changed who was hired the law is recorded as applied to the person it put in
 * work and the wages that paid. The applicant's record is the justice
 * engine's own: a case that ended in a conviction.
 */
import { lawApplied } from "./law-reach/applied";
import { convictionsOf } from "./modules/justice";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./modules/laws";
import type { CoreAPI } from "./types";

export const BAN_THE_BOX_KEY =
  "us-policy-positions:labor-workforce.ban-the-box-public-hiring";
const JOBS_ID = "jobs";

export interface RecordBias {
  /** The ban is law in the town, so the penalty is not applied. */
  readonly ban: boolean;
  readonly lawId: string | null;
  /** Fit points an applicant loses where nothing bars it: the penalty if the person has a conviction on record, else none. */
  readonly penaltyOf: (personId: string) => number;
  /** Whether the person has a conviction on record. */
  readonly hasRecord: (personId: string) => boolean;
}

// stopgapId: SG-LABOR-record-bias-public-only
/** The bias that applies to this employer, or null where it is not a public employer in the town. */
export function recordBiasAt(
  api: CoreAPI,
  organizationId: string,
  placeId: string,
): RecordBias | null {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return null;
  if (placeId !== lawChain(api).townPlaceId) return null;
  if (!api.state.organizations.get(organizationId)?.publicPayAuthority)
    return null;
  const law = lawInForce(api, BAN_THE_BOX_KEY);
  const weight = api.parameter("jobsRecordApplicantPenalty");
  const records = new Map<string, boolean>();
  const hasRecord = (personId: string) => {
    let known = records.get(personId);
    if (known === undefined) {
      known = convictionsOf(api, personId).length > 0;
      records.set(personId, known);
    }
    return known;
  };
  return {
    ban: law.value === 1 && !!law.governing,
    lawId: law.value === 1 ? (law.governing?.id ?? null) : null,
    penaltyOf: (personId) => (hasRecord(personId) ? weight : 0),
    hasRecord,
  };
}

/** The ban put this applicant, who has a record, in work over one the penalty would have preferred. */
export function recordHiredUnderBan(
  api: CoreAPI,
  bias: RecordBias,
  hired: { personId: string; organizationId: string },
  annualPayMinor: number,
): void {
  if (!bias.ban || !bias.lawId) return;
  lawApplied(api, {
    key: BAN_THE_BOX_KEY,
    lawId: bias.lawId,
    targetId: hired.personId,
    target: "person",
    engine: JOBS_ID,
    what: "hired-over-record-penalty",
    amountMinor: annualPayMinor,
  });
}

/**
 * A public opening's applicants in the order the employer weighs them, kept as
 * the law's record: one row per applicant naming their place, their fit after
 * any record penalty, and whether a conviction is on their record. The law is
 * the one in force when it bars the question, else a standing note that the
 * penalty applies.
 */
export function recordRanking(
  api: CoreAPI,
  bias: RecordBias,
  positionId: string,
  applicants: readonly { personId: string; weight: number }[],
): void {
  const ordered = [...applicants].sort(
    (a, b) => b.weight - a.weight || a.personId.localeCompare(b.personId),
  );
  ordered.forEach((row, index) =>
    lawApplied(api, {
      key: BAN_THE_BOX_KEY,
      lawId: bias.lawId ?? "no-ban-the-box-law",
      targetId: `${positionId}|${row.personId}`,
      target: "person",
      engine: JOBS_ID,
      what: `ranked-${index + 1}-of-${ordered.length}-fit-${row.weight.toFixed(1)}-${bias.hasRecord(row.personId) ? "record" : "clear"}`,
    }),
  );
}
