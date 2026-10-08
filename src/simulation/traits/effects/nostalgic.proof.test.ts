import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { evaluateDecision, recordDurableDecisionTrace } from "../../decisions";
import { stableHash } from "../../ids";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { latestPersonalityTendenciesForPerson } from "../../queries";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { DecisionConsideration, EntityId, World } from "../../types";

const TRAIT_ID = "personality-v1:facet-nostalgic";
const DECISION_TYPE = "people.contact-answer";
const SEED = "tr5-nostalgic-act-proof";

function randomPlace(seed: string): { placeKey: string } {
  const states = lifePlaceStateIdentities();
  const state =
    states[parseInt(stableHash(seed).slice(0, 8), 16) % states.length]!;
  const locality = searchLifePlaces("", 1, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  })[0];
  if (!locality)
    throw new Error(`No locality found in ${state.jurisdictionKey}.`);
  return { placeKey: locality.key };
}

function withValue(world: World, personId: EntityId, value: number): World {
  const trait = loadedTraitRegistry().traits.get(TRAIT_ID)!;
  const definition = traitDefinitionFromPack(trait);
  const catalog = world.mindCatalog.tendencies[definition.id]
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
  const step = trait.scale.steps.find(
    (candidate) => candidate.magnitude === Math.abs(value),
  );
  if (!step)
    throw new Error(`${TRAIT_ID} has no magnitude ${Math.abs(value)}.`);
  const previous = latestPersonalityTendenciesForPerson(catalog, personId).find(
    (record) => record.tendencyId === definition.id,
  );
  return recordPersonalityTendency(catalog, {
    stableKey: `${SEED}:${personId}:${value}`,
    personId,
    tendencyId: definition.id,
    recordedAt: catalog.currentDate,
    expressionKey: value > 0 ? trait.poles.high.key : trait.poles.low.key,
    strength: step.strength,
    confidence: "medium",
    scopeTags: ["life:ordinary"],
    provenance: createMindProvenance("authored", {
      note: "Seeded proof of the shared decision option and trait-pull table.",
    }),
    supersedesTendencyId: previous?.id ?? null,
  });
}

function choose(world: World, personId: EntityId, value: number) {
  const baseline: DecisionConsideration = {
    stableKey: `${SEED}:${personId}:schedule`,
    optionKey: "decline",
    sourceType: "context:schedule",
    direction: "supports",
    importance: "slight",
    confidence: "medium",
    explanation: "They have other demands on their time.",
    sourceRefs: [],
  };
  const withRecordedValue = withValue(world, personId, value);
  const evaluation = evaluateDecision(withRecordedValue, {
    stableKey: `${SEED}:${personId}:${value}:contact-answer`,
    decisionType: DECISION_TYPE,
    actorPersonId: personId,
    cutoff: {
      asOfDate: withRecordedValue.currentDate,
      historySequenceExclusive: withRecordedValue.history.nextSequence,
    },
    subject: { kind: "context:life", key: "contact-request", entityId: null },
    options: [
      { key: "accept", label: "Accept", description: "Meet the person." },
      { key: "decline", label: "Decline", description: "Keep the day open." },
    ],
    constraints: [],
    considerations: [baseline],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  const traced = recordDurableDecisionTrace(withRecordedValue, evaluation);
  return {
    choice: evaluation.selectedOptionKey,
    trace: traced.history.decisionTraces.at(-1)!,
  };
}

describe("the nostalgic trait through the shared act table", () => {
  it("changes the same seeded person's contact choice at +2 versus -2", () => {
    const place = randomPlace(SEED);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      placeKey: place.placeKey,
      startKind: "custom",
      startAge: 40,
      questionnaire: "skipped",
    });
    const personId = game.world.personOrder.find(
      (id) => id !== game.playerPersonId,
    )!;
    const positive = choose(game.world, personId, 2);
    const negative = choose(game.world, personId, -2);

    expect(positive.choice).toBe("accept");
    expect(negative.choice).toBe("decline");
    expect(positive.trace.context.considerations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stableKey: expect.stringContaining(":act:"),
          sourceRefs: expect.arrayContaining([
            expect.objectContaining({ kind: "personality-tendency" }),
          ]),
        }),
      ]),
    );
    expect(negative.trace.context.considerations).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stableKey: expect.stringContaining(":act:"),
        }),
      ]),
    );
  });
});
