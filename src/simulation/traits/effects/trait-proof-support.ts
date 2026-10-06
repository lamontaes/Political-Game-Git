import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { evaluateDecision } from "../../decisions";
import { stableHash } from "../../ids";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { personName } from "../../people";
import { registeredTraitConsiderations } from "../../trait-readings";
import {
  BUILT_IN_TRAIT_DECISIONS,
  loadedTraitRegistry,
} from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId, World } from "../../types";

/** One person's choice with and without a recorded tendency. */
export interface TraitProof {
  readonly place: string;
  readonly seed: string;
  readonly person: string;
  readonly without: string | null;
  readonly high: { choice: string | null; reason: string | null };
  readonly low: { choice: string | null; reason: string | null };
}

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

function withTendency(
  world: World,
  personId: EntityId,
  traitId: string,
  pole: "high" | "low",
): World {
  const trait = loadedTraitRegistry().traits.get(traitId)!;
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
    stableKey: `proof:${traitId}:${pole}:${personId}`,
    personId,
    tendencyId: definition.id,
    recordedAt: world.currentDate,
    expressionKey: trait.poles[pole].key,
    strength: "strong",
    confidence: "medium",
    scopeTags: ["life:ordinary", "career:choice"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof of the trait reader.",
    }),
    supersedesTendencyId: null,
  });
}

/**
 * Takes one person from a random new game and has them decide the same
 * decision three ways: with no recorded tendency, with the trait's high pole
 * and with its low pole. The choice and its reason come from the shared
 * decision engine and the registered trait readings.
 */
export function proveTraitDifference(
  traitId: string,
  decisionId: string,
  seed: string,
): TraitProof {
  const place = randomPlace(seed);
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: place.placeKey,
    startKind: "custom",
    startAge: 40,
    questionnaire: "skipped",
  });
  const personId = game.world.personOrder.find(
    (id) => id !== game.playerPersonId,
  )!;
  const declaration = BUILT_IN_TRAIT_DECISIONS.find(
    ({ id }) => id === decisionId,
  )!;
  const decide = (world: World) => {
    const considerations = registeredTraitConsiderations(
      world,
      loadedTraitRegistry(),
      personId,
      `proof:${decisionId}`,
      decisionId,
    );
    const evaluation = evaluateDecision(world, {
      stableKey: `proof:${decisionId}:${personId}:${considerations.length}:${considerations[0]?.optionKey ?? "none"}`,
      decisionType: decisionId,
      actorPersonId: personId,
      cutoff: {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      },
      subject: { kind: "context:life", key: "proof-subject", entityId: null },
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
    });
    return {
      choice: evaluation.selectedOptionKey,
      reason: considerations[0]?.explanation ?? null,
    };
  };
  return {
    place: place.label,
    seed,
    person: personName(game.world.people[personId]!),
    without: decide(game.world).choice,
    high: decide(withTendency(game.world, personId, traitId, "high")),
    low: decide(withTendency(game.world, personId, traitId, "low")),
  };
}
