import { describe, expect, it } from "vitest";
import type { GroundedEnglishPacket } from "./grounded-english";
import {
  OPENING_SPEECH_BANK,
  composeOpeningSpeech,
  type OpeningSpeechKind,
} from "./english-opening-speech";

/**
 * The address is in the President's own voice (owner, Oct 24: "the speeches
 * should start being different based on the person and their personality and
 * the world"): the same facts said by a combative President and by a warm one
 * come out different, the combative one landing on braced lines more often
 * and the warm one on tender and glad ones, through the calibration table's
 * trait pulls. A trait never decides a line alone: every bearing is still
 * said by both.
 */
const facts: Record<string, string> = {
  "unemployment-rate": "4.1",
  "jobs-added": "1.9 million",
  "unemployment-down": "yes",
  "jobs-up": "yes",
  goal: "raise teacher minimum salary",
  name: "Okafor",
  place: "Ohio",
};

const packet = (worldSeed: string): GroundedEnglishPacket => {
  const grounded = Object.fromEntries(
    Object.entries(facts).map(([key, text]) => [
      key,
      { text, sourceRecordIds: [`record:${key}`] },
    ]),
  );
  return {
    surface: "dialogue",
    momentKey: `opening:${worldSeed}`,
    worldSeed,
    bankVersion: "words-opening-speech-v1",
    stage: "chair-female",
    sourceRecordIds: ["record:speech"],
    facts: grounded,
    speaker: { personId: "president", traits: {} },
    knowledge: Object.entries(grounded).map(([factKey, fact]) => ({
      personId: "president",
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  } as unknown as GroundedEnglishPacket;
};

// Two profiles on the traits officials are drawn with (officials.json).
const combative = {
  "people-mind-v1:conflict": 2,
  "people-mind-v1:risk": 2,
  "people-mind-v1:sociability": -2,
  "people-mind-v1:deliberation": -2,
};
const warm = {
  "people-mind-v1:conflict": -2,
  "people-mind-v1:risk": -1,
  "people-mind-v1:sociability": 2,
  "people-mind-v1:deliberation": 1,
};

/** Each bank sentence as said with these facts, to its bearing. */
const bearingOf = new Map(
  OPENING_SPEECH_BANK.parts.map((part) => [
    part.text.replace(/\{(\w+)\}/g, (_all, slot: string) => {
      return facts[slot.replace(/_/g, "-")] ?? `{${slot}}`;
    }),
    (part as { bearing?: string }).bearing ?? "none",
  ]),
);

function bearings(
  kind: OpeningSpeechKind,
  traits: Record<string, number>,
  worlds: readonly string[],
) {
  const counts: Record<string, number> = {};
  const texts: string[] = [];
  for (const world of worlds) {
    const speech = composeOpeningSpeech(packet(world), kind, traits)!;
    expect(speech, world).not.toBeNull();
    for (const sentence of speech.flatMap((section) => section.sentences)) {
      const bearing = bearingOf.get(sentence);
      expect(bearing, sentence).toBeDefined();
      counts[bearing!] = (counts[bearing!] ?? 0) + 1;
    }
    texts.push(speech.map((section) => section.text).join(" "));
  }
  return { counts, texts };
}

describe("the opening address in the President's voice", () => {
  const worlds = Array.from({ length: 60 }, (_, at) => `world-${at}`);

  for (const kind of ["inaugural", "state-of-the-union"] as const) {
    it(`changes with the President's traits (${kind})`, () => {
      const hard = bearings(kind, combative, worlds);
      const soft = bearings(kind, warm, worlds);
      // The same world's address differs between the two Presidents.
      const differ = worlds.filter(
        (_, at) => hard.texts[at] !== soft.texts[at],
      );
      expect(differ.length).toBeGreaterThan(worlds.length / 2);
      // Braced lines from the combative one, warm lines from the warm one.
      const share = (counts: Record<string, number>, keys: string[]) =>
        keys.reduce((sum, key) => sum + (counts[key] ?? 0), 0) /
        Object.values(counts).reduce((sum, n) => sum + n, 0);
      expect(share(hard.counts, ["braced"])).toBeGreaterThan(
        share(soft.counts, ["braced"]),
      );
      expect(share(soft.counts, ["tender", "glad"])).toBeGreaterThan(
        share(hard.counts, ["tender", "glad"]),
      );
      // A trait pulls, never bans: the warm President still says a braced line.
      expect(soft.counts.braced ?? 0).toBeGreaterThan(0);
    });
  }

  it("is the plain stable pick when the President has no recorded traits", () => {
    const plain = composeOpeningSpeech(packet("world-0"), "inaugural");
    expect(composeOpeningSpeech(packet("world-0"), "inaugural", {})).toEqual(
      plain,
    );
  });
});
