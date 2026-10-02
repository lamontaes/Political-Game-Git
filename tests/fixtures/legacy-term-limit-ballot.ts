// Frozen former caller for before/after parity only. Production votes must use
// the saved proposal and actual members through decideChamberVote.
import {
  considerationScore,
  evaluateDecision,
} from "../../src/simulation/decisions";
import { currentHistoricalCutoff } from "../../src/simulation/queries";
import {
  termLimitConsiderations,
  type TermLimitHolder,
} from "../../src/simulation/living-world/federal-reform";
import type { Voter } from "../../src/simulation/governing/article-v";
import type {
  World,
  EntityId,
  DecisionConsideration,
} from "../../src/simulation/types";

const PRESIDENT: TermLimitHolder = {
  title: "President",
  decisionType: "governing.presidential-term-limit-vote",
  keyWord: "president",
};

/**
 * How a member votes on an officeholder's term limit. HAND-SET weights on the
 * shared decision scale: the officeholder's party "strong", a relationship at
 * its recorded strength, the constitutional bar "moderate".
 */
export function legacyTermLimitBallot(
  world: World,
  stableKey: string,
  voter: Voter,
  cause: {
    readonly direction: "extend" | "restore";
    readonly holderPersonId: EntityId;
  },
  holder: TermLimitHolder = PRESIDENT,
  extra: readonly DecisionConsideration[] = [],
): { readonly ballot: "yea" | "nay" | "absent"; readonly reason: string } {
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  if (voter.personId === player)
    return { ballot: "absent", reason: "member:player-not-asked" };
  const considerations = termLimitConsiderations(
    world,
    voter,
    cause,
    holder,
    extra,
  );
  const evaluation = evaluateDecision(world, {
    stableKey,
    decisionType: holder.decisionType,
    actorPersonId: voter.personId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:constitutional-amendment",
      key: stableKey,
      entityId: null,
    },
    options: [
      { key: "vote-yea", label: "Vote yes", description: "Propose it." },
      { key: "vote-nay", label: "Vote no", description: "Leave it out." },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  const ballot = evaluation.selectedOptionKey === "vote-yea" ? "yea" : "nay";
  const reason =
    considerations
      .filter((c) => c.optionKey === `vote-${ballot}`)
      .sort(
        (a, b) =>
          Math.abs(considerationScore(b)) - Math.abs(considerationScore(a)),
      )[0]?.stableKey ?? "member:no-reason";
  return { ballot, reason };
}
