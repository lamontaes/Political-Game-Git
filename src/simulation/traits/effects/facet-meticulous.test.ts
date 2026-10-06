import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { drawRandomPlace } from "../../../../tests/support/random-place";
import { evaluateDecision } from "../../decisions";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { ensurePeopleTraitCatalog } from "../../people-traits";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";

describe("the meticulous trait reader", () => {
  it("changes a named person's career choice in a random new game", () => {
    const seed = "session-80-meticulous-proof";
    const place = drawRandomPlace(seed);
    const opened = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "custom",
      seed,
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
      placeKey: place.key,
      household: "shares-a-home",
    });
    const actorId = opened.world.personOrder.find(
      (id) => id !== opened.playerPersonId,
    )!;
    let world = ensurePeopleTraitCatalog(opened.world);
    const trait = loadedTraitRegistry().traits.get(
      "personality-v1:facet-meticulous",
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
      stableKey: "proof:meticulous",
      personId: actorId,
      tendencyId: definition.id,
      recordedAt: world.currentDate,
      expressionKey: trait.poles.high.key,
      strength: "strong",
      confidence: "medium",
      scopeTags: ["career:choice"],
      provenance: createMindProvenance("authored", {
        note: "Focused trait-reader proof.",
      }),
      supersedesTendencyId: null,
    });

    const considerations = registeredTraitConsiderations(
      world,
      loadedTraitRegistry(),
      actorId,
      "proof:another-term",
      "career.consider-another-term",
    );
    const evaluation = evaluateDecision(world, {
      stableKey: "proof:another-term",
      decisionType: "career.consider-another-term",
      actorPersonId: actorId,
      cutoff: {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      },
      subject: { kind: "context:life", key: "proof-seat", entityId: null },
      options: [
        { key: "seek", label: "Run again", description: "Seek another term." },
        { key: "step-down", label: "Step down", description: "Leave office." },
      ],
      constraints: [],
      considerations,
      perceptionIds: [],
      randomness: "none",
      retention: "ephemeral",
    });

    expect(considerations).toMatchObject([
      {
        optionKey: "seek",
        explanation:
          "They want to see the office's unfinished details through.",
      },
    ]);
    expect(evaluation.selectedOptionKey).toBe("seek");
    console.info("Session 80 trait proof", {
      seed,
      place: place.displayName,
      worldId: world.id,
      date: world.currentDate,
      personId: actorId,
      personName: `${world.people[actorId]!.givenName} ${world.people[actorId]!.familyName}`,
      decisionId: evaluation.decisionId,
      selected: evaluation.selectedOptionKey,
    });
  }, 60_000);
});
