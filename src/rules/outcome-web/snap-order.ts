/** Existing removal priority over recorded household facts; not an enrollment writer. */
export interface SnapCandidateFacts {
  readonly householdId: string;
  readonly size: number;
  readonly incomeToThreshold: number | null;
  readonly monthlyWorkHours: number | null;
}
// STOPGAP RULES4-OW-009: ordering retained; population-target allocation remains in the legacy resolver.
export function rankRemoval(
  a: SnapCandidateFacts,
  b: SnapCandidateFacts,
): number {
  const ratio =
    (b.incomeToThreshold ?? Number.POSITIVE_INFINITY) -
    (a.incomeToThreshold ?? Number.POSITIVE_INFINITY);
  return (
    ratio ||
    a.size - b.size ||
    (a.monthlyWorkHours ?? Number.POSITIVE_INFINITY) -
      (b.monthlyWorkHours ?? Number.POSITIVE_INFINITY) ||
    a.householdId.localeCompare(b.householdId)
  );
}
