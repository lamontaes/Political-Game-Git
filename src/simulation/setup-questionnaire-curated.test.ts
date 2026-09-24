import { describe, expect, it } from "vitest";
import {
  nextQuestionnaireStep,
  projectQuestionnaireSequence,
  questionnaireItem,
  setupLifeContext,
} from "./setup-questionnaire";
import type { SetupAnswerRecord } from "./types";

const CHILD = setupLifeContext({
  startAge: 5,
  startingLife: "ordinary-life",
  household: "shares-a-home",
});

function sequence(seed: string, depth: "short" | "deep") {
  return projectQuestionnaireSequence({
    worldSeed: seed,
    personKey: "same-player",
    depth,
    selectionVersion: "curated-v1",
    life: CHILD,
    answers: [],
  });
}

describe("current Who are you? calibration", () => {
  it("asks five or ten to twelve questions, with more than one opening", () => {
    const short = sequence("ohio", "short");
    const long = sequence("ohio", "deep");
    expect(short).toHaveLength(5);
    expect(long.length).toBeGreaterThanOrEqual(10);
    expect(long.length).toBeLessThanOrEqual(12);
    expect(sequence("alaska", "short")[0]).not.toBe(short[0]);
    expect(sequence("ohio", "short")).toEqual(short);
  });

  it("keeps adult job premises out of a five-year-old's route", () => {
    for (const key of sequence("ohio", "deep")) {
      const item = questionnaireItem(key);
      expect(item).not.toBeNull();
      if (item?.key.startsWith("hypothetical_")) {
        expect(item.prompt).toContain("imagine yourself as mayor");
      } else {
        expect(item?.eligibility.bands).toContain("middle-childhood");
      }
    }
  });

  it("asks why only after the player chose the 14-day mayor agreement", () => {
    const answers: SetupAnswerRecord[] = [];
    for (let index = 0; index < 3; index += 1) {
      const step = nextQuestionnaireStep({
        worldSeed: "ohio",
        personKey: "same-player",
        depth: "short",
        selectionVersion: "curated-v1",
        life: CHILD,
        answers,
      });
      expect(step).not.toBeNull();
      answers.push({
        ordinal: step!.ordinal,
        questionKey: step!.item.key,
        choiceId: null,
      });
    }
    const mayor = nextQuestionnaireStep({
      worldSeed: "ohio",
      personKey: "same-player",
      depth: "short",
      selectionVersion: "curated-v1",
      life: CHILD,
      answers,
    });
    expect(mayor?.item.key).toBe("hypothetical_mayor_plate_reader.curated-v1");
    const withChoice: SetupAnswerRecord[] = [
      ...answers,
      {
        ordinal: 4,
        questionKey: mayor!.item.key,
        choiceId: "sign-14-days",
      },
    ];
    expect(
      nextQuestionnaireStep({
        worldSeed: "ohio",
        personKey: "same-player",
        depth: "short",
        selectionVersion: "curated-v1",
        life: CHILD,
        answers: withChoice,
      })?.item.key,
    ).toBe("hypothetical_mayor_plate_reader_why_14.curated-v1");
    expect(
      nextQuestionnaireStep({
        worldSeed: "ohio",
        personKey: "same-player",
        depth: "short",
        selectionVersion: "curated-v1",
        life: CHILD,
        answers: [...answers, { ...withChoice[3]!, choiceId: "decline" }],
      })?.item.key,
    ).not.toBe("hypothetical_mayor_plate_reader_why_14.curated-v1");
  });

  it("leaves the original fixed opening available to older saves", () => {
    const old = projectQuestionnaireSequence({
      worldSeed: "ohio",
      personKey: "same-player",
      depth: "short",
      life: CHILD,
      answers: [],
    });
    expect(old.slice(0, 3)).toEqual([
      "child_kitchen_late.text39-v1",
      "child_theo_took_it.text39-v1",
      "child_the_note.text39-v1",
    ]);
  });
});
