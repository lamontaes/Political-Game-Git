import { describe, expect, it } from "vitest";

import { createStableId } from "../simulation";
import {
  ENGLISH_MOTIF_FAMILIES,
  MOTIF_ENGLISH_BANKS,
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
  type LegislativeMotifContext,
} from "./legislative-dialogue-motifs";
import { observerPlace } from "./observer-world";

/**
 * A160 part 2: four bargaining beats are worded by the English engine from
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

const ALWAYS = {
  designation: { text: "HB 214", sourceRecordIds: [measure] },
  listener: { text: "Ward", sourceRecordIds: [listener] },
  "section-label": { text: "Section 4", sourceRecordIds: [measure] },
  chamber: { text: "House of Representatives", sourceRecordIds: [measure] },
  "next-step": { text: "third reading", sourceRecordIds: [measure] },
} as const;

const OPTIONAL: Readonly<Partial<Record<MotifFactKey, GroundedEnglishFact>>> = {
  beneficiary: {
    text: `the ${place.displayName} Transit Authority`,
    sourceRecordIds: [measure],
  },
  place: { text: place.displayName, sourceRecordIds: [measure] },
  amount: { text: "$600,000", sourceRecordIds: [measure] },
  "stated-ground": {
    text: "The authority cannot raise the match from fare revenue.",
    sourceRecordIds: [measure],
  },
};

/** The two states a line may assert; never both, as in the room. */
const STATES = [
  {},
  { "section-absent": { text: "absent", sourceRecordIds: [measure] } },
  { "section-adopted": { text: "adopted", sourceRecordIds: [provision] } },
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
            }
    expect(lines).toBe(ENGLISH_MOTIF_FAMILIES.length * 4 * 2 * 3 * 16);
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
          if (key !== "section-absent" && key !== "section-adopted")
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
      reach: "language reaching every eligible rider",
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
      speakerPersonId: speaker,
      listenerPersonId: listener,
      measureId: measure,
      billAmountSourceIds: [measure],
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
