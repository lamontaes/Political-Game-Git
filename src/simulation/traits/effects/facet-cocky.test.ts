import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { drawRandomPlace } from "../../../../tests/support/random-place";
import { ANOTHER_TERM_DECISION } from "../../careers/another-term-decision";
import { evaluateDecision } from "../../decisions";
import { appendPersonalityTendency } from "../../mind";
import { ensureTraitDefinition } from "../../people-traits";
import { traitRegistryFor } from "../../trait-registry";
import { registeredTraitConsiderations } from "../../trait-readings";
import {
  encodeRegisteredTrait,
  traitDefinitionFromPack,
} from "../../trait-packs";

function opened(seed: string) {
  const place = drawRandomPlace(seed);
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: place.key,
    startKind: "custom",
    startAge: 40,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    household: "lives-alone",
  });
}

describe("facet-cocky decision effects", () => {
  it("changes a named person's decision in an ordinary generated world", () => {
    const game = opened("session-76-cocky-random-place");
    const comparisonPersonId = game.world.personOrder.find(
      (personId) => personId !== game.playerPersonId,
    )!;
    const trait = traitRegistryFor(game.world).traits.get(
      "personality-v1:facet-cocky",
    )!;
    let world = ensureTraitDefinition(game.world, trait);
    world = appendPersonalityTendency(world, {
      personId: game.playerPersonId,
      tendencyId: traitDefinitionFromPack(trait).id,
      ...encodeRegisteredTrait(trait, 2),
      recordedAt: world.currentDate,
      source: "life-event",
      causeEventId: null,
    });

    const considerations = registeredTraitConsiderations(
      world,
      traitRegistryFor(world),
      game.playerPersonId,
      "another-term:cocky-proof",
      ANOTHER_TERM_DECISION.id,
    );
    const decision = evaluateDecision(world, {
      stableKey: "another-term:cocky-proof",
      decisionType: ANOTHER_TERM_DECISION.id,
      actorPersonId: game.playerPersonId,
      cutoff: {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      },
      subject: {
        kind: "person",
        key: game.playerPersonId,
        entityId: game.playerPersonId,
      },
      options: [
        {
          key: "seek",
          label: "Seek another term",
          description: "Enter the next contest.",
        },
        {
          key: "step-down",
          label: "Step down",
          description: "Leave at the end of the term.",
        },
      ],
      constraints: [],
      considerations,
      perceptionIds: [],
      randomness: "none",
      retention: "ephemeral",
    });
    const comparisonConsiderations = registeredTraitConsiderations(
      world,
      traitRegistryFor(world),
      comparisonPersonId,
      "another-term:cocky-comparison",
      ANOTHER_TERM_DECISION.id,
    ).filter((consideration) =>
      consideration.stableKey.includes("facet-cocky"),
    );
    const comparisonDecision = evaluateDecision(world, {
      stableKey: "another-term:cocky-comparison",
      decisionType: ANOTHER_TERM_DECISION.id,
      actorPersonId: comparisonPersonId,
      cutoff: {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      },
      subject: {
        kind: "person",
        key: comparisonPersonId,
        entityId: comparisonPersonId,
      },
      options: [
        {
          key: "seek",
          label: "Seek another term",
          description: "Enter the next contest.",
        },
        {
          key: "step-down",
          label: "Step down",
          description: "Leave at the end of the term.",
        },
      ],
      constraints: [],
      considerations: comparisonConsiderations,
      perceptionIds: [],
      randomness: "none",
      retention: "ephemeral",
    });

    expect(world.people[game.playerPersonId]?.name).toBeTruthy();
    expect(world.people[comparisonPersonId]?.name).toBeTruthy();
    expect(considerations).toEqual([
      expect.objectContaining({
        optionKey: "seek",
        explanation:
          "They rate their own chances highly and expect to prevail again.",
      }),
    ]);
    expect(decision.selectedOptionKey).toBe("seek");
    expect(comparisonConsiderations).toEqual([]);
    expect(comparisonDecision.selectedOptionKey).toBeNull();
    console.info(
      "T9_FACET_COCKY_PROOF",
      JSON.stringify({
        seed: game.setup.seed,
        worldId: world.id,
        date: world.currentDate,
        place: game.place.key,
        cockyPersonId: game.playerPersonId,
        cockyPersonName: world.people[game.playerPersonId]!.name,
        comparisonPersonId,
        comparisonPersonName: world.people[comparisonPersonId]!.name,
        selected: decision.selectedOptionKey,
        comparisonSelected: comparisonDecision.selectedOptionKey,
      }),
    );
  });
});
