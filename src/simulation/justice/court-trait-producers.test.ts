import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { createMindProvenance, recordPersonalityTendency } from "../mind";
import { loadedTraitRegistry } from "../trait-registry";
import { traitDefinitionFromPack } from "../trait-packs";
import { recordJudicialPhilosophy } from "../judiciary/philosophy";
import { ensureOpeningJudiciary } from "../judiciary/opening";
import { recordWorldEvent } from "../world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  evaluateDetention,
  evaluateSentence,
  type CourtCase,
} from "./court-reasoning";
import { evaluateClemency } from "./clemency-reasoning";

describe("court decision producers read registered traits", () => {
  it("passes a judge's cruelty into detention, sentencing and clemency decisions", () => {
    const seed = "t6-court-producer-trace";
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startKind: "custom",
      startAge: 40,
      questionnaire: "skipped",
    });
    const people = game.world.personOrder.filter(
      (id) => id !== game.playerPersonId,
    );
    const judgeId = people[0]!;
    const petitionerId = people[1]!;
    const trait = loadedTraitRegistry().traits.get(
      "personality-v1:facet-cruel",
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
      stableKey: `t6-cruel-judge:${judgeId}`,
      personId: judgeId,
      tendencyId: definition.id,
      recordedAt: prepared.currentDate,
      expressionKey: trait.poles.high.key,
      strength: "strong",
      confidence: "high",
      scopeTags: ["life:ordinary"],
      provenance: createMindProvenance("authored", {
        note: "Focused proof of the judge's recorded cruelty.",
      }),
      supersedesTendencyId: null,
    });
    const courtCase: CourtCase = {
      caseKey: "t6-court-producer-case",
      defendantId: petitionerId,
      offenseKey: "crime:assault",
      offenseLabel: "assault",
      evidence: "testimony",
      standingFindings: 0,
      venueJurisdictionId: world.people[judgeId]!.homeJurisdictionId,
      stateKey: null,
    };
    const petition = world.history.events[0]!;
    const sentenced = world.history.events[1]!;
    const question = {
      petition,
      petitionerId,
      sentenced,
      earlierAnswer: null,
    };
    const evaluations = [
      evaluateDetention(world, judgeId, courtCase),
      evaluateSentence(world, judgeId, courtCase, false),
      evaluateClemency(world, judgeId, question, {
        stateUsps: null,
        termEndsAt: null,
      }),
    ];
    const expected = [
      ["justice.pretrial-detention", "court:hold-before-trial"],
      ["justice.sentence", "court:jail"],
      ["justice.clemency-decision", "clemency:deny"],
    ] as const;
    for (const [index, evaluation] of evaluations.entries()) {
      const [decisionType, optionKey] = expected[index]!;
      expect(evaluation.context.decisionType).toBe(decisionType);
      expect(
        evaluation.context.considerations.some(
          (row) =>
            row.sourceType === "mind:personality" &&
            row.optionKey === optionKey &&
            /suffer|painful|sentence/.test(row.explanation),
        ),
      ).toBe(true);
      process.stderr.write(
        `T6 COURT TRACE ${JSON.stringify({
          seed,
          person: world.people[judgeId]!.givenName,
          decisionType,
          choice: evaluation.selectedOptionKey,
        })}\n`,
      );
    }
  });

  it("passes a judge's recorded rights outlook into detention and sentencing", () => {
    const seed = "t6-court-rights-outlook";
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startKind: "custom",
      startAge: 40,
      questionnaire: "skipped",
    });
    const opened = ensureOpeningJudiciary(game.world);
    const judgeId = opened.personOrder.find(
      (id) => id !== game.playerPersonId,
    )!;
    const defendantId = opened.personOrder.find(
      (id) => id !== game.playerPersonId && id !== judgeId,
    )!;
    const evidenced = recordWorldEvent(opened, {
      stableKey: `t6-rights-outlook:${judgeId}`,
      type: "judiciary.outlook-evidence",
      occurredAt: game.world.currentDate,
      recordedAt: game.world.currentDate,
      jurisdictionId: game.world.people[judgeId]!.homeJurisdictionId,
      involvedEntityIds: [judgeId],
      participants: [
        { personId: judgeId, role: "agency:speaker", detail: null },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: ["judiciary.outlook"],
      summary: "A judge's recorded rights view.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: "The judge recorded a rights view.",
        motivation: null,
        immediateReaction: null,
      },
    });
    const eventId = evidenced.history.events.at(-1)!.id;
    const world = recordJudicialPhilosophy(evidenced, {
      stableKey: "t6-rights-outlook",
      personId: judgeId,
      formedAt: evidenced.currentDate,
      dimensions: {
        rights: {
          strength: 2,
          evidence: [{ kind: "historical-event", id: eventId }],
          reason: "judicial.outlook.rights.civil-liberties",
        },
      },
      reason: "judicial.outlook.recorded-at-seating",
    });
    const courtCase: CourtCase = {
      caseKey: "t6-rights-outlook-case",
      defendantId,
      offenseKey: "crime:assault",
      offenseLabel: "assault",
      evidence: "testimony",
      standingFindings: 0,
      venueJurisdictionId: world.people[judgeId]!.homeJurisdictionId,
      stateKey: null,
    };
    for (const evaluation of [
      evaluateDetention(world, judgeId, courtCase),
      evaluateSentence(world, judgeId, courtCase, false),
    ])
      expect(
        evaluation.context.considerations.some(
          (row) => row.sourceType === "belief:judicial-philosophy",
        ),
      ).toBe(true);
  });
});
