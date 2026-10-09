import { describe, expect, it } from "vitest";
import storyVoiceData from "../../data/english/story-voice.json" with { type: "json" };
import { SITUATION_TYPES } from "../simulation/story/situations";
import type { EntityId } from "../simulation/types";
import type { EnglishBank } from "./bank-english";
import { SPEECH_ACTS } from "./english-composition";
import type { PartGradeLedger } from "./english-grades";
import {
  STORY_SLOTS,
  STORY_VOICE,
  voiceStoryLine,
  type StoryLinePacket,
  type StoryVoice,
} from "./story-voice";

/**
 * The story's voice words a speech act from the banks its fits name, with the
 * records' facts in the slots, and says nothing when no part fits. The bank
 * here is a test bank: the story's own banks are the English engine's lane.
 */

const part = (key: string, move: string, text: string) => ({
  key: `test.${move}.${key}`,
  move,
  kind: "spoken",
  text,
  shippable: true,
});

const BANK: EnglishBank = {
  parts: [
    part("thanks", "thanks", "Thanks."),
    part("thanks-name", "thanks", "Thanks, {name}."),
    part("news", "news", "There is something you should know."),
    part("tell", "tell", "Listen."),
  ],
};

const VOICE: StoryVoice = {
  fits: {
    thank: ["test:thanks"],
    "tell@news-arrives": ["test:news"],
    tell: ["test:tell"],
  },
  banks: { test: BANK },
};

function packet(overrides: Partial<StoryLinePacket> = {}): StoryLinePacket {
  return {
    act: "thank",
    typeKey: "reach-out",
    speakerPersonId: "person_a" as EntityId,
    listenerPersonId: "person_b" as EntityId,
    facts: {},
    sourceRecordIds: ["event_1" as EntityId],
    momentKey: "binding_1:thank",
    ...overrides,
  };
}

describe("the story's voice", () => {
  it("words an act from a bank move its fits name, keeping the records it came from", () => {
    const line = voiceStoryLine(packet(), VOICE);
    expect(line).toEqual({
      text: "Thanks.",
      parts: ["bank:test.thanks.thanks"],
      sourceRecordIds: ["event_1"],
    });
  });

  it("fills a slot only from the records, and leaves out a part whose slot is empty", () => {
    const texts = new Set(
      Array.from(
        { length: 40 },
        (_, index) =>
          voiceStoryLine(
            packet({ facts: { name: "Audrey" }, momentKey: `m${index}` }),
            VOICE,
          )!.text,
      ),
    );
    expect(texts).toEqual(new Set(["Thanks.", "Thanks, Audrey."]));
    for (let index = 0; index < 40; index += 1)
      expect(
        voiceStoryLine(packet({ momentKey: `m${index}` }), VOICE)!.text,
      ).toBe("Thanks.");
  });

  it("prefers a part filed for the situation type over the act's own", () => {
    expect(
      voiceStoryLine(packet({ act: "tell", typeKey: "news-arrives" }), VOICE)!
        .text,
    ).toBe("There is something you should know.");
    expect(
      voiceStoryLine(packet({ act: "tell", typeKey: "reach-out" }), VOICE)!
        .text,
    ).toBe("Listen.");
  });

  it("says the same line for the same moment, and nothing for an act no bank words", () => {
    const once = voiceStoryLine(packet({ facts: { name: "Audrey" } }), VOICE);
    const again = voiceStoryLine(packet({ facts: { name: "Audrey" } }), VOICE);
    expect(again).toEqual(once);
    expect(voiceStoryLine(packet({ act: "farewell" }), VOICE)).toBeNull();
  });

  it("does not choose a part the owner graded down", () => {
    const held: PartGradeLedger = {
      schema: "english-part-grades/1",
      batches: ["batch-test"],
      parts: {
        "test.thanks.thanks": {
          good: 0,
          bad: 1,
          fix: 0,
          sharedGood: 0,
          sharedBad: 0,
          sharedFix: 0,
        },
      },
    };
    expect(voiceStoryLine(packet(), VOICE, held)).toBeNull();
  });

  it("ships fits that name only registered banks, speech acts on the engine's list and real situation types", () => {
    const types = new Set(SITUATION_TYPES.map((type) => type.key));
    const problems: string[] = [];
    for (const [key, fits] of Object.entries(STORY_VOICE.fits)) {
      const [act, type] = key.split("@");
      if (!(SPEECH_ACTS as readonly string[]).includes(act!))
        problems.push(`${key}: ${act} is not a speech act`);
      if (type !== undefined && !types.has(type))
        problems.push(`${key}: ${type} is not a situation type`);
      for (const fit of fits) {
        const [register, move] = fit.split(":");
        const bank = STORY_VOICE.banks[register!];
        if (!bank) problems.push(`${key}: no bank ${register}`);
        else if (!bank.parts.some((entry) => entry.move === move))
          problems.push(`${key}: ${register} has no move ${move}`);
      }
    }
    expect(problems).toEqual([]);
    expect(STORY_SLOTS).toEqual(Object.keys(storyVoiceData.slots));
    expect(STORY_SLOTS).toEqual([
      "name",
      "about",
      // What a recall carries from the shared moment's records (part 5).
      "recalled",
      "yearsAgo",
      "placeThen",
      "speakerAgeThen",
      "listenerAgeThen",
    ]);
  });
});
