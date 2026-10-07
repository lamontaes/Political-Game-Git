import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { evaluateDecision } from "../decisions";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../mind";
import { personName } from "../people";
import { registeredTraitConsiderations } from "../trait-readings";
import { loadedTraitRegistry } from "../trait-registry";
import { traitDefinitionFromPack } from "../trait-packs";
import type { EntityId, World } from "../types";
import { ANOTHER_TERM_DECISION } from "../careers/another-term-decision";

const TRAIT = "personality-v1:facet-thrill-seeking";

function randomPlace(): { seed: string; placeKey: string; usps: string } {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  for (let index = 1; index < 200; index += 1) {
    const seed = `session-85-thrill-seeking-${index}`;
    const place =
      places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
    const locality = searchLifePlaces("", 1, {
      stateJurisdictionKey: place.jurisdictionKey,
      scope: "locality",
    })[0];
    if (locality) return { seed, placeKey: locality.key, usps: place.usps };
  }
  throw new Error("No locality was drawn from the 56-place list.");
}

function conferThrillSeeking(world: World, personId: EntityId): World {
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
    expressionKey: "facet-thrill-seeking:high",
    strength: "strong",
    confidence: "medium",
    scopeTags: ["career:choice"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof of the trait reader.",
    }),
    supersedesTendencyId: null,
  });
}

describe("the thrill-seeking decision reader", () => {
  it("carries one named person's thrill seeking into the another-term decision in a random new game", () => {
    const place = randomPlace();
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: place.seed,
      placeKey: place.placeKey,
      startKind: "custom",
      startAge: 40,
      questionnaire: "skipped",
    });
    const people = game.world.personOrder
      .filter((id) => id !== game.playerPersonId)
      .slice(0, 2);
    expect(people).toHaveLength(2);
    const [thrillSeeker, comparison] = people as [EntityId, EntityId];
    const world = conferThrillSeeking(game.world, thrillSeeker);
    const considerationsFor = (personId: EntityId) =>
      registeredTraitConsiderations(
        world,
        loadedTraitRegistry(),
        personId,
        "proof:another-term",
        ANOTHER_TERM_DECISION.id,
      );

    const thrillReasons = considerationsFor(thrillSeeker);
    expect(thrillReasons).toEqual([
      expect.objectContaining({
        optionKey: "seek",
        sourceType: "mind:personality",
        explanation:
          "The uncertainty and intensity of another contest appeal to them.",
      }),
    ]);
    expect(considerationsFor(comparison)).toEqual([]);

    const decide = (personId: EntityId) =>
      evaluateDecision(world, {
        stableKey: `proof:another-term:${personId}`,
        decisionType: ANOTHER_TERM_DECISION.id,
        actorPersonId: personId,
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        },
        subject: { kind: "context:life", key: "proof-seat", entityId: null },
        options: [
          { key: "seek", label: "Run again", description: "Seek the term." },
          {
            key: "step-down",
            label: "Step down",
            description: "Leave after the term.",
          },
        ],
        constraints: [],
        considerations: considerationsFor(personId),
        perceptionIds: [],
        randomness: "none",
        retention: "durable",
      });
    const thrillDecision = decide(thrillSeeker);
    const comparisonDecision = decide(comparison);
    expect(thrillDecision.selectedOptionKey).toBe("seek");
    expect(comparisonDecision.outcomeKind).toBe("undecided");

    // The proof output names the watched place, seed and people when Vitest is
    // run with its verbose reporter; the assertions above remain the gate.
    const proof = {
      place: `${place.usps}:${place.placeKey}`,
      seed: place.seed,
      thrillSeeker: personName(world.people[thrillSeeker]!),
      comparison: personName(world.people[comparison]!),
      decision: ANOTHER_TERM_DECISION.id,
      thrillSeekerChoice: thrillDecision.selectedOptionKey,
      comparisonChoice: comparisonDecision.selectedOptionKey,
      reason: thrillReasons[0]!.explanation,
    };
    console.info("THRILL-SEEKING PROOF", JSON.stringify(proof));
    expect(proof).toMatchObject({
      decision: "career.consider-another-term",
      thrillSeekerChoice: "seek",
      comparisonChoice: null,
    });
  });
});
