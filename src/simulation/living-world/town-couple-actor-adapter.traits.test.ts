import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { createMindProvenance, recordPersonalityTendency } from "../mind";
import { personName } from "../people";
import { loadedTraitRegistry } from "../trait-registry";
import { traitDefinitionFromPack } from "../trait-packs";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { evaluateTownCoupleActors } from "./town-couple-actor-adapter";

describe("town couple actor producer reads registered traits", () => {
  it("records the actor's affectionate reason in a generated-world stage decision", () => {
    const seed = "t4-couple-producer-trace";
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startKind: "custom",
      startAge: 40,
      questionnaire: "skipped",
    });
    const personIds = game.world.personOrder
      .filter((id) => id !== game.playerPersonId)
      .slice(0, 2) as [string, string];
    const actorId = personIds[0]!;
    const trait = loadedTraitRegistry().traits.get(
      "personality-v1:facet-affectionate",
    )!;
    const definition = traitDefinitionFromPack(trait);
    const prepared = {
      ...game.world,
      mindCatalog: {
        ...game.world.mindCatalog,
        tendencies: {
          ...game.world.mindCatalog.tendencies,
          [definition.id]: definition,
        },
        tendencyOrder: game.world.mindCatalog.tendencyOrder.includes(
          definition.id,
        )
          ? game.world.mindCatalog.tendencyOrder
          : [...game.world.mindCatalog.tendencyOrder, definition.id],
      },
    };
    const world = recordPersonalityTendency(prepared, {
      stableKey: `t4-couple-affection:${actorId}`,
      personId: actorId,
      tendencyId: definition.id,
      recordedAt: prepared.currentDate,
      expressionKey: trait.poles.high.key,
      strength: "strong",
      confidence: "high",
      scopeTags: ["life:ordinary", "relationship:choice"],
      provenance: createMindProvenance("authored", {
        note: "Focused proof of the actor's recorded affectionate tendency.",
      }),
      supersedesTendencyId: null,
    });
    const result = evaluateTownCoupleActors(world, {
      stableKey: `t4-couple-stage:${actorId}`,
      personIds,
      stage: "dating",
      startedAt: world.currentDate,
      retention: "durable",
    });
    const trace = result.world.history.decisionTraces.find(
      (row) =>
        row.context.actorPersonId === actorId &&
        row.context.decisionType === "people.couple-stage",
    );
    expect(
      trace?.context.considerations.some(
        (row) =>
          row.sourceType === "mind:personality" &&
          row.optionKey === "stay" &&
          row.explanation.includes("warmth"),
      ),
    ).toBe(true);
    process.stderr.write(
      `T4 COUPLE TRACE ${JSON.stringify({
        place: place.label,
        seed,
        person: personName(world.people[actorId]!),
        decisionType: trace?.context.decisionType,
        choice: trace?.selectedOptionKey,
      })}\n`,
    );
  });
});
