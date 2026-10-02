import { isEligibleVoterIn } from "../../src/simulation/issue-record";
import {
  createFormationContext,
  recordPrivateBelief,
} from "../../src/simulation/politics";
import type { EntityId, World } from "../../src/simulation/types";

/** Fixture electors express the specified saved choices; entrant standing
 * supplies no votes. These are inputs to the production person decision. */
export function recordPrimaryFixtureViews(
  world: World,
  jurisdictionId: EntityId,
  candidates: readonly EntityId[],
  votes: readonly number[],
): World {
  const voters = world.personOrder.filter(
    (id) =>
      !candidates.includes(id) &&
      isEligibleVoterIn(world, id, jurisdictionId, world.currentDate),
  );
  if (voters.length < votes.reduce((sum, count) => sum + count, 0))
    throw new Error("Insufficient actual eligible fixture electors");
  let next = world;
  let cursor = 0;
  candidates.forEach((candidate, index) => {
    for (let vote = 0; vote < (votes[index] ?? 0); vote++) {
      const voter = voters[cursor++]!;
      next = recordPrivateBelief(next, {
        stableKey: `fixture-elector:${voter}:${candidate}`,
        personId: voter,
        propositionId: null,
        subject: { kind: "official", personId: candidate },
        formedAt: world.currentDate,
        position: "support",
        conviction: "strong",
        salience: "high",
        flexibility: "negotiable",
        rationale:
          "This fixture elector supports this candidate's recorded work.",
        formation: createFormationContext("reflection:initial"),
        supersedesBeliefId: null,
      });
    }
  });
  return next;
}
