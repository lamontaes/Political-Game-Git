import type { HouseDelegateSeat } from "../../simulation/living-world/house-delegates";
export interface AggregateCongressSeatInput {
  readonly democraticShare: number | null;
  readonly baselineAffiliation: string | null;
  readonly incumbentAffiliation: string | null;
  readonly incumbentSeeking: boolean;
}

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
export function twoCaucusShare(row: {
  readonly democraticPercent: number;
  readonly republicanPercent: number;
}): number {
  return (
    row.democraticPercent / (row.democraticPercent + row.republicanPercent)
  );
}

export function projectedCaucus(
  seat: HouseDelegateSeat,
  incumbentCaucus: string | null,
  incumbentSeeking: boolean,
): "democratic" | "republican" {
  const projected = aggregateCongressAffiliation({
    democraticShare: seat.lean.democraticShare,
    baselineAffiliation: seat.lean.baselineCaucus,
    incumbentAffiliation: incumbentCaucus,
    incumbentSeeking,
  });
  return projected === "democratic" || projected === "republican"
    ? projected
    : seat.lean.baselineCaucus;
}
export function houseDelegateProjectedCaucus(
  stateUsps: string,
  seat: HouseDelegateSeat | undefined,
  incumbentCaucus: string | null,
  incumbentSeeking: boolean,
) {
  if (!seat) throw new Error(`No nonvoting seat for ${stateUsps}.`);
  return projectedCaucus(seat, incumbentCaucus, incumbentSeeking);
}

// stopgapId: "SG-P14-elections-incumbency-share"
