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
import { readTrait } from "../../trait-readings";
import { romanticDecisionConsiderations } from "../../couples";
import {
  BUILT_IN_TRAIT_DECISIONS,
  loadedTraitRegistry,
} from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { DecisionConsideration, EntityId, World } from "../../types";

const TRAIT_ID = "personality-v1:facet-affectionate";
const DECISION_ID = "people.couple-stage";
const SEED = "s52-proof-facet-affectionate";

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

function recordAffection(world: World, personId: EntityId): World {
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
    scopeTags: ["life:ordinary", "relationship:choice"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof of the affectionate decision reader.",
    }),
    supersedesTendencyId: null,
  });
}

function chooseWithSharedContext(
  world: World,
  actorPersonId: EntityId,
  otherPersonId: EntityId,
  affectionRecordId?: EntityId,
) {
  const declaration = BUILT_IN_TRAIT_DECISIONS.find(
    ({ id }) => id === DECISION_ID,
  )!;
  const sharedContext: DecisionConsideration = {
    stableKey: `proof:shared-relationship-strain:${actorPersonId}`,
    optionKey: "break-up",
    sourceType: "context:observed-relationship",
    direction: "supports",
    importance: "slight",
    confidence: "high",
    explanation: "The relationship has a strain worth weighing.",
    sourceRefs: [],
  };
  const traitConsiderations = romanticDecisionConsiderations(
    world,
    `proof:${DECISION_ID}:${actorPersonId}`,
    actorPersonId,
    otherPersonId,
    DECISION_ID,
  ).filter(({ sourceRefs }) =>
    sourceRefs.some(
      (source) =>
        source.kind === "personality-tendency" &&
        source.tendencyRecordId === affectionRecordId,
    ),
  );
  const considerations = [sharedContext, ...traitConsiderations];
  const evaluation = evaluateDecision(world, {
    stableKey: `proof:${DECISION_ID}:${actorPersonId}`,
    decisionType: DECISION_ID,
    actorPersonId,
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

describe("facet-affectionate in a random new game", () => {
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
    const [unmarkedPersonId, affectionatePersonId] = candidates;
    const world = recordAffection(game.world, affectionatePersonId!);
    const affectionTendencyId = traitDefinitionFromPack(trait).id;
    const affectionRecord = [...world.history.personalityTendencies]
      .reverse()
      .find(
        (record) =>
          record.personId === affectionatePersonId &&
          record.tendencyId === affectionTendencyId,
      )!;
    const unmarked = chooseWithSharedContext(
      world,
      unmarkedPersonId!,
      affectionatePersonId!,
    );
    const affectionate = chooseWithSharedContext(
      world,
      affectionatePersonId!,
      unmarkedPersonId!,
      affectionRecord.id,
    );
    const proof = {
      place: place.label,
      seed: SEED,
      people: [
        personName(world.people[unmarkedPersonId!]!),
        personName(world.people[affectionatePersonId!]!),
      ],
      unmarked,
      affectionate,
    };
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.unmarked.choice).toBe("break-up");
    expect(proof.affectionate.choice).toBe("stay");
    expect(proof.unmarked.reason).toContain("strain");
    expect(proof.affectionate.reason).toContain("warmth");
  });
});
