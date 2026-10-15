import table from "../../../data/research/justice/time-to-disposition-2026.json" with { type: "json" };

/** Where a case's timing came from, shown to nobody but kept on the record. */
export type ProsecutionTimingBasis = "SOURCED" | "ESTIMATED FROM AVERAGE";

export interface ProsecutionTiming {
  /** Days from a referral to the prosecutors' decision to charge or not. */
  readonly chargeDecisionDays: number;
  /** Days from the charge to the plea or trial, and from a mistrial to the retrial. */
  readonly resolveAfterDays: number;
  readonly resolveBasis: ProsecutionTimingBasis;
}

interface PlaceRow {
  readonly status: string;
  readonly resolveAfterDays?: number;
}

const places = table.places as unknown as Readonly<Record<string, PlaceRow>>;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const low = sorted[middle - 1] ?? 0;
  const high = sorted[middle] ?? 0;
  return Math.round(sorted.length % 2 === 0 ? (low + high) / 2 : high);
}

/**
 * ESTIMATED FROM AVERAGE: the median of the places whose figure was read from a
 * court's own report, computed here from the data rather than set by hand.
 */
export const NATIONAL_RESOLVE_AFTER_DAYS: number = median(
  Object.values(places).flatMap((row) =>
    row.status === "sourced" && row.resolveAfterDays !== undefined
      ? [row.resolveAfterDays]
      : [],
  ),
);

/**
 * ESTIMATED FROM AVERAGE: no place's days from referral to charging decision
 * were read yet (research request criminal-time-to-disposition), so every
 * place uses the one labeled estimate.
 */
export const ESTIMATED_CHARGE_DECISION_DAYS: number =
  table.chargeDecisionDays.days;

/**
 * The days a case in this state takes. The state key is the case's own
 * (`courtCase.stateKey`, "US-XX"); a place with no read figure, or a case
 * with no state, uses the labeled national estimate. A source reports totals;
 * it never picks one case's day.
 */
export function prosecutionTimingFor(
  stateKey: string | null,
): ProsecutionTiming {
  const row = stateKey ? places[stateKey] : undefined;
  if (row?.status === "sourced" && row.resolveAfterDays !== undefined)
    return {
      chargeDecisionDays: ESTIMATED_CHARGE_DECISION_DAYS,
      resolveAfterDays: row.resolveAfterDays,
      resolveBasis: "SOURCED",
    };
  return {
    chargeDecisionDays: ESTIMATED_CHARGE_DECISION_DAYS,
    resolveAfterDays: NATIONAL_RESOLVE_AFTER_DAYS,
    resolveBasis: "ESTIMATED FROM AVERAGE",
  };
}
