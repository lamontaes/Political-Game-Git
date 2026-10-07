import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../simulation/demo";
import {
  createMindProvenance,
  recordPersonalityTendency,
} from "../simulation/mind";
import { SYNTHETIC_MIND_IDS } from "../simulation/mind-catalog";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishPacket,
} from "./grounded-english";
import { speakerTraits } from "./speaker-traits";

const BANK: AuthoredEnglishBank = {
  key: "traits-test",
  version: "1",
  surface: "dialogue",
  variants: [
    {
      key: "cautious",
      kind: "template",
      text: "Let me think about it.",
      requiresTraits: [{ holder: "speaker", traitKey: "expression:cautious" }],
    },
    {
      key: "risk-seeking",
      kind: "template",
      text: "I'd like to try it.",
      requiresTraits: [
        { holder: "speaker", traitKey: "expression:risk-seeking" },
      ],
    },
  ],
};

describe("recorded speaker traits", () => {
  it("uses only the person's latest effective cues, retaining their sources and historical cutoff", () => {
    let world = createDemoWorld("speaker-traits");
    const personId = world.history.personalityTendencies[0]!.personId;
    const before = speakerTraits(world, personId);
    const original = world.history.personalityTendencies.find(
      (r) => r.personId === personId && r.expressionKey === "cautious",
    )!;
    expect(before["expression:cautious"]?.sourceRecordIds).toContain(
      original.id,
    );
    const cutoff = {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    };
    world = recordPersonalityTendency(world, {
      stableKey: "speaker-traits:revision",
      personId,
      tendencyId: SYNTHETIC_MIND_IDS.tendencies.riskApproach,
      recordedAt: world.currentDate,
      expressionKey: "risk-seeking",
      strength: "strong",
      confidence: "high",
      scopeTags: [],
      provenance: createMindProvenance("authored", {
        note: "Trait reader fixture.",
      }),
      supersedesTendencyId: original.id,
    });
    const after = speakerTraits(world, personId);
    expect(after["expression:cautious"]).toBeUndefined();
    expect(after["expression:risk-seeking"]?.sourceRecordIds).toEqual([
      world.history.personalityTendencies.at(-1)!.id,
    ]);
    expect(speakerTraits(world, personId, cutoff)).toEqual(before);
    expect(
      speakerTraits(world, personId, {
        ...cutoff,
        asOfDate: world.people[personId]!.birthDate,
      }),
    ).toEqual({});
    const packet = (traits: typeof before): GroundedEnglishPacket => ({
      surface: "dialogue",
      worldSeed: world.seed,
      momentKey: "traits-test",
      bankVersion: "1",
      stage: "adult",
      sourceRecordIds: [personId],
      facts: {},
      knowledge: [],
      speaker: { personId, traits },
    });
    expect(renderGroundedEnglish(packet(before), BANK)).toMatchObject({
      kind: "rendered",
      variantKey: "cautious",
    });
    expect(renderGroundedEnglish(packet(after), BANK)).toMatchObject({
      kind: "rendered",
      variantKey: "risk-seeking",
    });
    expect(
      after[`principle:${world.history.principles[0]!.principleId}:endorses`]
        ?.sourceRecordIds,
    ).toEqual([world.history.principles[0]!.id]);
  });
});
