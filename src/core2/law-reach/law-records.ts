/**
 * What a law in force did, as records on the law effects module (PW-4):
 *
 * - `payment`: money moved to a person, household or business because of the
 *   law, through the cash journal from a funded account, with the law row as
 *   its source.
 * - `service`: a thing the law provides to someone (a benefit's coverage, a
 *   budget line's staff and programs).
 * - `no-local-effect`: the law is in force but reaches nothing here, with the
 *   place fact that makes it so.
 */
import type { CoreAPI } from "../types";
import type { ModuleRow } from "../module-data";

/** The law effects module's id (`modules/law-effects.ts`), which owns the tables. */
const LAW_EFFECTS = "core2-law-effects-v1";

export interface LawPaymentRecord {
  readonly id: string;
  readonly kind: "payment";
  readonly lawId: string;
  /** The law's key: a policy question or a law series. */
  readonly key: string;
  readonly date: string;
  /** Paid to: a named person, or the place's pooled residents' account. */
  readonly recipientId: string;
  readonly named: boolean;
  /** Households the payment stands for (1 for a named household). */
  readonly households: number;
  readonly payerId: string;
  readonly amountMinor: number;
  /** The cash move's id in the journal. */
  readonly transferId: string;
  readonly what: string;
}

export interface LawServiceRecord {
  readonly id: string;
  readonly kind: "service";
  readonly lawId: string;
  readonly key: string;
  readonly date: string;
  readonly recipientId: string;
  readonly named: boolean;
  readonly what: string;
}

export interface NoLocalEffectRecord {
  readonly id: string;
  readonly kind: "no-local-effect";
  readonly lawId: string;
  readonly key: string;
  readonly date: string;
  /** The town the finding is about. */
  readonly recipientId: string;
  /** The place fact the law has nothing to act on without. */
  readonly fact: string;
  readonly why: string;
}

export type LawRecord =
  LawPaymentRecord | LawServiceRecord | NoLocalEffectRecord;

function records(api: CoreAPI) {
  return api.moduleState(LAW_EFFECTS).table("records");
}

export function putLawRecord(api: CoreAPI, row: LawRecord): void {
  records(api).put(row as unknown as ModuleRow);
}

export function lawRecordsOf(
  api: CoreAPI,
  lawId: string,
): readonly LawRecord[] {
  return records(api).query("byLaw", [lawId]) as unknown as LawRecord[];
}

export function lawRecordsTo(
  api: CoreAPI,
  recipientId: string,
): readonly LawRecord[] {
  return records(api).query("byRecipient", [
    recipientId,
  ]) as unknown as LawRecord[];
}

export function allLawRecords(api: CoreAPI): readonly LawRecord[] {
  return records(api).rows() as unknown as LawRecord[];
}
