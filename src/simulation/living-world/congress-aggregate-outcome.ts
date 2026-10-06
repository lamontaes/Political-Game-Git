/**
 * The unobserved congressional race's party-level outcome. A saved seat lean is
 * the only voter-view input available to this compact fallback. A recorded
 * contest with actual candidates remains authoritative elsewhere.
 */
export interface AggregateCongressSeatInput {
  readonly democraticShare: number | null;
  readonly baselineAffiliation: string | null;
  readonly incumbentAffiliation: string | null;
  readonly incumbentSeeking: boolean;
}

// GAME ESTIMATE: three percentage points follows the compact model's admitted
// seat-lean scale and is kept separate from recorded seat data.
export const CONGRESS_INCUMBENCY_SHARE_BONUS = 0.03;

export function aggregateCongressAffiliation(
  input: AggregateCongressSeatInput,
): string | null {
  const incumbent = input.incumbentAffiliation;
  if (input.democraticShare === null) {
    // No two-party margin exists for some admitted calibration rows. Retain
    // their recorded affiliation instead of inventing a neutral share.
    return input.baselineAffiliation ?? incumbent;
  }
  const share = input.democraticShare;
  if (!Number.isFinite(share) || share < 0 || share > 1) return null;
  const adjusted =
    share +
    (input.incumbentSeeking && incumbent === "democratic"
      ? CONGRESS_INCUMBENCY_SHARE_BONUS
      : input.incumbentSeeking && incumbent === "republican"
        ? -CONGRESS_INCUMBENCY_SHARE_BONUS
        : 0);
  if (adjusted > 0.5) return "democratic";
  if (adjusted < 0.5) return "republican";
  // An exact modeled tie has no vote winner. A known sitting or prior party
  // breaks only the compact party projection, not an actual recorded contest.
  if (input.incumbentSeeking && incumbent) return incumbent;
  return input.baselineAffiliation;
}
