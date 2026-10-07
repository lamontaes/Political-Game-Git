import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { evaluateDecision } from "../../decisions";
import { stableHash } from "../../ids";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { personName } from "../../people";
import { readTrait, registeredTraitConsiderations } from "../../trait-readings";
import {
  BUILT_IN_TRAIT_DECISIONS,
  loadedTraitRegistry,
} from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { DecisionConsideration, EntityId, World } from "../../types";

const TRAIT_ID = "personality-v1:facet-devoted";
const DECISION_ID = "people.couple-stage";
const SEED = "s42-proof-facet-devoted";

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

function recordDevotion(world: World, personId: EntityId): World {
  const trait = loadedTraitRegistry().traits.get(TRAIT_ID)!;
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
    stableKey: `proof:${TRAIT_ID}:high:${personId}`,
    personId,
    tendencyId: definition.id,
    recordedAt: world.currentDate,
    expressionKey: trait.poles.high.key,
    strength: "strong",
    confidence: "medium",
    scopeTags: ["life:ordinary", "career:choice"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof of the trait reader.",
    }),
    supersedesTendencyId: null,
  });
}

function chooseWithSharedContext(
  world: World,
  personId: EntityId,
  targetTendencyRecordId?: EntityId,
) {
  const declaration = BUILT_IN_TRAIT_DECISIONS.find(
    ({ id }) => id === DECISION_ID,
  )!;
  const sharedContext: DecisionConsideration = {
    stableKey: "proof:shared-relationship-strain",
    optionKey: "break-up",
    sourceType: "context:observed-relationship",
    direction: "supports",
    importance: "slight",
    confidence: "high",
    explanation: "The relationship has a strain worth weighing.",
    sourceRefs: [],
  };
  const traitConsiderations = registeredTraitConsiderations(
    world,
    loadedTraitRegistry(),
    personId,
    `proof:${DECISION_ID}:${personId}`,
    DECISION_ID,
  ).filter(({ sourceRefs }) =>
    sourceRefs.some(
      (source) =>
        source.kind === "personality-tendency" &&
        source.tendencyRecordId === targetTendencyRecordId,
    ),
  );
  const considerations = [
    { ...sharedContext, stableKey: `${sharedContext.stableKey}:${personId}` },
    ...traitConsiderations,
  ];
  const evaluation = evaluateDecision(world, {
    stableKey: `proof:${DECISION_ID}:${personId}`,
    decisionType: DECISION_ID,
    actorPersonId: personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:life",
      key: "established-close-commitment",
      entityId: null,
    },
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
    reason: considerations.find(
      ({ optionKey }) => optionKey === evaluation.selectedOptionKey,
    )?.explanation,
  };
}

describe("facet-devoted in a random new game", () => {
  it("changes one of two people's otherwise shared relationship choices", () => {
    const place = randomPlace(SEED);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      placeKey: place.placeKey,
      startKind: "custom",
      startAge: 40,
      questionnaire: "skipped",
    });
    const registry = loadedTraitRegistry();
    const trait = registry.traits.get(TRAIT_ID)!;
    const candidates = game.world.personOrder.filter(
      (id) =>
        id !== game.playerPersonId &&
        readTrait(game.world, id, trait).state === "unrecorded",
    );
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    const [unmarkedPersonId, devotedPersonId] = candidates;
    const world = recordDevotion(game.world, devotedPersonId!);
    const devotionTendencyId = traitDefinitionFromPack(trait).id;
    const devotionRecord = [...world.history.personalityTendencies]
      .reverse()
      .find(
        (record) =>
          record.personId === devotedPersonId &&
          record.tendencyId === devotionTendencyId,
      )!;
    const unmarked = chooseWithSharedContext(world, unmarkedPersonId!);
    const devoted = chooseWithSharedContext(
      world,
      devotedPersonId!,
      devotionRecord.id,
    );
    const proof = {
      place: place.label,
      seed: SEED,
      people: [
        personName(world.people[unmarkedPersonId!]!),
        personName(world.people[devotedPersonId!]!),
      ],
      unmarked,
      devoted,
    };
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.unmarked.choice).toBe("break-up");
    expect(proof.devoted.choice).toBe("stay");
    expect(proof.unmarked.reason).toContain("strain");
    expect(proof.devoted.reason).toContain("commitment");
  });
});
