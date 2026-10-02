import type {
  DecisionConsideration,
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
