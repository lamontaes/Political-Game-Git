import type {
  DecisionConsideration,
  DecisionContext,
  DecisionImportance,
  MindConfidence,
} from "./types";

const IMPORTANCE_WEIGHT: Record<DecisionImportance, number> = {
  slight: 1,
  moderate: 2,
  strong: 4,
  decisive: 6,
};
const CONFIDENCE_WEIGHT: Record<MindConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/** The existing consideration score, shared by evaluation and saved-rank checks. */
export function decisionConsiderationScore(
  consideration: Pick<
    DecisionConsideration,
    "importance" | "confidence" | "direction"
  >,
): number {
  const magnitude =
    IMPORTANCE_WEIGHT[consideration.importance] *
    CONFIDENCE_WEIGHT[consideration.confidence];
  return consideration.direction === "supports" ? magnitude : -magnitude;
}

/** Compare actor reasons first, then an admitted exact peer mean. Never select
 * by key or collapse a fractional estimate into the importance table. */
export function compareDecisionOptionScores(
  context: DecisionContext,
  leftOptionKey: string,
  rightOptionKey: string,
): number {
  const score = (key: string) =>
    context.considerations
      .filter((item) => item.optionKey === key)
      .reduce((total, item) => total + decisionConsiderationScore(item), 0);
  const actorDifference = score(leftOptionKey) - score(rightOptionKey);
  if (actorDifference !== 0) return actorDifference;
  const mean = (key: string) =>
    context.peerEstimates?.find((row) => row.optionKey === key)?.mean ?? 0;
  return mean(leftOptionKey) - mean(rightOptionKey);
}
