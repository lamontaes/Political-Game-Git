import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { evaluatePlea, type CourtCase } from "../../justice/court-reasoning";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { stableHash } from "../../ids";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId } from "../../types";

const SEED = "h1-cocky-proof";

function randomPlace(): { placeKey: string; label: string } {
  const states = lifePlaceStateIdentities();
  const state =
    states[parseInt(stableHash(SEED).slice(0, 8), 16) % states.length]!;
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  })[0]!;
  return {
    placeKey: place.key,
    label: `${place.displayName}, US-${state.usps}`,
  };
}

describe("facet-cocky", () => {
  it("changes a named person's plea decision in a random new game", () => {
    const place = randomPlace();
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      placeKey: place.placeKey,
      startAge: 40,
      questionnaire: "skipped",
    });
    const personId = game.world.personOrder.find(
      (id) => id !== game.playerPersonId,
    )!;
    expect(personId).toBeDefined();
    const ordinaryWorld = game.world;
    let world = game.world;
    const trait = loadedTraitRegistry().traits.get(
      "personality-v1:facet-cocky",
    )!;
    const definition = traitDefinitionFromPack(trait);
    world = {
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
    world = recordPersonalityTendency(world, {
      stableKey: `test:${personId}:cocky`,
      personId,
      tendencyId: definition.id,
      recordedAt: world.currentDate,
      expressionKey: trait.poles.high.key,
      strength: "strong",
      confidence: "high",
      scopeTags: ["life:ordinary", "career:choice"],
      provenance: createMindProvenance("authored", {
        note: "Focused proof: the comparison person is known to be cocky.",
      }),
      supersedesTendencyId: null,
    });

    const courtCase = (personId: EntityId): CourtCase => ({
      caseKey: `proof:${personId}`,
      defendantId: personId,
      offenseKey: "proof:charge",
      offenseLabel: "the charge",
      evidence: "circumstantial",
      standingFindings: 0,
      venueJurisdictionId: world.people[personId]!.homeJurisdictionId,
      stateKey: null,
    });
    const ordinary = evaluatePlea(ordinaryWorld, courtCase(personId));
    const cocky = evaluatePlea(world, courtCase(personId));

    expect(ordinary.selectedOptionKey).toBe("plead");
    expect(cocky.selectedOptionKey).toBe("trial");
    const traitReason = cocky.context.considerations.find((reason) =>
      reason.stableKey.includes("personality-v1:facet-cocky"),
    );
    expect(traitReason?.optionKey).toBe("trial");
    expect(traitReason?.sourceRefs[0]?.kind).toBe("personality-tendency");

    const name = (id: EntityId) => {
      const person = world.people[id]!;
      return `${person.givenName} ${person.familyName}`;
    };
    console.info({
      seed: SEED,
      place: place.label,
      ordinary: {
        person: name(personId),
        choice: ordinary.selectedOptionKey,
      },
      cocky: {
        person: name(personId),
        choice: cocky.selectedOptionKey,
        reason: traitReason?.explanation,
      },
    });
  });
});
