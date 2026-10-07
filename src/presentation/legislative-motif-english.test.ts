import { describe, expect, it } from "vitest";

import { createStableId, reachInSpeech, reachInSummary } from "../simulation";
import { nameOnce } from "./english-grammar";
import {
  ENGLISH_MOTIF_FAMILIES,
  MOTIF_ENGLISH_BANKS,
  MOTIF_STATE_FACTS,
  composeMotifEnglish,
  motifEnglishPacket,
  type MotifEnglishInput,
  type MotifFactKey,
  type MotifVoice,
} from "./legislative-motif-english";
import type { GroundedEnglishFact } from "./grounded-english";
import {
  eligibleMotifVariantKeys,
  legislativeMotifLine,
  motifFamilies,
  type LegislativeMotifContext,
} from "./legislative-dialogue-motifs";
import { observerPlace } from "./observer-world";

/**
 * A160 parts 2 to 4: every bargaining beat is worded by the English engine from
 * their fact packets. Every part of every line copies a packet fact, and a
 * line asserts a state of the bill (nothing written for a place, a section
 * put in) only when the packet records it. The place is drawn from all 56 by
 * the seed.
 */
const SEED = "a160-motifs-part-2-1";
const place = observerPlace(SEED);

const VOICES: readonly MotifVoice[] = [
  "district-advocate",
  "fiscal-guardian",
  "implementation-realist",
  "procedural-institutionalist",
];
const speaker = createStableId("person", "a160b:speaker");
const listener = createStableId("person", "a160b:listener");
const measure = createStableId("legislative-measure", "a160b:measure");
const provision = createStableId("legislative-provision", "a160b:provision");
const analyst = createStableId("person", "a160b:analyst");

const ALWAYS = {
  designation: { text: "HB 214", sourceRecordIds: [measure] },
  listener: { text: "Ward", sourceRecordIds: [listener] },
  "section-label": { text: "Section 4", sourceRecordIds: [measure] },
  chamber: { text: "House of Representatives", sourceRecordIds: [measure] },
  "next-step": { text: "third reading", sourceRecordIds: [measure] },
  "section-heading": {
    text: "Local project match",
    sourceRecordIds: [measure],
  },
} as const;

const OPTIONAL: Readonly<Partial<Record<MotifFactKey, GroundedEnglishFact>>> = {
  beneficiary: {
    text: `the ${place.displayName} Transit Authority`,
    sourceRecordIds: [measure],
  },
  place: { text: place.displayName, sourceRecordIds: [measure] },
  amount: { text: "$600,000", sourceRecordIds: [measure] },
  "bill-amount": { text: "$8,600,000", sourceRecordIds: [provision] },
  analyst: { text: "Rowe", sourceRecordIds: [analyst] },
  reach: {
    text: "covers every eligible rider",
    sourceRecordIds: [measure],
  },
  "prior-statement": {
    text: "“Fix Section 4 and I'm with you.”",
    sourceRecordIds: [speaker],
  },
  "stated-ground": {
    text: "The authority cannot raise the match from fare revenue.",
    sourceRecordIds: [measure],
  },
};

/** The states a line may assert; one at a time, as in the room. */
const STATES = [
  {},
  { "section-absent": { text: "absent", sourceRecordIds: [measure] } },
  { "section-adopted": { text: "adopted", sourceRecordIds: [provision] } },
  { "answering-a-hold": { text: "answering", sourceRecordIds: [listener] } },
] as const;

function input(
  family: MotifEnglishInput["family"],
  voice: MotifVoice,
  turn: number,
  optional: boolean,
  state: (typeof STATES)[number],
): MotifEnglishInput {
  return {
    family,
    voice,
    worldSeed: SEED,
    speakerTraits: {},
    listenerTraits: {},
    momentKey: `turn-${turn}`,
    speakerPersonId: speaker,
    listenerPersonId: listener,
    facts: { ...ALWAYS, ...(optional ? OPTIONAL : {}), ...state },
  };
}

const SLOT = /\{\{([a-z][a-z0-9-]*)\}\}/g;

describe(`bargaining beats worded from their packets (${place.displayName}, ${place.key}, seed ${SEED})`, () => {
  it("writes every part of every bank from a fact slot", () => {
    for (const bank of MOTIF_ENGLISH_BANKS)
      for (const [part, partBank] of Object.entries(bank.parts))
        for (const variant of partBank!.variants) {
          const where = `${bank.key}:${part}:${variant.key}`;
          expect(variant.kind, where).toBe("template");
          if (variant.kind === "template")
            expect(variant.text, where).toMatch(SLOT);
        }
  });

  it("cites a packet fact in every part of every line, and asserts only recorded states", () => {
    const seen = new Set<string>();
    let lines = 0;
    for (const family of ENGLISH_MOTIF_FAMILIES)
      for (const voice of VOICES)
        for (const optional of [true, false])
          for (const state of STATES)
            for (let turn = 0; turn < 16; turn += 1) {
              const row = input(family, voice, turn, optional, state);
              const packet = motifEnglishPacket(row);
              const line = composeMotifEnglish(row);
              lines += 1;
              for (const part of line.parts) {
                seen.add(part.partKey);
                expect(part.usedFactKeys.length, part.partKey).toBeGreaterThan(
                  0,
                );
                for (const key of part.usedFactKeys) {
                  const fact = packet.facts[key];
                  expect(fact, `${part.partKey} cites ${key}`).toBeDefined();
                  for (const id of fact!.sourceRecordIds)
                    expect(line.sourceRecordIds).toContain(id);
                }
              }
              // Nothing the packet lacks reaches the line.
              if (!optional) {
                expect(line.text).not.toContain(place.displayName);
                expect(line.text).not.toContain("$");
              }
              if (!("section-absent" in state))
                expect(line.text).not.toMatch(/nowhere in|Nothing in it/);
              if (!("section-adopted" in state))
                expect(line.text).not.toMatch(/you put .* in for/);
              if (!("answering-a-hold" in state))
                expect(line.text).not.toMatch(/^Then write it in/);
              if (!optional) expect(line.text).not.toContain("in this room:");
            }
    expect(lines).toBe(ENGLISH_MOTIF_FAMILIES.length * 4 * 2 * 4 * 16);
    const all = MOTIF_ENGLISH_BANKS.flatMap((bank) =>
      Object.entries(bank.parts).flatMap(([part, partBank]) =>
        partBank!.variants.map(
          (variant) => `${bank.key}:${part}:${variant.key}`,
        ),
      ),
    );
    expect([...seen].sort()).toEqual([...all].sort());
  });

  it("copies each slot's fact text into its part", () => {
    for (const family of ENGLISH_MOTIF_FAMILIES) {
      const row = input(family, "district-advocate", 3, true, STATES[1]);
      const packet = motifEnglishPacket(row);
      const line = composeMotifEnglish(row);
      for (const part of line.parts)
        for (const key of part.usedFactKeys) {
          const fact = packet.facts[key]!;
          // A state fact backs an assertion; a word fact is copied.
          if (
            key !== "section-absent" &&
            key !== "section-adopted" &&
            key !== "answering-a-hold"
          )
            expect(part.text, `${part.partKey}/${key}`).toContain(fact.text);
        }
      // The same turn says the same words.
      expect(composeMotifEnglish(row).text).toBe(line.text);
    }
  });
});

describe("the bargaining room speaks these beats through the engine", () => {
  const context = (
    family: (typeof ENGLISH_MOTIF_FAMILIES)[number],
    adopted: boolean,
  ): LegislativeMotifContext => ({
    family,
    voice: "district-advocate",
    audience: "limited",
    priorFamily: null,
    variantSeed: `a160b:${family}`,
    facts: {
      speaker: "Hollis",
      listener: "Ward",
      designation: "HB 214",
      shortTitle: "Transit Access Pilot",
      sectionLabel: "Section 4",
      sectionHeading: "Local project match",
      reach: { relation: "reaching", who: "every eligible rider" },
      beneficiary: `the ${place.displayName} Transit Authority`,
      place: place.displayName,
      amount: "$600,000",
      billAmount: "$8,600,000",
      analyst: "Rowe",
      chamber: "House of Representatives",
      nextStep: "third reading",
      priorStatement: null,
      statedGround: "The authority cannot raise the match from fare revenue.",
    },
    grounding: {
      worldSeed: SEED,
      speakerTraits: {},
      listenerTraits: {},
      speakerPersonId: speaker,
      listenerPersonId: listener,
      measureId: measure,
      billAmountSourceIds: [measure],
      analystPersonId: analyst,
      requestedSection: { adoptedProvisionId: adopted ? provision : null },
    },
  });

  it("quotes an engine line for each converted beat, from the advocate's own bank first", () => {
    for (const family of ENGLISH_MOTIF_FAMILIES)
      for (const adopted of [false, true]) {
        const text = legislativeMotifLine(context(family, adopted));
        expect(text, family).toMatch(/^“.+”$/);
        const keys = eligibleMotifVariantKeys(context(family, adopted));
        expect(keys.length).toBeGreaterThan(0);
        expect(
          keys.every((key) => key.startsWith(`legislative.${family}`)),
        ).toBe(true);
        if (adopted) expect(text).not.toMatch(/nowhere in|Nothing in it/);
      }
    // With the section absent, the advocate says so about their own place.
    expect(
      legislativeMotifLine(context("district-beneficiary-concern", false)),
    ).toContain(place.displayName);
  });
});

describe("how the lines sound in the room", () => {
  const facts = {
    speaker: "Hollis",
    listener: "Ward",
    designation: "HB 214",
    shortTitle: "Transit Access Pilot",
    sectionLabel: "Section 4",
    sectionHeading: "Local project match",
    reach: { relation: "reaching" as const, who: "every eligible rider" },
    beneficiary: `the ${place.displayName} Transit Authority`,
    place: place.displayName,
    amount: "$600,000",
    billAmount: "$8,600,000",
    analyst: "Rowe",
    chamber: "House of Representatives",
    nextStep: "third reading",
    priorStatement: "“Fix Section 4 and I'm with you.”",
    statedGround: "The authority cannot raise the match from fare revenue.",
  };
  const grounding = (requested: "absent" | "adopted" | null) => ({
    worldSeed: SEED,
    speakerTraits: {},
    listenerTraits: {},
    speakerPersonId: speaker,
    listenerPersonId: listener,
    measureId: measure,
    billAmountSourceIds: [measure],
    analystPersonId: analyst,
    requestedSection:
      requested === null
        ? null
        : { adoptedProvisionId: requested === "adopted" ? provision : null },
  });

  it("names the bill once in a line and says who a section reaches as speech", () => {
    const reaching = {
      relation: "reaching",
      who: "every eligible rider",
    } as const;
    const writtenFor = {
      relation: "written-for",
      who: "the transit authority",
    } as const;
    // One fact, two readers: the bill summary and the legislator.
    expect(reachInSummary(reaching)).toBe(
      "language reaching every eligible rider",
    );
    expect(reachInSpeech(reaching)).toBe("covers every eligible rider");
    expect(reachInSummary(writtenFor)).toBe(
      "language written for the transit authority",
    );
    expect(reachInSpeech(writtenFor)).toBe(
      "is written for the transit authority",
    );
    let lines = 0;
    for (const family of motifFamilies())
      for (const voice of VOICES)
        for (const requested of [null, "absent", "adopted"] as const)
          for (const priorFamily of [null, "refuse-to-commit-yet"] as const)
            for (let turn = 0; turn < 8; turn += 1) {
              const line = legislativeMotifLine({
                family,
                voice,
                audience: "limited",
                priorFamily,
                variantSeed: `a160-sound:${turn}`,
                facts,
                grounding: grounding(requested),
              });
              lines += 1;
              const where = `${family}/${voice}/${requested}/${turn}`;
              expect(
                line.split("HB 214").length - 1,
                `${where}: ${line}`,
              ).toBeLessThanOrEqual(1);
              expect(line, where).not.toContain("written as language");
              expect(line, where).not.toMatch(/\blanguage reaching\b/);
            }
    expect(lines).toBe(motifFamilies().length * 4 * 3 * 2 * 8);
  });

  it("says a recorded state of the section wherever a bank has words for it", () => {
    for (const state of MOTIF_STATE_FACTS) {
      const families = ENGLISH_MOTIF_FAMILIES.filter((family) =>
        MOTIF_ENGLISH_BANKS.some(
          (bank) =>
            (bank.key === `legislative.${family}` ||
              bank.key.startsWith(`legislative.${family}.`)) &&
            Object.values(bank.parts).some((part) =>
              part!.variants.some((variant) =>
                (variant.requiresFacts ?? []).includes(state),
              ),
            ),
        ),
      );
      expect(families.length, state).toBeGreaterThan(0);
      for (const family of families)
        for (const voice of VOICES)
          for (let turn = 0; turn < 8; turn += 1) {
            const row = input(family, voice, turn, true, {
              [state]: { text: state, sourceRecordIds: [measure] },
            } as never);
            const line = composeMotifEnglish(row);
            expect(
              line.parts.some((part) => part.usedFactKeys.includes(state)),
              `${family}/${voice}/${state}: ${line.text}`,
            ).toBe(true);
          }
    }
  });
});

describe("a name said once in full", () => {
  it("shortens an ordinance after its first mention, capitalized at a sentence start", () => {
    expect(
      nameOnce(
        "I'll vote for Ordinance 12 if the fee holds. Ordinance 12 is what my ward asked for, and I'd defend Ordinance 12 anywhere.",
        "Ordinance 12",
        "the ordinance",
      ),
    ).toBe(
      "I'll vote for Ordinance 12 if the fee holds. The ordinance is what my ward asked for, and I'd defend the ordinance anywhere.",
    );
  });

  it("keeps a line that opens with the designation and shortens what follows", () => {
    expect(
      nameOnce(
        "HB 214 reads $8,600,000 now. Keep HB 214 there and I'm a yes.",
        "HB 214",
        "this bill",
      ),
    ).toBe("HB 214 reads $8,600,000 now. Keep this bill there and I'm a yes.");
    expect(nameOnce("Where are you on it?", "HB 214", "this bill")).toBe(
      "Where are you on it?",
    );
  });
});
