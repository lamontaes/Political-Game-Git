import { describe, expect, it } from "vitest";
import {
  nextQuestionnaireStep,
  projectQuestionnaireSequence,
  questionnaireItem,
  setupLifeContext,
} from "./setup-questionnaire";

const CHILD = setupLifeContext({
  startAge: 5,
  startingLife: "ordinary-life",
  household: "shares-a-home",
});

describe("withdrawn questionnaire bank", () => {
  it("cannot select authored copy for a new or old setup", () => {
    for (const selectionVersion of [undefined, "curated-v1"] as const) {
      for (const depth of ["short", "deep"] as const) {
        const input = {
          worldSeed: "withdrawn-bank",
          personKey: "same-player",
          depth,
          selectionVersion,
          life: CHILD,
          answers: [],
        };
        expect(projectQuestionnaireSequence(input)).toEqual([]);
        expect(nextQuestionnaireStep(input)).toBeNull();
      }
    }
  });

  it("does not resolve an old saved question key into discarded words", () => {
    expect(questionnaireItem("child_kitchen_late.text39-v1")).toBeNull();
    expect(
      questionnaireItem("hypothetical_mayor_plate_reader.curated-v1"),
    ).toBeNull();
  });
});
