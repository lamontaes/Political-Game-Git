import type {
  DecisionConsideration,
  DecisionImportance,
  MindConfidence,
} from "../../simulation/types";
/** Legacy score used only to rank recorded reasons; actor selection remains the shared chooser's boundary. */
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

export function considerationScore(
  consideration: Pick<
    DecisionConsideration,
    "importance" | "confidence" | "direction" | "weightScale"
  >,
): number {
  const magnitude =
    IMPORTANCE_WEIGHT[consideration.importance] *
    CONFIDENCE_WEIGHT[consideration.confidence] *
    (consideration.weightScale ?? 1);
  return consideration.direction === "supports" ? magnitude : -magnitude;
}
