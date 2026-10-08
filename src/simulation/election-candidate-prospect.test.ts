import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { createMindProvenance, recordPersonalityTendency } from "./mind";
import { personName } from "./people";
import { loadedTraitRegistry } from "./trait-registry";
import { traitDefinitionFromPack } from "./trait-packs";
import { recordWorldEvent } from "./world";
import { recordProspectRunChoice } from "./election-candidate-prospect";
import { drawRandomPlace } from "../../tests/support/random-place";

describe("candidate run decisions read the person's traits", () => {
  it("records ambition in federal and state candidacy decisions", () => {
    const seed = "t3-candidate-producer-trace";
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startKind: "custom",
      startAge: 40,
      questionnaire: "skipped",
    });
    const personId = game.world.personOrder.find(
      (id) => id !== game.playerPersonId,
    )!;
    const trait = loadedTraitRegistry().traits.get(
      "personality-v1:facet-ambitious",
    )!;
    const definition = traitDefinitionFromPack(trait);
    let world = {
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
    world = recordPersonalityTendency(world, {
      stableKey: `t3-candidate-ambition:${personId}`,
      personId,
      tendencyId: definition.id,
      recordedAt: world.currentDate,
      expressionKey: trait.poles.high.key,
      strength: "strong",
      confidence: "high",
      scopeTags: ["life:ordinary", "career:choice"],
      provenance: createMindProvenance("authored", {
        note: "Focused proof of the candidate's recorded ambition.",
      }),
      supersedesTendencyId: null,
    });
    const jurisdictionId = world.people[personId]!.homeJurisdictionId;
    world = recordWorldEvent(world, {
      stableKey: `t3-candidate-recruitment:${personId}`,
      type: "election.congress-recruitment",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId,
      involvedEntityIds: [personId],
      participants: [{ personId, role: "focus:subject", detail: "prospect" }],
      personFactConstraints: [],
      visibility: "private",
      tags: ["proof:t3-candidate-recruitment"],
      summary: `${personName(world.people[personId]!)} was asked to consider a run.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const recruitmentEventId = world.history.events.at(-1)!.id;

    for (const decisionType of [
      "election.consider-congress-run",
      "election.consider-state-legislative-run",
    ]) {
      const stableKey = `t3-candidate-choice:${decisionType}:${personId}`;
      const result = recordProspectRunChoice({
        world,
        stableKey,
        decisionType,
        seatKey: `proof:${decisionType}`,
        personId,
        intakeDate: world.currentDate,
        recruitmentEventId,
        opportunity: null,
        lowOpportunityShare: 0.18,
      });
      const trace = result.world.history.decisionTraces.find(
        (row) => row.stableKey === `${stableKey}:trace`,
      );
      expect(
        trace?.context.considerations.some(
          (row) =>
            row.sourceType === "mind:personality" &&
            row.optionKey === "run" &&
            row.explanation.includes("public office"),
        ),
      ).toBe(true);
      process.stderr.write(
        `T3 CANDIDATE TRACE ${JSON.stringify({
          place: place.label,
          seed,
          person: personName(world.people[personId]!),
          decisionType,
          runs: result.runs,
        })}\n`,
      );
      world = result.world;
    }
  });
});
