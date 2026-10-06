import { afterEach, describe, expect, it, vi } from "vitest";
import { stdout } from "node:process";
import * as decisions from "./decisions";
import { addDays } from "./dates";
import { createMindProvenance, recordPersonalityTendency } from "./mind";
import { personName } from "./people";
import { createNewGameWorld } from "../presentation/new-game";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  CONTACT_ANSWER_TRANSITION_KEY,
  CONTACT_ACCEPTED_EVENT,
  CONTACT_DECLINED_EVENT,
  CONTACT_COUNTERED_EVENT,
  contactAnswerTransitionHandler,
  proposeContact,
} from "./people-contact";
import { ensureTraitDefinition } from "./people-traits";
import { traitDefinitionFromPack } from "./trait-packs";
import { loadedTraitRegistry } from "./trait-registry";
import type { DecisionEvaluation, EntityId, World } from "./types";

const TRAIT_KEY = "personality-v1:concern-for-distress";
const EFFECT_DECISION = "contact.answer";

function withConcernForDistress(
  world: World,
  personId: EntityId,
  pole: "low" | "high",
): World {
  const trait = loadedTraitRegistry().traits.get(TRAIT_KEY);
  if (!trait) throw new Error(`Missing registered trait ${TRAIT_KEY}.`);
  const withDefinition = ensureTraitDefinition(world, trait);
  return recordPersonalityTendency(withDefinition, {
    stableKey: `t9-concern-for-distress:${personId}`,
    personId,
    tendencyId: traitDefinitionFromPack(trait).id,
    recordedAt: world.currentDate,
    expressionKey: trait.poles[pole].key,
    strength: "strong",
    confidence: "high",
    scopeTags: ["life:ordinary"],
    provenance: createMindProvenance("authored", {
      note: "Controlled trait contrast for the concern-for-distress decision proof.",
    }),
    supersedesTendencyId: null,
  });
}

afterEach(() => vi.restoreAllMocks());

describe("the concern-for-distress effect data", () => {
  it("loads as an effect on the real contact answer options", () => {
    const registry = loadedTraitRegistry();
    expect(registry.report.rejections).toEqual([]);
    expect(
      registry.report.packs.find((pack) => pack.pack === "personality-v1")
        ?.consumedBy[TRAIT_KEY],
    ).toEqual([EFFECT_DECISION]);
    expect(registry.leans.get(EFFECT_DECISION)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          option: "accept",
          trait: TRAIT_KEY,
          pole: "high",
        }),
        expect.objectContaining({
          option: "decline",
          trait: TRAIT_KEY,
          pole: "low",
        }),
      ]),
    );
  });

  it("changes a real two-person contact choice in a random-place new game, with the trait as the only contrast", () => {
    const place = drawRandomPlace("t9-concern-for-distress-proof");
    const seed = `t9-concern-for-distress:${place.stateJurisdictionKey}`;
    const game = createNewGameWorld({
      startKind: "custom",
      placeKey: place.key,
      startAge: 34,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed,
      givenName: null,
      familyName: null,
    });
    const evaluations: DecisionEvaluation[] = [];
    const evaluate = decisions.evaluateDecision;
    vi.spyOn(decisions, "evaluateDecision").mockImplementation(
      (world, input) => {
        const result = evaluate(world, input);
        if (input.decisionType === "people.contact-answer")
          evaluations.push(result);
        return result;
      },
    );
    let proof:
      | {
          readonly askerId: EntityId;
          readonly answererId: EntityId;
          readonly highOutcome: ReturnType<
            typeof contactAnswerTransitionHandler
          >;
          readonly lowOutcome: ReturnType<
            typeof contactAnswerTransitionHandler
          >;
          readonly highRecord: World["history"]["personalityTendencies"][number];
          readonly lowRecord: World["history"]["personalityTendencies"][number];
          readonly highEvaluation: DecisionEvaluation;
          readonly lowEvaluation: DecisionEvaluation;
        }
      | undefined;
    const askerId = game.playerPersonId;
    const answerers = game.world.personOrder.filter(
      (personId) =>
        personId !== askerId &&
        !game.world.history.personDeaths.some(
          (death) => death.personId === personId,
        ),
    );

    for (const answererId of answerers) {
      const proposal = proposeContact(game.world, {
        stableKey: `t9-concern-for-distress:contact:${answererId}`,
        fromPersonId: askerId,
        toPersonId: answererId,
        on: addDays(game.world.currentDate, 10),
        purpose: "Spend some time together",
      });
      const dueItem = proposal.world.history.futureDueItems.find(
        (item) =>
          item.transitionKey === CONTACT_ANSWER_TRANSITION_KEY &&
          item.entityIds.includes(proposal.proposal.eventId),
      );
      if (!dueItem) continue;

      // Mirrored copies hold the same two people and request; the trait record's
      // pole is their only difference between the actual decision runs.
      const highConcern = withConcernForDistress(
        proposal.world,
        answererId,
        "high",
      );
      const lowConcern = withConcernForDistress(
        proposal.world,
        answererId,
        "low",
      );
      const highRecord = highConcern.history.personalityTendencies.at(-1)!;
      const lowRecord = lowConcern.history.personalityTendencies.at(-1)!;
      expect({ ...highRecord, expressionKey: null }).toEqual({
        ...lowRecord,
        expressionKey: null,
      });

      const before = evaluations.length;
      const highOutcome = contactAnswerTransitionHandler(highConcern, dueItem);
      const lowOutcome = contactAnswerTransitionHandler(lowConcern, dueItem);
      const highEvaluation = evaluations[before];
      const lowEvaluation = evaluations[before + 1];
      if (
        highOutcome.reasonKey === "people:contact-accept" &&
        lowOutcome.reasonKey === "people:contact-decline" &&
        highEvaluation?.selectedOptionKey === "accept" &&
        lowEvaluation?.selectedOptionKey === "decline"
      ) {
        proof = {
          askerId,
          answererId,
          highOutcome,
          lowOutcome,
          highRecord,
          lowRecord,
          highEvaluation,
          lowEvaluation,
        };
        break;
      }
    }

    expect(
      proof,
      "a generated person pair where this trait changes the answer",
    ).toBeDefined();
    const {
      askerId: proofAskerId,
      answererId: proofAnswererId,
      highOutcome,
      lowOutcome,
      highRecord,
      lowRecord,
      highEvaluation,
      lowEvaluation,
    } = proof!;
    const decisionEvaluations = [highEvaluation, lowEvaluation];
    for (const evaluation of decisionEvaluations) {
      expect(evaluation.context.options.map((option) => option.key)).toEqual([
        "accept",
        "counter",
        "decline",
      ]);
      expect(
        evaluation.context.considerations.some(
          (consideration) =>
            consideration.sourceType === "mind:personality" &&
            consideration.explanation.includes("support"),
        ),
      ).toBe(true);
      expect(
        evaluation.optionEvaluations.every(
          (option) => option.randomContribution === "none",
        ),
      ).toBe(true);
    }

    const highEvents = highOutcome.world.history.events;
    const lowEvents = lowOutcome.world.history.events;
    expect(
      highEvents.some((event) => event.type === CONTACT_ACCEPTED_EVENT),
    ).toBe(true);
    expect(
      lowEvents.some((event) => event.type === CONTACT_DECLINED_EVENT),
    ).toBe(true);
    expect(
      lowEvents.some((event) => event.type === CONTACT_COUNTERED_EVENT),
    ).toBe(false);
    stdout.write(
      `T9_CONCERN_FOR_DISTRESS_PROOF ${JSON.stringify({
        seed,
        place: place.displayName,
        worldId: game.world.id,
        people: [
          personName(game.world.people[proofAskerId]!),
          personName(game.world.people[proofAnswererId]!),
        ],
        decision: EFFECT_DECISION,
        highConcern: {
          answer: highOutcome.reasonKey,
          traitRecordId: highRecord.id,
          considerations: highEvaluation.context.considerations,
          options: highEvaluation.optionEvaluations,
        },
        lowConcern: {
          answer: lowOutcome.reasonKey,
          traitRecordId: lowRecord.id,
          considerations: lowEvaluation.context.considerations,
          options: lowEvaluation.optionEvaluations,
        },
      })}\n`,
    );
  });
});
