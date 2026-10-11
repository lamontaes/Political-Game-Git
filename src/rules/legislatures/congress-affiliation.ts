import type { AggregateCongressSeatInput } from "../../simulation/living-world/congress-aggregate-outcome";
export const CONGRESS_INCUMBENCY_SHARE_BONUS = 0.03;

export function aggregateCongressAffiliation(
  input: AggregateCongressSeatInput,
): string | null {
  const incumbent = input.incumbentAffiliation;
  if (input.democraticShare === null) {
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
  if (input.incumbentSeeking && incumbent) return incumbent;
  return input.baselineAffiliation;
}
