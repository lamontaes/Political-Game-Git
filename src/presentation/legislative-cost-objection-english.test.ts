import { describe, expect, it } from "vitest";

import { createStableId } from "../simulation";
import {
  COST_OBJECTION_BANKS,
  composeCostObjection,
  costObjectionPacket,
  type CostObjectionInput,
  type CostObjectionVoice,
} from "./legislative-cost-objection-english";
import {
  eligibleMotifVariantKeys,
  legislativeMotifLine,
  type LegislativeMotifContext,
} from "./legislative-dialogue-motifs";
import { observerPlace } from "./observer-world";

/**
 * A160: the cost objection is worded by the English engine from its fact
 * packet. Every line it can say copies at least one packet fact into every
 * part, and nothing else: no number, place or name the packet lacks. The place
 * the speaker answers to is drawn from all 56 by the seed.
 */
const SEED = "a160-cost-objection-1";
const place = observerPlace(SEED);

const VOICES: readonly CostObjectionVoice[] = [
  "district-advocate",
  "fiscal-guardian",
  "implementation-realist",
  "procedural-institutionalist",
];
const speaker = createStableId("person", "a160:speaker");
const listener = createStableId("person", "a160:listener");
const measure = createStableId("legislative-measure", "a160:measure");
const provision = createStableId("legislative-provision", "a160:provision");

function input(
  voice: CostObjectionVoice,
  momentKey: string,
  withAmount: boolean,
  withPlace: boolean,
): CostObjectionInput {
  return {
    worldSeed: SEED,
    speakerTraits: {},
    listenerTraits: {},
    momentKey,
    speakerPersonId: speaker,
    listenerPersonId: listener,
    voice,
    facts: {
      designation: { text: "HB 214", sourceRecordIds: [measure] },
      listener: { text: "Ward", sourceRecordIds: [listener] },
      billAmount: withAmount
        ? { text: "$9,400,000", sourceRecordIds: [provision] }
        : null,
      place: withPlace
        ? { text: place.displayName, sourceRecordIds: [measure] }
        : null,
    },
  };
}

/** Template text with its fact slots removed: the authored words alone. */
const AUTHORED_WORDS = COST_OBJECTION_BANKS.flatMap((bank) =>
  Object.values(bank.parts).flatMap((part) =>
    part!.variants.map((variant) =>
      variant.kind === "template" ? variant.text : "",
    ),
  ),
);

describe(`the cost objection, worded from its packet (${place.displayName}, ${place.key}, seed ${SEED})`, () => {
  it("writes every part of every bank from a fact slot", () => {
    for (const bank of COST_OBJECTION_BANKS)
      for (const [part, partBank] of Object.entries(bank.parts))
        for (const variant of partBank!.variants) {
          expect(variant.kind, `${bank.key}:${part}:${variant.key}`).toBe(
            "template",
          );
          if (variant.kind === "template")
            expect(variant.text, `${bank.key}:${part}:${variant.key}`).toMatch(
              /\{\{[a-z-]+\}\}/,
            );
        }
  });

  it("cites a packet fact in every part of every line it renders", () => {
    const seen = new Set<string>();
    let lines = 0;
    for (const voice of VOICES)
      for (const withAmount of [true, false])
        for (const withPlace of [true, false])
          for (let turn = 0; turn < 24; turn += 1) {
            const row = input(voice, `turn-${turn}`, withAmount, withPlace);
            const packet = costObjectionPacket(row);
            const line = composeCostObjection(row);
            lines += 1;
            expect(line.parts.length).toBeGreaterThan(0);
            for (const part of line.parts) {
              seen.add(part.partKey);
              expect(part.usedFactKeys.length, part.partKey).toBeGreaterThan(0);
              for (const key of part.usedFactKeys) {
                const fact = packet.facts[key];
                expect(fact, `${part.partKey} cites ${key}`).toBeDefined();
                expect(part.text).toContain(fact!.text);
                for (const id of fact!.sourceRecordIds)
                  expect(line.sourceRecordIds).toContain(id);
              }
            }
            // Nothing the packet lacks: no amount without one, no place
            // without one, and no other dollar figure at all.
            if (!withAmount) expect(line.text).not.toContain("$");
            else
              expect(line.text.match(/\$[\d,]+/g) ?? []).toEqual(
                (line.text.match(/\$9,400,000/g) ?? []).map(() => "$9,400,000"),
              );
            if (!withPlace) expect(line.text).not.toContain(place.displayName);
          }
    expect(lines).toBe(VOICES.length * 4 * 24);
    // Every variant in every bank is reachable from some packet.
    const all = COST_OBJECTION_BANKS.flatMap((bank) =>
      Object.entries(bank.parts).flatMap(([part, partBank]) =>
        partBank!.variants.map(
          (variant) => `${bank.key}:${part}:${variant.key}`,
        ),
      ),
    );
    expect([...seen].sort()).toEqual(all.sort());
    expect(AUTHORED_WORDS.length).toBe(all.length);
  });

  it("is what the bargaining room says for an objection on cost", () => {
    const context: LegislativeMotifContext = {
      family: "object-on-cost",
      voice: "fiscal-guardian",
      audience: "limited",
      priorFamily: null,
      variantSeed: "a160:opening",
      facts: {
        speaker: "Hollis",
        listener: "Ward",
        designation: "HB 214",
        shortTitle: "Transit Access Pilot",
        sectionLabel: "Section 3",
        sectionHeading: "Pilot support limit",
        reach: { relation: "reaching", who: "every eligible rider" },
        beneficiary: null,
        place: place.displayName,
        amount: null,
        billAmount: "$9,400,000",
        analyst: "Rowe",
        chamber: "House of Representatives",
        nextStep: "third reading",
        priorStatement: null,
      },
      grounding: {
        worldSeed: SEED,
        speakerTraits: {},
        listenerTraits: {},
        speakerPersonId: speaker,
        listenerPersonId: listener,
        measureId: measure,
        billAmountSourceIds: [provision],
      },
    };
    const text = legislativeMotifLine(context);
    expect(text).toMatch(/^“.+”$/);
    expect(text).toContain("HB 214");
    expect(text).toContain("$9,400,000");
    expect(
      eligibleMotifVariantKeys(context).every((key) =>
        key.startsWith("legislative.object-on-cost.fiscal-guardian:"),
      ),
    ).toBe(true);
    // The same turn says the same words.
    expect(legislativeMotifLine(context)).toBe(text);
  });
});
