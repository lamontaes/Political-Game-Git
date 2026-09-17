import type { EntityId, IsoDate, ResourceEndpoint, World } from "../types";

/**
 * GOVERNING interface boundary for PRESS46.
 *
 * Swap at merge: GOVERNING published the real implementations at 58453e5f
 * (claude/governing-all-states, PR #266) in
 * src/simulation/governing/institution-authority.ts and
 * src/simulation/governing/outside-mandate-payment.ts with these exact shapes.
 * Once both PRs are on one base, replace the bodies below with re-exports.
 *
 * GOVERNING owns public-fund writers and institutional authority. It agreed to
 * provide `recordOutsideMandatePublicPayment` and `canInstitutionAct`
 * (CRUNCH46 §00B, 2026-09-16). Until those land, this adapter fails closed:
 * - public-fund misuse is unavailable, so no M7 occurrence can be invented;
 * - every sanction or removal answers `unknown`, so no consequence surfaces.
 *
 * Procedure steps PRESS runs itself (FEC, KY KLEC) are researched procedure
 * facts from ALIVE44 chunk 4. They are not sanction authority, and this reader
 * answers them separately.
 */

export type AccountableInstitution =
  | "fec"
  | "us-house-ethics"
  | "us-senate-ethics"
  | `state-legislative-ethics:${string}`
  | `state-executive-ethics:${string}`
  | `state-auditor:${string}`
  | "chamber-floor"
  | "party-conference";

export type InstitutionAction =
  | "receive-complaint"
  | "open-inquiry"
  | "dismiss"
  | "issue-finding"
  | "admonish"
  | "reprimand"
  | "censure"
  | "expel"
  | "remove-from-office"
  | "strip-committee-assignment"
  | "civil-penalty"
  | "refer-for-prosecution"
  | "audit-agency";

export interface InstitutionActionAnswer {
  readonly status: "available" | "unavailable" | "unknown";
  readonly sourceRefs: readonly string[];
  readonly note: string;
}

const FEC_PROCEDURE_SOURCE =
  "https://www.fec.gov/legal-resources/enforcement/complaints-process/how-to-file-complaint-with-fec/";
const KLEC_PROCEDURE_SOURCES = [
  "https://klec.ky.gov/Forms/Pages/Complaints-and-Investigations.aspx",
  "https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=55533",
];

const PROCEDURE_ACTIONS: readonly InstitutionAction[] = [
  "receive-complaint",
  "open-inquiry",
  "dismiss",
  "issue-finding",
];

/**
 * Stub for GOVERNING's `canInstitutionAct`. Replace it with the GOVERNING
 * reader once that lands; PRESS treats unavailable and unknown the same way.
 */
export function canInstitutionAct(
  _world: World,
  input: {
    readonly institution: AccountableInstitution;
    readonly action: InstitutionAction;
    readonly subjectPersonId: EntityId;
    readonly onDate: IsoDate;
  },
): InstitutionActionAnswer {
  if (input.institution === "fec" && PROCEDURE_ACTIONS.includes(input.action)) {
    return {
      status: "available",
      sourceRefs: [FEC_PROCEDURE_SOURCE],
      note: "FEC complaint procedure step (ALIVE44 chunk 4); not a guilt finding.",
    };
  }
  if (
    input.institution === "state-legislative-ethics:ky" &&
    (PROCEDURE_ACTIONS.includes(input.action) || input.action === "reprimand")
  ) {
    return {
      status: "available",
      sourceRefs: KLEC_PROCEDURE_SOURCES,
      note: "Kentucky Legislative Ethics Commission procedure (ALIVE44 chunk 4).",
    };
  }
  return {
    status: "unknown",
    sourceRefs: [],
    note: "No researched authority for this action yet (GOVERNING canInstitutionAct pending).",
  };
}

export interface OutsideMandatePaymentInput {
  readonly stableKey: string;
  readonly payerPersonId: EntityId;
  readonly payerWorkRoleId: EntityId;
  readonly fundingId: EntityId;
  readonly operationKey: string;
  readonly purposeUsed: string;
  readonly amountMinorUnits: number;
  readonly recipient: ResourceEndpoint;
  readonly intent: "deliberate-outside-mandate";
}

export interface OutsideMandatePaymentResult {
  readonly world: World;
  readonly resourceFlowId: EntityId;
  readonly occurrenceEventId: EntityId;
}

/** Unavailable until GOVERNING publishes its labeled writer. */
export function outsideMandatePublicPaymentAvailable(): boolean {
  return false;
}

export function recordOutsideMandatePublicPayment(
  world: World,
  input: OutsideMandatePaymentInput,
): OutsideMandatePaymentResult {
  void world;
  void input;
  throw new Error(
    "Public-fund misuse needs GOVERNING's labeled payment writer, which has not landed.",
  );
}
