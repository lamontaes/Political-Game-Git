import { describe, expect, it } from "vitest";
import { composeAddress } from "./english-composition";
import {
  OPENING_SPEECH_BANK,
  openingMove,
  type OpeningSpeechKind,
  type SpeechVoice,
  partHolds,
  partValues,
} from "./english-opening-speech";
import type { GroundedEnglishPacket } from "./grounded-english";

/**
 * The opening address's pieces hold no figure and no law (owner, Oct 27: "the
 * unemployment is at 4.1%, the fact that I know that is ridiculous ... if
 * there are 58 laws, there are 58 choices"; Nov 1: "I don't like where this
 * part of the speech where it just laces statistics"): the year is told in
 * words, every policy and name is a slot, every claim a required fact, and a
 * piece is said only where its fact is held. A figure, written in or slotted,
 * fails here, and so does any line the owner turned down.
 */
// How far a subject moved is said in words ("rose a little"), never as a
// figure, so a `change-` slot is no figure even when its subject is growth.
const FIGURE_SLOT = /\{(?!change-)[\w-]*(?:rate|growth|added|percent)\}/;
/** Lines the owner turned down in the v0.73.0 playtest (OWNER-DECISIONS, Nov 1 22:25). */
const TURNED_DOWN = [
  /government closest to the people/,
  /everyone who did, and of everyone who did not/,
  /^Too many people/,
  /^To every family listening/,
  /^Thank you, and may God bless the United States\.$/,
  /^By most (?:measures|of the numbers)/,
];
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
  it("hold no figure, year, state or office, and no line the owner turned down", () => {
    for (const part of OPENING_SPEECH_BANK.parts) {
      expect(part.text, part.key).not.toMatch(/\d|percent/);
      expect(part.text, part.key).not.toMatch(FIGURE_SLOT);
      for (const line of TURNED_DOWN)
        expect(part.text, part.key).not.toMatch(line);
      expect(part.text, part.key).not.toMatch(
        /\b(?:Pennsylvania|Ohio|Texas|California|Florida|Congress shall)\b/,
      );
    }
  });

  it("keep short sentences: a third of each move's cores in the President's address are twelve words or fewer, each with its insert", () => {
    // The words lead's read (Nov 11): the old address had lines like "If you
    // want a job, you ought to be able to get one."; the new cores were all long.
    const groups = new Map<string, string[]>();
    for (const part of OPENING_SPEECH_BANK.parts) {
      if (part.piece?.part !== "core") continue;
      for (const use of part.uses) {
        if (!KINDS.includes(use.subject as OpeningSpeechKind)) continue;
        // A piece said in several voices or topics counts in each.
        const topics = partValues(part.topic);
        for (const voice of partValues(part.voice))
          for (const topic of topics.length ? topics : [""]) {
            const key = [
              use.subject,
              use.role,
              part.addressKind ?? "",
              voice,
              topic,
              (use.requiresFacts ?? [])
                .filter((fact) => !part.text.includes(`{${fact}}`))
                .sort()
                .join("+"),
            ].join(" ");
            groups.set(key, [...(groups.get(key) ?? []), part.text]);
          }
      }
    }
    const thin = [...groups]
      .filter(
        ([, texts]) =>
          texts.filter((text) => text.split(/\s+/).length <= 12).length * 3 <
          texts.length,
      )
      .map(([key]) => key);
    expect(thin).toEqual([]);
  });

  it("word hard news and good news apart, and send Congress a bill, not a subject", () => {
    // The words lead's second read (Nov 11): "they'll beat pay" and "if
    // Congress sends me legal cannabis sales".
    const words = (end: string) =>
      new Set(
        OPENING_SPEECH_BANK.parts
          .filter((part) => part.move === "subject")
          .filter((part) =>
            partValues(part.topic).some((topic) => topic.endsWith(end)),
          )
          .map((part) => part.text),
      );
    const hard = words(":hard");
    const good = words(":good");
    expect(hard.size).toBeGreaterThan(10);
    expect(good.size).toBeGreaterThan(10);
    expect([...hard].filter((text) => good.has(text))).toEqual([]);
    for (const part of OPENING_SPEECH_BANK.parts)
      expect(part.text, part.key).not.toMatch(
        /\b(?:sign|veto|sends? me|pass(?:es)?)\s+\{(?:about|first-about)\}/i,
      );
  });

  it("put the year's trouble only where a trouble fits", () => {
    // The words lead's third read (Nov 11): "A shrinking paycheck is next on
    // the list, and I think we're ready for it." (next is the work, not the
    // trouble) and "the ones still stuck on inflation" (nobody is stuck on it).
    const misfits = [
      /(?<!fixing )\{hardest\} is next\b/i,
      /\bready for \{hardest\}/i,
      /\bstuck on \{hardest\}/i,
      /\bthe list is \{hardest\}/i,
      /\{hardest\} is the work\b/i,
    ];
    for (const part of OPENING_SPEECH_BANK.parts)
      for (const misfit of misfits)
        expect(part.text, part.key).not.toMatch(misfit);
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
                partHolds(part.voice, voice) &&
                part.uses.some(
                  (use) => use.subject === kind && use.role === role,
                ),
            ).length,
            `${kind} ${role} ${voice}`,
          ).toBeGreaterThan(0);
    }
  });

  it("tells the country's year in words, in the speaker's manner", () => {
    for (const kind of KINDS) {
      const facts = {
        "inflation-up": "yes",
        "prices-up": "yes",
        "change-inflation": "sharply",
      };
      const polished = said(kind, "polished", "story-says", facts, {
        topic: "inflation",
      });
      const plain = said(kind, "plain", "story-says", facts, {
        topic: "inflation",
      });
      expect(polished).toMatch(/price|cost|inflation|pay for/i);
      expect(plain).toMatch(/price|cost|inflation|pay for/i);
      expect(polished).not.toMatch(/\d/);
      expect(polished).not.toBe(plain);
    }
  });

  it("says a claim only where its fact is held", () => {
    // No fact, no sentence: the country's story cannot be told without its record.
    expect(
      said("inaugural", "plain", "story-says", {}, { topic: "unemployment" }),
    ).toBeNull();
    // A priority is asked of Congress only where federal law does not have
    // it yet (owner, Oct 27: national only), in one sentence that names it.
    const base = {
      about: "rent stabilization",
      to: "stabilize rents",
      "stance-against": "yes",
      "rank-line": "yes",
    };
    const out = said("inaugural", "polished", "ask", {
      ...base,
      "law-not-in-force": "yes",
    })!;
    expect(out).toContain("rent stabilization");
    expect(out.split("rent stabilization").length - 1).toBe(1);
    expect(said("inaugural", "polished", "ask", base)).toBeNull();
  });
});

// A wording that reads the same in two voices or two topics is one piece that
// lists them (the bank holds a text once; red on main after #8743).
describe("one piece for every voice and topic it is said in", () => {
  it("holds a value or a list", () => {
    expect(partHolds("plain", "plain")).toBe(true);
    expect(partHolds(["plain", "polished"], "polished")).toBe(true);
    expect(partHolds(["plain"], "polished")).toBe(false);
    expect(partHolds(undefined, "plain")).toBe(false);
    expect(partValues(undefined)).toEqual([]);
    expect(partValues("wages")).toEqual(["wages"]);
  });
  it("keeps each text once, and a shared one serves both voices", () => {
    const texts = OPENING_SPEECH_BANK.parts.map((part) =>
      part.text.toLowerCase(),
    );
    expect(new Set(texts).size).toBe(texts.length);
    const shared = OPENING_SPEECH_BANK.parts.filter(
      (part) => partValues(part.voice).length > 1,
    );
    expect(shared.length).toBeGreaterThan(0);
    for (const part of shared) {
      expect(partHolds(part.voice, "plain"), part.key).toBe(true);
      expect(partHolds(part.voice, "polished"), part.key).toBe(true);
    }
  });
});
