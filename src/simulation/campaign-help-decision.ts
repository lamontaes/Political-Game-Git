import { evaluateDecision } from "./decisions";
import type { DecisionConsideration, EntityId, World } from "./types";

export interface CampaignHelpDecisionInput {
  readonly stableKey: string;
  readonly decisionType: string;
  readonly actorPersonId: EntityId;
  readonly subjectKey: string;
  readonly options: readonly {
    readonly key: string;
    readonly label: string;
    readonly description: string;
  }[];
  readonly considerations: readonly DecisionConsideration[];
}

/** Shared decision engine for chapter support requests and personal asks to help. */
export function evaluateCampaignHelpDecision(
  world: World,
  input: CampaignHelpDecisionInput,
) {
  return evaluateDecision(world, {
    stableKey: input.stableKey,
    decisionType: input.decisionType,
    actorPersonId: input.actorPersonId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:life",
      key: input.subjectKey,
      entityId: null,
    },
    options: input.options,
    constraints: [],
    considerations: input.considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
}
