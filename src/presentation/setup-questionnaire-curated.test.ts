import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  decodeReplayDescriptor,
  encodeReplayDescriptor,
} from "./new-game-identity";
import {
  answerQuestionnaire,
  questionnaireContentNote,
  questionnairePathCeiling,
  questionnairePathNote,
  questionnaireScreenFor,
} from "./setup-questionnaire-flow";

describe("withdrawn setup questionnaire copy", () => {
  const setup = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "withdrawn-setup-copy",
    startAge: 5,
    questionnaire: "short" as const,
  };

  it("offers no old question, path copy, or answer on either former route", () => {
    for (const path of ["short", "deep"] as const) {
      const selected = { ...setup, questionnaire: path };
      expect(questionnairePathCeiling(path, selected)).toBe(0);
      expect(questionnairePathNote(path, selected)).toBe("");
      expect(questionnaireScreenFor(selected)).toBeNull();
      expect(answerQuestionnaire(selected, "anything")).toEqual(selected);
    }
    expect(questionnaireContentNote()).toBe("");
  });

  it("keeps existing replay descriptor fields without resurfacing their copy", () => {
    const restored = decodeReplayDescriptor(encodeReplayDescriptor(setup));
    expect(restored?.questionnaireSelectionVersion).toBe("curated-v1");
    expect(restored?.questionnaire).toBe("short");
    expect(questionnaireScreenFor(restored!)).toBeNull();
  });
});
