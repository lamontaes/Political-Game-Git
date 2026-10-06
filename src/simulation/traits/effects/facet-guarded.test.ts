import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { addDays } from "../../dates";
import { npcContactAnswer, proposeContact } from "../../people-contact";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { stableHash } from "../../ids";
import { CONTACT_ANSWER_DECISION } from "../../people-contact-decisions";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId } from "../../types";

const SEED = "h1-guarded-proof";

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

describe("facet-guarded", () => {
  it("changes a named person's answer to an invitation in a random new game", () => {
    const place = randomPlace();
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      placeKey: place.placeKey,
      startAge: 40,
      questionnaire: "skipped",
    });
    const [askerId, askedId] = game.world.personOrder.filter(
      (id) => id !== game.playerPersonId,
    );
    expect(askerId).toBeDefined();
    expect(askedId).toBeDefined();
    const proposed = proposeContact(game.world, {
      stableKey: "h1-guarded-proof-request",
      fromPersonId: askerId!,
      toPersonId: askedId!,
      on: addDays(game.world.currentDate, 3),
      purpose: "Catch up",
      answerInPerson: false,
    });
    const ordinaryWorld = proposed.world;
    let world = ordinaryWorld;
    const personId = askedId!;
    const trait = loadedTraitRegistry().traits.get(
      "personality-v1:facet-guarded",
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
      stableKey: `test:${personId}:guarded`,
      personId,
      tendencyId: definition.id,
      recordedAt: world.currentDate,
      expressionKey: trait.poles.high.key,
      strength: "strong",
      confidence: "high",
      scopeTags: ["relationship:choice", "life:ordinary"],
      provenance: createMindProvenance("authored", {
        note: "Focused proof: the person asked is known to be guarded.",
      }),
      supersedesTendencyId: null,
    });

    const eventId = proposed.proposal.eventId;
    const ordinary = npcContactAnswer(ordinaryWorld, eventId);
    const guarded = npcContactAnswer(world, eventId);

    expect(ordinary.answer).toBe("accept");
    // The decline reason outweighs or balances the ordinary reasons to say yes:
    // they do not accept, whether they refuse or have not settled yet.
    expect(guarded.answer).not.toBe("accept");
    const reasons = (source: typeof world) =>
      registeredTraitConsiderations(
        source,
        loadedTraitRegistry(),
        personId,
        `contact:${eventId}`,
        CONTACT_ANSWER_DECISION.id,
        askerId,
      );
    expect(reasons(ordinaryWorld)).toEqual([]);
    const traitReason = reasons(world).find((reason) =>
      reason.stableKey.includes("personality-v1:facet-guarded"),
    );
    expect(traitReason?.optionKey).toBe("decline");
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
        choice: ordinary.answer,
      },
      guarded: {
        person: name(personId),
        choice: guarded.answer,
        reason: traitReason?.explanation,
      },
    });
  });
});
