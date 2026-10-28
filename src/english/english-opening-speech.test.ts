import { describe, expect, it } from "vitest";
import { composeAddress } from "./english-composition";
import {
  OPENING_SPEECH_BANK,
  openingMove,
  type OpeningSpeechKind,
  type SpeechVoice,
} from "./english-opening-speech";
import type { GroundedEnglishPacket } from "./grounded-english";

/**
 * The opening address's pieces hold no figure and no law (owner, Oct 27: "the
 * unemployment is at 4.1%, the fact that I know that is ridiculous ... if
 * there are 58 laws, there are 58 choices"): every number, policy and place
 * is a slot, every claim a required fact, and a piece is said only where its
 * fact is held. A figure written into a piece fails here.
 */
const KINDS: OpeningSpeechKind[] = ["inaugural", "state-of-the-union"];
const VOICES: SpeechVoice[] = ["polished", "plain"];

const packet = (facts: Record<string, string>): GroundedEnglishPacket => {
  const grounded = Object.fromEntries(
    Object.entries(facts).map(([key, text]) => [
      key,
      { text, sourceRecordIds: [`record:${key}`] },
    ]),
  );
  return {
    surface: "dialogue",
    momentKey: "opening-test",
    worldSeed: "opening-test",
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

const said = (
  kind: OpeningSpeechKind,
  voice: SpeechVoice,
  role: string,
  facts: Record<string, string>,
  options: { topic?: string } = {},
): string | null => {
  const move = openingMove(kind, voice, role, options);
  if (!move) return null;
  const result = composeAddress(packet(facts), "election-night", [move]);
  return result.kind === "rendered" ? result.text : null;
};

describe("the opening address's pieces", () => {
  it("hold no figure, year, state or office", () => {
    for (const part of OPENING_SPEECH_BANK.parts) {
      expect(part.text, part.key).not.toMatch(/\d/);
      expect(part.text, part.key).not.toMatch(
        /\b(?:Pennsylvania|Ohio|Texas|California|Florida|Congress shall)\b/,
      );
    }
  });

  it("require, for every slot, the fact that fills it", () => {
    for (const part of OPENING_SPEECH_BANK.parts) {
      const slots = [...part.text.matchAll(/\{([\w-]+)\}/g)].map(
        (match) => match[1]!,
      );
      for (const use of part.uses)
        for (const slot of slots)
          expect(use.requiresFacts ?? [], part.key).toContain(slot);
    }
  });

  it("has a polished and a plain version of every role, for both kinds of address", () => {
    for (const kind of KINDS) {
      const roles = new Set(
        OPENING_SPEECH_BANK.parts.flatMap((part) =>
          part.uses
            .filter((use) => use.subject === kind)
            .map((use) => use.role),
        ),
      );
      expect(roles.size).toBeGreaterThan(10);
      for (const role of roles)
        for (const voice of VOICES)
          expect(
            OPENING_SPEECH_BANK.parts.filter(
              (part) =>
                part.voice === voice &&
                part.uses.some(
                  (use) => use.subject === kind && use.role === role,
                ),
            ).length,
            `${kind} ${role} ${voice}`,
          ).toBeGreaterThan(0);
    }
  });

  it("says a figure from the fact it is given, in the speaker's manner", () => {
    for (const kind of KINDS) {
      const facts = { "inflation-rate": "7.3", "inflation-up": "yes" };
      const polished = said(kind, "polished", "story-fig", facts, {
        topic: "inflation",
      });
      const plain = said(kind, "plain", "story-fig", facts, {
        topic: "inflation",
      });
      expect(polished).toContain("7.3");
      expect(plain).toContain("7.3");
      expect(polished).not.toBe(plain);
    }
  });

  it("says a claim only where its fact is held", () => {
    // No fact, no sentence: the country's story cannot be told without its record.
    expect(
      said("inaugural", "plain", "story-fig", {}, { topic: "unemployment" }),
    ).toBeNull();
    // A law that is not in force is never said to be.
    // The address is national only (owner, Oct 27): federal law.
    const base = {
      about: "rent stabilization",
      "federal-level": "yes",
    };
    const out = said("inaugural", "polished", "law", {
      ...base,
      "law-not-in-force": "yes",
    })!;
    expect(out).toContain("rent stabilization");
    expect(out).not.toMatch(/already|yes/);
    expect(said("inaugural", "polished", "law", base)).toBeNull();
  });
});
