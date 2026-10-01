// Preserved pre-A79 reference evaluator for controlled parity tests only.
// Production callers must use a saved constitutional proposal and shared vote.
import { evaluateDecision } from "../../src/simulation/decisions";
import { currentHistoricalCutoff } from "../../src/simulation/queries";
import { constitutionalMemberConsiderations } from "../../src/simulation/governing/article-v";
import type {
  DecisionConsideration,
  EntityId,
  World,
} from "../../src/simulation/types";
const VOTE_OPTIONS = [
  { key: "vote-yea", label: "Vote yes", description: "Propose it." },
  { key: "vote-nay", label: "Vote no", description: "Leave it out." },
] as const;
export function legacyPolicyMemberBallot(
  world: World,
  stableKey: string,
  personId: EntityId,
  propositionId: EntityId,
  answer: "yes" | "no" = "yes",
  extra: readonly DecisionConsideration[] = [],
): { readonly ballot: "yea" | "nay"; readonly reason: string } {
  const considerations = constitutionalMemberConsiderations(
    world,
    personId,
    propositionId,
    answer,
    extra,
  );
  const evaluation = evaluateDecision(world, {
    stableKey,
    decisionType: "governing.constitutional-amendment-vote",
    actorPersonId: personId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:constitutional-amendment",
      key: stableKey,
      entityId: null,
    },
    options: [...VOTE_OPTIONS],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  const ballot = evaluation.selectedOptionKey === "vote-yea" ? "yea" : "nay";
  const reason =
    considerations.find(
      (consideration) => consideration.optionKey === `vote-${ballot}`,
    )?.stableKey ?? "member:no-reason";
  return { ballot, reason };
}
