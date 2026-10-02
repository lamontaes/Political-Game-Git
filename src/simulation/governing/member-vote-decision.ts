import { evaluateDecision } from "../decisions";
import type {
  DecisionContext,
  DecisionEvaluation,
  LegislativeMemberDisposition,
  World,
} from "../types";

/**
 * The chamber's existing member chooser, also used by a bargaining colleague.
 * Callers retain their recorded considerations, context and trace retention.
 */
export function decideMemberVote(
  world: World,
  context: DecisionContext,
): {
  readonly evaluation: DecisionEvaluation;
  readonly disposition: LegislativeMemberDisposition;
} {
  const evaluation = evaluateDecision(world, context);
  const selected = evaluation.selectedOptionKey ?? "withhold";
  return {
    evaluation,
    disposition:
      selected === "vote-yea"
        ? "yea"
        : selected === "vote-nay"
          ? "nay"
          : "present-not-voting",
  };
}
