import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { evaluateDecision } from "../../decisions";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { stableHash } from "../../ids";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { traitDefinitionFromPack } from "../../trait-packs";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import type { DecisionConsideration, EntityId, World } from "../../types";

const TRAIT = "personality-v1:facet-closeness-seeking";

function proofPlace(seed: string) {
  const states = lifePlaceStateIdentities();
  for (let index = 0; index < 200; index += 1) {
    const state =
      states[
        parseInt(stableHash(`${seed}-${index}`).slice(0, 8), 16) % states.length
      ]!;
    const locality = searchLifePlaces("", 1, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    })[0];
    if (locality) return locality;
  }
  throw new Error("No locality was drawn from the 56-place list.");
}

function confer(world: World, personId: EntityId): World {
  const trait = loadedTraitRegistry().traits.get(TRAIT)!;
  const definition = traitDefinitionFromPack(trait);
  const withDefinition: World = world.mindCatalog.tendencies[definition.id]
    ? world
    : {
        ...world,
        mindCatalog: {
          ...world.mindCatalog,
          tendencies: {
            ...world.mindCatalog.tendencies,
            [definition.id]: definition,
          },
          tendencyOrder: [...world.mindCatalog.tendencyOrder, definition.id],
        },
      };
  return recordPersonalityTendency(withDefinition, {
    stableKey: `proof:${TRAIT}:${personId}`,
    personId,
    tendencyId: definition.id,
    recordedAt: world.currentDate,
    expressionKey: "facet-closeness-seeking:high",
    strength: "strong",
    confidence: "medium",
    scopeTags: ["life:ordinary"],
    provenance: createMindProvenance("authored", {
      note: "Controlled proof of the recorded closeness-seeking trait.",
    }),
    supersedesTendencyId: null,
  });
}

const sharedDeclineReason: DecisionConsideration = {
  stableKey: "proof:shared-time-cost",
  optionKey: "decline",
  sourceType: "context:life",
  direction: "supports",
  importance: "slight",
  confidence: "high",
  explanation: "The proposed time conflicts with another commitment.",
  sourceRefs: [],
};

describe("facet-closeness-seeking in new games across all jurisdictions", () => {
  it("changes only the recorded person's contact answer beside the same reason", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    for (const state of states) {
      const seed = `proof-facet-closeness-seeking-${state.jurisdictionKey}`;
      const place = proofPlace(seed);
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
        startKind: "custom",
        startAge: 40,
        questionnaire: "skipped",
      });
      const [markedId, comparisonId] = game.world.personOrder
        .filter((id) => id !== game.playerPersonId)
        .slice(0, 2);
      expect(markedId).toBeDefined();
      expect(comparisonId).toBeDefined();
      const world = confer(game.world, markedId!);
      const decide = (actorPersonId: EntityId) => {
        const traitReasons = registeredTraitConsiderations(
          world,
          loadedTraitRegistry(),
          actorPersonId,
          `proof:${state.jurisdictionKey}`,
          "contact.answer",
        );
        const evaluation = evaluateDecision(world, {
          stableKey: `proof:${state.jurisdictionKey}:${actorPersonId}`,
          decisionType: "people.contact-answer",
          actorPersonId,
          cutoff: {
            asOfDate: world.currentDate,
            historySequenceExclusive: world.history.nextSequence,
          },
          subject: {
            kind: "context:life",
            key: "meeting-request",
            entityId: null,
          },
          options: [
            { key: "accept", label: "accept", description: "accept" },
            { key: "counter", label: "counter", description: "counter" },
            { key: "decline", label: "decline", description: "decline" },
          ],
          constraints: [],
          considerations: [sharedDeclineReason, ...traitReasons],
          perceptionIds: [],
          randomness: "none",
          retention: "ephemeral",
        });
        return { evaluation, traitReasons };
      };
      const marked = decide(markedId!);
      const comparison = decide(comparisonId!);
      expect(marked.traitReasons).toMatchObject([
        { optionKey: "accept", sourceType: "mind:personality" },
      ]);
      expect(comparison.traitReasons).toEqual([]);
      expect(marked.evaluation.selectedOptionKey).toBe("accept");
      expect(comparison.evaluation.selectedOptionKey).toBe("decline");
    }
  }, 300_000);
});
