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
import type { DecisionConsideration, EntityId, World } from "../../types";

/** One person's choice with and without a recorded tendency. */
export interface TraitProof {
  readonly place: string;
  readonly seed: string;
  readonly person: string;
  readonly without: string | null;
  readonly high: { choice: string | null; reason: string | null };
  readonly low: { choice: string | null; reason: string | null };
}

export interface TwoPersonTraitProof {
  readonly place: string;
  readonly seed: string;
  readonly high: {
    person: string;
    personId: EntityId;
    choice: string | null;
    reason: string | null;
  };
  readonly low: {
    person: string;
    personId: EntityId;
    choice: string | null;
    reason: string | null;
  };
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

function decisionForPerson(
  world: World,
  personId: EntityId,
  decisionId: string,
  baselineConsiderations: readonly DecisionConsideration[],
  traitId: string,
  reader: "registered" | "act-pulls",
): { choice: string | null; reason: string | null } {
  const considerations =
    reader === "registered"
      ? registeredTraitConsiderations(
          world,
          loadedTraitRegistry(),
          personId,
          `proof:${decisionId}`,
          decisionId,
        )
      : [];
  const allConsiderations = [...baselineConsiderations, ...considerations];
  const declaration = BUILT_IN_TRAIT_DECISIONS.find(
    ({ id }) => id === decisionId,
  )!;
  const evaluation = evaluateDecision(world, {
    stableKey: `proof:${decisionId}:${personId}:${allConsiderations.length}:${allConsiderations[0]?.optionKey ?? "none"}`,
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
    considerations: allConsiderations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  const traitReason = evaluation.context.considerations.find(
    ({ stableKey, optionKey }) =>
      optionKey === evaluation.selectedOptionKey &&
      stableKey.includes(
        reader === "act-pulls" ? `:act:${traitId}:` : `:trait:${traitId}:`,
      ),
  );
  const supportingActReason =
    reader === "act-pulls"
      ? evaluation.context.considerations.find(
          ({ stableKey, direction }) =>
            stableKey.includes(`:act:${traitId}:`) && direction === "supports",
        )
      : undefined;
  return {
    choice: evaluation.selectedOptionKey,
    reason:
      traitReason?.explanation ?? supportingActReason?.explanation ?? null,
  };
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
  baselineConsiderations: readonly DecisionConsideration[] = [],
  reader: "registered" | "act-pulls" = "registered",
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
  return {
    place: place.label,
    seed,
    person: personName(game.world.people[personId]!),
    without: decisionForPerson(
      game.world,
      personId,
      decisionId,
      baselineConsiderations,
      traitId,
      reader,
    ).choice,
    high: decisionForPerson(
      withTendency(game.world, personId, traitId, "high"),
      personId,
      decisionId,
      baselineConsiderations,
      traitId,
      reader,
    ),
    low: decisionForPerson(
      withTendency(game.world, personId, traitId, "low"),
      personId,
      decisionId,
      baselineConsiderations,
      traitId,
      reader,
    ),
  };
}

/**
 * Draws two people with matching other trait considerations from one randomly
 * generated game and records opposite poles of the requested trait. Each
 * person makes the same decision in the same place with the same baseline.
 */
export function proveTwoPersonTraitDifference(
  traitId: string,
  decisionId: string,
  seed: string,
  baselineConsiderations: readonly DecisionConsideration[] = [],
): TwoPersonTraitProof {
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
  const nonTargetTraitSignature = (personId: EntityId) =>
    registeredTraitConsiderations(
      game.world,
      registry,
      personId,
      `proof:${decisionId}`,
      decisionId,
    )
      .filter(({ stableKey }) => !stableKey.includes(`:${traitId}:`))
      .map(
        ({ stableKey, optionKey, direction, importance, confidence }) =>
          `${stableKey}:${optionKey}:${direction}:${importance}:${confidence}`,
      )
      .sort()
      .join("\n");
  const candidates = game.world.personOrder.filter(
    (id) => id !== game.playerPersonId,
  );
  let pair: [EntityId, EntityId] | undefined;
  for (let left = 0; left < candidates.length && !pair; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      const leftId = candidates[left]!;
      const rightId = candidates[right]!;
      if (
        nonTargetTraitSignature(leftId) === nonTargetTraitSignature(rightId)
      ) {
        pair = [leftId, rightId];
        break;
      }
    }
  }
  const [highPersonId, lowPersonId] = pair ?? [];
  if (!highPersonId || !lowPersonId) {
    throw new Error("The generated game did not contain two NPCs for proof.");
  }
  const highPerson = game.world.people[highPersonId]!;
  const lowPerson = game.world.people[lowPersonId]!;
  const proofWorld = withTendency(
    withTendency(game.world, highPersonId, traitId, "high"),
    lowPersonId,
    traitId,
    "low",
  );
  return {
    place: place.label,
    seed,
    high: {
      person: personName(highPerson),
      personId: highPersonId,
      ...decisionForPerson(
        proofWorld,
        highPersonId,
        decisionId,
        baselineConsiderations,
      ),
    },
    low: {
      person: personName(lowPerson),
      personId: lowPersonId,
      ...decisionForPerson(
        proofWorld,
        lowPersonId,
        decisionId,
        baselineConsiderations,
      ),
    },
  };
}
