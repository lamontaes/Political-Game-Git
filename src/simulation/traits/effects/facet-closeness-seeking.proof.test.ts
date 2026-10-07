import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { evaluateDecision } from "../../decisions";
import { stableHash } from "../../ids";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import {
  BUILT_IN_TRAIT_DECISIONS,
  loadedTraitRegistry,
} from "../../trait-registry";
import { leansForDecision, traitDefinitionFromPack } from "../../trait-packs";
import { registeredTraitConsiderations } from "../../trait-readings";
import type { DecisionConsideration, EntityId, World } from "../../types";

const TRAIT = "personality-v1:facet-closeness-seeking";
const DECISION = "people.date-answer";

function randomPlace(seed: string): { placeKey: string; label: string } {
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
    if (locality) {
      return {
        placeKey: locality.key,
        label: `${locality.displayName}, US-${state.usps}`,
      };
    }
  }
  throw new Error("No locality was drawn from the 56-place list.");
}

function giveClosenessSeeking(world: World, personId: EntityId): World {
  const trait = loadedTraitRegistry().traits.get(TRAIT)!;
  const definition = traitDefinitionFromPack(trait);
  const withCatalog: World = {
    ...world,
    mindCatalog: {
      ...world.mindCatalog,
      tendencies: {
        ...world.mindCatalog.tendencies,
        [definition.id]: definition,
      },
      tendencyOrder: world.mindCatalog.tendencyOrder.includes(definition.id)
        ? world.mindCatalog.tendencyOrder
        : [...world.mindCatalog.tendencyOrder, definition.id],
    },
  };
  return recordPersonalityTendency(withCatalog, {
    stableKey: `proof:${TRAIT}:${personId}`,
    personId,
    tendencyId: definition.id,
    recordedAt: world.currentDate,
    expressionKey: trait.poles.high.key,
    strength: "strong",
    confidence: "medium",
    scopeTags: ["life:ordinary", "relationship:choice"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof of the closeness-seeking trait.",
    }),
    supersedesTendencyId: null,
  });
}

function chooseDateAnswer(
  world: World,
  actorPersonId: EntityId,
  baseline: DecisionConsideration,
): string | null {
  const declaration = BUILT_IN_TRAIT_DECISIONS.find(
    ({ id }) => id === DECISION,
  )!;
  const considerations = [
    baseline,
    ...registeredTraitConsiderations(
      world,
      loadedTraitRegistry(),
      actorPersonId,
      `proof:${actorPersonId}`,
      DECISION,
    ),
  ];
  return evaluateDecision(world, {
    stableKey: `proof:${DECISION}:${actorPersonId}`,
    decisionType: DECISION,
    actorPersonId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:life", key: "proof-date", entityId: null },
    options: declaration.options.map((key) => ({
      key,
      label: key,
      description: `The person chooses ${key}.`,
    })),
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  }).selectedOptionKey;
}

describe("the closeness-seeking difference in a random new game", () => {
  it("argues for closeness in each relationship decision it applies to", () => {
    const registry = loadedTraitRegistry();
    expect(
      leansForDecision(registry, "people.date-answer").filter(
        ({ trait }) => trait === TRAIT,
      ),
    ).toMatchObject([{ option: "accept", pole: "high" }]);
    expect(
      leansForDecision(registry, "people.couple-answer").filter(
        ({ trait }) => trait === TRAIT,
      ),
    ).toMatchObject([{ option: "accept", pole: "high" }]);
    expect(
      leansForDecision(registry, "people.couple-stage").filter(
        ({ trait }) => trait === TRAIT,
      ),
    ).toMatchObject([{ option: "stay", pole: "high" }]);
  });

  it("changes a person's date answer against a second person in the same game", () => {
    const seed = "s42-proof-facet-closeness-seeking";
    const place = randomPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.placeKey,
      startKind: "custom",
      startAge: 40,
      questionnaire: "skipped",
    });
    const registry = loadedTraitRegistry();
    const candidates = game.world.personOrder.filter(
      (id) => id !== game.playerPersonId,
    );
    const withoutOtherDateLeans = candidates.filter(
      (personId) =>
        registeredTraitConsiderations(
          game.world,
          registry,
          personId,
          `proof:${personId}`,
          DECISION,
        ).length === 0,
    );
    expect(withoutOtherDateLeans.length).toBeGreaterThanOrEqual(2);
    const [closenessSeekingPerson, comparisonPerson] = withoutOtherDateLeans;
    expect(closenessSeekingPerson).toBeDefined();
    expect(comparisonPerson).toBeDefined();

    const baseline: DecisionConsideration = {
      stableKey: "proof:shared-preference-to-decline",
      optionKey: "decline",
      sourceType: "context:ordinary-practice",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "They prefer to decline this invitation.",
      sourceRefs: [],
    };
    const world = giveClosenessSeeking(game.world, closenessSeekingPerson!);
    const results = {
      place: place.label,
      seed,
      closenessSeekingPerson: world.people[closenessSeekingPerson!]!.givenName,
      comparisonPerson: world.people[comparisonPerson!]!.givenName,
      withTrait: chooseDateAnswer(world, closenessSeekingPerson!, baseline),
      withoutTrait: chooseDateAnswer(world, comparisonPerson!, baseline),
    };
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(results)}\n`);
    expect(results.withTrait).toBe("accept");
    expect(results.withoutTrait).toBe("decline");
  });
});
