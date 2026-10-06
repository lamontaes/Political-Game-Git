import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import {
  evaluateJurorVote,
  type CourtCase,
} from "../../justice/court-reasoning";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { stableHash } from "../../ids";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId } from "../../types";

const SEED = "h1-cruel-proof";

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

describe("facet-cruel", () => {
  it("changes a named person's jury vote in a random new game", () => {
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
      "personality-v1:facet-cruel",
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
      stableKey: `test:${personId}:cruel`,
      personId,
      tendencyId: definition.id,
      recordedAt: world.currentDate,
      expressionKey: trait.poles.high.key,
      strength: "strong",
      confidence: "high",
      scopeTags: ["life:ordinary", "relationship:choice"],
      provenance: createMindProvenance("authored", {
        note: "Focused proof: the comparison person is known to be cruel.",
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
    const ordinary = evaluateJurorVote(
      ordinaryWorld,
      courtCase(personId),
      personId,
      "proof:ballot-1",
      null,
      null,
    );
    const cruel = evaluateJurorVote(
      world,
      courtCase(personId),
      personId,
      "proof:ballot-1",
      null,
      null,
    );

    expect(ordinary.selectedOptionKey).toBe("acquit");
    expect(cruel.selectedOptionKey).toBe("convict");
    const traitReason = cruel.context.considerations.find((reason) =>
      reason.stableKey.includes("personality-v1:facet-cruel"),
    );
    expect(traitReason?.optionKey).toBe("convict");
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
      cruel: {
        person: name(personId),
        choice: cruel.selectedOptionKey,
        reason: traitReason?.explanation,
      },
    });
  });
});
