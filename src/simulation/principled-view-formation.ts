import {
  principleView,
  principledLeaning,
} from "./governing/officeholder-principles";
import {
  applyNpcPoliticalBeliefFormation,
  evaluatePoliticalBeliefFormation,
  type PoliticalBeliefDimensions,
  type PoliticalBeliefFormationOutcome,
} from "./political-belief-formation";
import { latestPrivateBelief } from "./queries";
import type { EntityId, World } from "./types";

/**
 * A person who must act on a question they hold no view on forms one first,
 * through the one belief pipeline, from the principles they have recorded.
 *
 * Before this, a caller that found no saved view read the person's principles
 * directly and acted on that reading without saving anything, so the same
 * person could hold one view in a vote, another in a journal and none at all
 * in their history. Now the view is saved once, with its decision trace and
 * the principle records it came from, and every reader reads the saved view.
 *
 * No dice: the pipeline runs without close-choice randomness, so the same
 * saved principles give the same view in every world. A person with nothing
 * bearing on the question gets no view, and the caller treats them as
 * undecided. The controlled person decides their own mind and is never formed
 * here. A view already saved is left alone.
 */
export function formViewFromRecordedPrinciples(
  world: World,
  input: {
    readonly stableKey: string;
    readonly personId: EntityId;
    readonly propositionId: EntityId;
  },
): World {
  if (!world.people[input.personId]) return world;
  if (
    world.control.kind === "person" &&
    world.control.personId === input.personId
  )
    return world;
  if (latestPrivateBelief(world, input.personId, input.propositionId))
    return world;
  const leaning = principledLeaning(world, input.personId, input.propositionId);
  const view = principleView(world, input.personId, input.propositionId);
  if (leaning.score === 0 || !view) return world;
  const firm: PoliticalBeliefDimensions = {
    conviction: "moderate",
    salience: view.salience,
    flexibility: "open",
  };
  const tentative: PoliticalBeliefDimensions = {
    ...firm,
    conviction: "tentative",
  };
  const byOutcome: Partial<
    Record<PoliticalBeliefFormationOutcome, PoliticalBeliefDimensions>
  > = {
    support: firm,
    opposition: firm,
    "tentative-support": tentative,
    "tentative-opposition": tentative,
    conflicted: firm,
  };
  const proposal = evaluatePoliticalBeliefFormation(world, {
    stableKey: input.stableKey,
    personId: input.personId,
    propositionId: input.propositionId,
    randomness: "none",
    beliefDimensionsByOutcome: byOutcome,
    factors: [
      {
        stableKey: `recorded-principles:${input.propositionId}`,
        favors: leaning.score > 0 ? "support" : "opposition",
        sourceType: "belief:political-principle",
        importance: "strong",
        confidence: "high",
        explanation:
          "The question bears on principles the person already holds.",
        sourceRefs: leaning.recordIds.map((principleRecordId) => ({
          kind: "political-principle" as const,
          principleRecordId,
        })),
      },
    ],
  });
  return applyNpcPoliticalBeliefFormation(world, proposal);
}
