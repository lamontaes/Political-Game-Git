import type { HouseholdLoanKind, IsoDate } from "../../simulation/types";
import type { LawInForce } from "../../simulation/governing/law-in-force";
export interface ConsumerCapFacts {
  readonly law: LawInForce | null;
  readonly coverage: { readonly values: readonly string[] } | null;
  readonly term: { readonly value: number } | null;
}
export const CONSUMER_LOAN_CAP_QUESTION =
  "us-federal-positions:monetary-financial.cap-consumer-loan-interest";

export function consumerLoanCapAt(
  facts: ConsumerCapFacts,
  kind: HouseholdLoanKind,
  _onDate: IsoDate,
) {
  void _onDate;
  const law = facts.law;
  if (!law) return null;
  const coverage = facts.coverage;
  if (!coverage?.values.includes(kind)) return null;
  const term = facts.term;
  return term && Number.isFinite(term.value) && term.value >= 0
    ? { capBasisPoints: term.value, measureId: law.measureId }
    : null;
}
