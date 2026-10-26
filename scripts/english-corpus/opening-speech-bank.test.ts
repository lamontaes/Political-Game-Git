import { describe, expect, it } from "vitest";
import type { GroundedEnglishPacket } from "../../src/english/grounded-english";
import {
  OPENING_SPEECH_BANK,
  composeOpeningSpeech,
  openingSpeechKind,
  type OpeningSpeechKind,
} from "./opening-speech-bank";

/**
 * The opening speech composed by the English engine's `composeAddress` from
 * the mined presidential sentences: it opens and closes, every sentence is a
 * mined one with its slots filled from the world's facts, and a claim about
 * the country is said only when the world records it.
 */
const worldFacts: Record<string, string> = {
  "unemployment-rate": "4.1",
  "inflation-rate": "2.9",
  "growth-rate": "2.8",
  "jobs-added": "2.2 million",
  jobless: "7 million",
  population: "341 million",
  "national-debt": "$36 trillion",
  "deficit-cut": "$200 billion",
  "unemployment-down": "yes",
  "jobs-up": "yes",
  "wages-up": "yes",
  "growth-up": "yes",
  "inflation-down": "yes",
  name: "Dana Whitfield",
  goal: "fix the roads",
  issue: "the economy",
  place: "Elwood",
};
const packet = (
  stage: string,
  facts: Record<string, string>,
): GroundedEnglishPacket => {
  const grounded = Object.fromEntries(
    Object.entries(facts).map(([key, text]) => [
      key,
      { text, sourceRecordIds: [`record:${key}`] },
    ]),
  );
  return {
    surface: "dialogue",
    momentKey: "words-opening",
    worldSeed: "words-opening",
    bankVersion: "words-opening-speech-v1",
    stage,
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

const patterns = OPENING_SPEECH_BANK.parts.map(
  (part) =>
    new RegExp(
      `^${part.text
        .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
        .replace(/\{\w+\}/g, ".+")}$`,
      "i",
    ),
);

describe("the opening speech", () => {
  for (const kind of ["state-of-the-union", "inaugural"] as const)
    for (const stage of ["chair-male", "chair-female"])
      it(`composes the ${kind} (${stage}) from mined sentences`, () => {
        const speech = composeOpeningSpeech(packet(stage, worldFacts), kind);
        expect(speech, kind).not.toBeNull();
        expect(speech![0]!.level).toBe("salutation");
        expect(speech!.at(-1)!.level).toBe("close");
        for (const section of speech!)
          for (const sentence of section.sentences) {
            expect(
              patterns.some((pattern) => pattern.test(sentence)),
              sentence,
            ).toBe(true);
            expect(sentence).not.toMatch(/\{/);
          }
        const text = speech!.map((section) => section.text).join(" ");
        if (stage === "chair-male") expect(text).not.toMatch(/Madam Speaker/);
        else expect(text).not.toMatch(/Mr\. Speaker/);
      });

  it("reports the world's numbers only when the world records them", () => {
    const kind: OpeningSpeechKind = "state-of-the-union";
    const full = composeOpeningSpeech(packet("chair-male", worldFacts), kind)!;
    const country = full.find((section) => section.level === "country");
    expect(country?.text).toMatch(/4\.1|2\.9|2\.8|2\.2 million|\$36 trillion/);
    const bare = composeOpeningSpeech(
      packet("chair-male", { name: "Dana Whitfield" }),
      kind,
    )!;
    expect(bare.find((section) => section.level === "country")).toBeUndefined();
  });

  it("opens with the inaugural in an inauguration year", () => {
    expect(openingSpeechKind(2029)).toBe("inaugural");
    expect(openingSpeechKind(2027)).toBe("state-of-the-union");
  });
});
