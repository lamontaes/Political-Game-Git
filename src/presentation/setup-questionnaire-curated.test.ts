import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  decodeReplayDescriptor,
  encodeReplayDescriptor,
} from "./new-game-identity";
import {
  answerQuestionnaire,
  questionnairePathCeiling,
  questionnairePathNote,
  questionnaireScreenFor,
} from "./setup-questionnaire-flow";

describe("current questionnaire setup and replay", () => {
  it("offers the five-question and ten-to-twelve-question routes", () => {
    const setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "curated-setup-proof",
      placeKey: "alaska",
      startAge: 5,
    };
    expect(setup.questionnaireSelectionVersion).toBe("curated-v1");
    expect(questionnairePathCeiling("short", setup)).toBe(5);
    expect(questionnairePathCeiling("deep", setup)).toBeGreaterThanOrEqual(10);
    expect(questionnairePathCeiling("deep", setup)).toBeLessThanOrEqual(12);
    expect(questionnairePathNote("deep", setup)).toContain("10 to 12");
  });

  it("round trips the new selection rule without assigning it to old setups", () => {
    const setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "curated-replay-proof",
      placeKey: "maine",
    };
    expect(
      decodeReplayDescriptor(encodeReplayDescriptor(setup))
        ?.questionnaireSelectionVersion,
    ).toBe("curated-v1");
    const { questionnaireSelectionVersion: _selectionVersion, ...oldSetup } =
      setup;
    expect(
      decodeReplayDescriptor(encodeReplayDescriptor(oldSetup))
        ?.questionnaireSelectionVersion,
    ).toBeUndefined();
  });

  it("assembles the five-year-old route through the mayor question", () => {
    let setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "alaska-real-screen",
      placeKey: "alaska",
      startAge: 5,
      questionnaire: "short" as const,
    };
    const seen: string[] = [];
    while (true) {
      const screen = questionnaireScreenFor(setup);
      if (!screen) break;
      seen.push(screen.questionKey);
      if (seen.length === 4) {
        expect(screen.prompt).toContain(
          "imagine yourself as mayor of a fictional American city",
        );
        expect(screen.options.map((option) => option.text)).toContain(
          "Sign the 14-day agreement",
        );
      }
      setup = answerQuestionnaire(
        setup,
        seen.length === 4 ? "sign-14-days" : (screen.options[0]?.key ?? null),
      );
      if (seen.length === 4) {
        expect(questionnaireScreenFor(setup)?.prompt).toBe(
          "If you would choose 14 days, what would matter most to you?",
        );
      }
    }
    expect(seen).toHaveLength(5);
  });
});
