import { describe, expect, it } from "vitest";

import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { evaluateDecision } from "../../decisions";
import { ensureTraitDefinition } from "../../people-traits";
import { personName } from "../../people";
import { registeredTraitConsiderations } from "../../trait-readings";
import {
  loadedTraitRegistry,
  resetLoadedTraitRegistry,
} from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId, World } from "../../types";
import { ANOTHER_TERM_DECISION } from "../../careers/another-term-decision";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { drawRandomPlace } from "../../../../tests/support/random-place";

const TRAIT = "personality-v1:facet-zealous";

function conferZeal(world: World, personId: EntityId): World {
  const trait = loadedTraitRegistry().traits.get(TRAIT);
  if (!trait) throw new Error(`The build does not load ${TRAIT}.`);
  const prepared = ensureTraitDefinition(world, trait);
  const definition = traitDefinitionFromPack(trait);
  return recordPersonalityTendency(prepared, {
    stableKey: `proof:${TRAIT}:${personId}`,
    personId,
    tendencyId: definition.id,
    recordedAt: prepared.currentDate,
    expressionKey: trait.poles.high.key,
    strength: "strong",
    confidence: "high",
    scopeTags: ["career:choice"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof of the registered zealous reader.",
    }),
    supersedesTendencyId: null,
  });
}

describe("the zealous trait reader", () => {
  it("reaches a named person's decision in a random-place new game", () => {
    resetLoadedTraitRegistry();
    const seed = "session-84-zealous-reader";
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startKind: "custom",
      placeKey: place.key,
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
    });
    const zealousPersonId = game.world.personOrder.find(
      (id) => id !== game.playerPersonId,
    );
    const comparisonPersonId = game.world.personOrder.find(
      (id) => id !== game.playerPersonId && id !== zealousPersonId,
    );
    if (!zealousPersonId || !comparisonPersonId) {
      throw new Error("The generated world needs two comparison people.");
    }
    const world = conferZeal(game.world, zealousPersonId);

    const zealous = registeredTraitConsiderations(
      world,
      loadedTraitRegistry(),
      zealousPersonId,
      "another-term:proof",
      ANOTHER_TERM_DECISION.id,
    );
    const comparison = registeredTraitConsiderations(
      world,
      loadedTraitRegistry(),
      comparisonPersonId,
      "another-term:proof",
      ANOTHER_TERM_DECISION.id,
    );

    expect(zealous).toEqual([
      expect.objectContaining({
        optionKey: "seek",
        explanation:
          "They pursue their public commitments with unusual intensity.",
      }),
    ]);
    expect(comparison).toEqual([]);
    const decide = (
      personId: EntityId,
      traitReasons: typeof zealous,
      stableKey: string,
    ) =>
      evaluateDecision(world, {
        stableKey,
        decisionType: ANOTHER_TERM_DECISION.id,
        actorPersonId: personId,
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        },
        subject: {
          kind: "context:life",
          key: "public-service",
          entityId: null,
        },
        options: [
          {
            key: "seek",
            label: "Run again",
            description: "Seek another term.",
          },
          {
            key: "step-down",
            label: "Step down",
            description: "Leave office.",
          },
        ],
        constraints: [],
        considerations: [
          {
            stableKey: `${stableKey}:ordinary-cost`,
            optionKey: "step-down",
            sourceType: "context:life",
            direction: "supports",
            importance: "slight",
            confidence: "medium",
            explanation: "Another term would take time from the rest of life.",
            sourceRefs: [],
          },
          ...traitReasons,
        ],
        perceptionIds: [],
        randomness: "none",
        retention: "durable",
      });
    const zealousDecision = decide(
      zealousPersonId,
      zealous,
      "another-term:zealous-proof",
    );
    const comparisonDecision = decide(
      comparisonPersonId,
      comparison,
      "another-term:comparison-proof",
    );
    expect(zealousDecision.selectedOptionKey).toBe("seek");
    expect(comparisonDecision.selectedOptionKey).toBe("step-down");
    const zealousPerson = world.people[zealousPersonId]!;
    const comparisonPerson = world.people[comparisonPersonId]!;
    expect(personName(zealousPerson)).toBeTruthy();
    console.info("Session 84 zealous generated-world proof", {
      seed,
      worldId: world.id,
      simulationDate: world.currentDate,
      place: place.displayName,
      zealousPersonId,
      zealousPersonName: personName(zealousPerson),
      comparisonPersonId,
      comparisonPersonName: personName(comparisonPerson),
      decision: ANOTHER_TERM_DECISION.id,
      zealousChoice: zealousDecision.selectedOptionKey,
      comparisonChoice: comparisonDecision.selectedOptionKey,
      selectedReason: zealous[0]!.explanation,
    });
  });
});
