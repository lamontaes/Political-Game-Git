import { policyOutcomeLinks } from "../policy-semantics";
import {
  placeOutcomeAt,
  placeOutcomeRecordId,
} from "../outcome-web/place-outcome-store";
import type { EntityId, World } from "../types";
import type { PoliticalBeliefFormationFactor } from "../political-belief-formation";

export function politicalOutcomeFactors(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  exposureId: EntityId,
): readonly PoliticalBeliefFormationFactor[] {
  const person = world.people[personId];
  const proposition = world.policyCatalog.propositions[propositionId];
  if (!person || !proposition) return [];
  return policyOutcomeLinks(proposition.stableKey).flatMap((link) => {
    if (link.status !== "built" || link.size === null) return [];
    const outcome = placeOutcomeAt(
      world,
      link.to,
      person.homeJurisdictionId,
      world.currentDate,
    );
    const cause = outcome?.causes.find((entry) => entry.key === link.key);
    if (!outcome || !cause || cause.factor === 1) return [];
    const alignedChange = Math.log(cause.factor) * Math.sign(link.size);
    const magnitude = Math.abs(Math.log(cause.factor));
    return [
      {
        stableKey: `place-outcome:${exposureId}:${link.key}:${placeOutcomeRecordId(outcome)}`,
        favors: alignedChange > 0 ? "support" : "opposition",
        sourceType: "information:place-outcome",
        importance: "strong",
        confidence: "high",
        weightScale: Math.tanh(magnitude),
        explanation: `outcome|${link.to}|${alignedChange > 0 ? "up" : "down"}`,
        sourceRefs: [
          {
            kind: "place-outcome",
            outcomeRecordId: placeOutcomeRecordId(outcome),
          },
        ],
      },
    ];
  });
}

export function hasPoliticalOutcomeFactor(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
): boolean {
  return (
    politicalOutcomeFactors(world, personId, propositionId, "eligibility")
      .length > 0
  );
}
