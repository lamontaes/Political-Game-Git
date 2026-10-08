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
import { ANOTHER_TERM_DECISION } from "../../careers/another-term-decision";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { DecisionConsideration, EntityId, World } from "../../types";

const TRAIT_ID = "personality-v1:facet-excitable";
const SEED = "s52-proof-facet-excitable";

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

function recordExcitability(world: World, personId: EntityId): World {
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
      note: "Focused proof of the excitable decision reader.",
    }),
    supersedesTendencyId: null,
  });
}

function chooseWithSharedContext(
  world: World,
  personId: EntityId,
  targetTendencyRecordId?: EntityId,
) {
  const sharedContext: DecisionConsideration = {
    stableKey: `proof:shared-office-term:${personId}`,
    optionKey: "step-down",
    sourceType: "context:office-term",
    direction: "supports",
    importance: "slight",
    confidence: "high",
    explanation: "The term is ending, and leaving is a real option.",
    sourceRefs: [],
  };
  const traitConsiderations = registeredTraitConsiderations(
    world,
    loadedTraitRegistry(),
    personId,
    `proof:${ANOTHER_TERM_DECISION.id}:${personId}`,
    ANOTHER_TERM_DECISION.id,
  ).filter(({ sourceRefs }) =>
    sourceRefs.some(
      (source) =>
        source.kind === "personality-tendency" &&
        source.tendencyRecordId === targetTendencyRecordId,
    ),
  );
  const considerations = [sharedContext, ...traitConsiderations];
  const evaluation = evaluateDecision(world, {
    stableKey: `proof:${ANOTHER_TERM_DECISION.id}:${personId}`,
    decisionType: ANOTHER_TERM_DECISION.id,
    actorPersonId: personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:life",
      key: "another-term-choice",
      entityId: null,
    },
    options: ANOTHER_TERM_DECISION.options.map((key) => ({
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

describe("facet-excitable in a random new game", () => {
  it("changes one of two people's otherwise shared career choices", () => {
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
    const [unmarkedPersonId, excitablePersonId] = candidates;
    const world = recordExcitability(game.world, excitablePersonId!);
    const tendencyId = traitDefinitionFromPack(trait).id;
    const tendency = [...world.history.personalityTendencies]
      .reverse()
      .find(
        (record) =>
          record.personId === excitablePersonId &&
          record.tendencyId === tendencyId,
      )!;
    const unmarked = chooseWithSharedContext(world, unmarkedPersonId!);
    const excitable = chooseWithSharedContext(
      world,
      excitablePersonId!,
      tendency.id,
    );
    const proof = {
      place: place.label,
      seed: SEED,
      people: [
        personName(world.people[unmarkedPersonId!]!),
        personName(world.people[excitablePersonId!]!),
      ],
      unmarked,
      excitable,
    };
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.unmarked.choice).toBe("step-down");
    expect(proof.excitable.choice).toBe("seek");
    expect(proof.unmarked.reason).toContain("term is ending");
    expect(proof.excitable.reason).toContain("enthusiasm");
  });
});
