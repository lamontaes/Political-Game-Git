import { evaluateDecision } from "../decisions";
import { registeredTraitConsiderations } from "../trait-readings";
import { traitRegistryFor } from "../trait-registry";
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
  const options = new Set(context.options.map(({ key }) => key));
  const traitConsiderations = registeredTraitConsiderations(
    world,
    traitRegistryFor(world),
    context.actorPersonId,
    context.stableKey,
    context.decisionType,
  ).filter(
    (consideration) =>
      options.has(consideration.optionKey) &&
      // Temperament can strengthen a position already supported by evidence.
      // It cannot supply the missing policy view or decide an unknown measure.
      (consideration.optionKey === "withhold" ||
        context.considerations.some(
          (reason) =>
            reason.optionKey === consideration.optionKey &&
            reason.direction === "supports" &&
            reason.sourceType !== "mind:personality",
        )),
  );
  const evaluation = evaluateDecision(world, {
    ...context,
    considerations: [...context.considerations, ...traitConsiderations],
  });
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
