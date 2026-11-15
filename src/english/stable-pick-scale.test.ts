import { describe, expect, it } from "vitest";
import type { EntityId } from "../core2/kernel/brands";
import { stableHash } from "../core2/kernel/ids";
import {
  type AuthoredEnglishBank,
  stableDraw,
  type GroundedEnglishPacket,
  renderGroundedEnglish,
} from "./grounded-english";

// Salado, Texas (4864268), the world the Scenes page plays, at its seed.
const SALADO = {
  name: "Salado, Texas",
  key: "4864268",
  worldSeed: "1a98147f4c317e1696605267006681fba3efe403b97461dde0083fc525ed1a66",
};

// The stable pick lands where the hash, read as a fraction, falls among the
// wordings' shares. Scaling every weight in a spot alike (as the calibration
// fold does when every wording shares a bearing) keeps every share and so
// must keep every pick (Words lead, Nov 15, on the marks spread).
const WORDINGS = [
  "Let me talk to the volunteers first.",
  "Give me ten minutes alone first.",
  "Five minutes. I need to say it to myself first.",
  "I'm going to walk around the block once.",
];

function bank(weights: readonly number[]): AuthoredEnglishBank {
  return {
    key: "stable-pick-scale",
    version: "1",
    surface: "dialogue",
    variants: WORDINGS.map((text, at) => ({
      key: `w${at + 1}`,
      kind: "template" as const,
      text,
      weight: weights[at]!,
    })),
  };
}

function picks(weights: readonly number[]): string[] {
  const out: string[] = [];
  for (let moment = 0; moment < 400; moment += 1) {
    const packet: GroundedEnglishPacket = {
      surface: "dialogue",
      momentKey: `${SALADO.key}:scene-${moment}/core`,
      worldSeed: SALADO.worldSeed,
      bankVersion: "1",
      stage: "talk",
      sourceRecordIds: ["record-1" as EntityId],
      facts: {},
      knowledge: [],
    };
    const result = renderGroundedEnglish(packet, bank(weights));
    if (result.kind !== "rendered")
      throw new Error(`${SALADO.name}: ${result.reasons.join("; ")}`);
    out.push(result.variantKey);
  }
  return out;
}

describe(`the stable pick at ${SALADO.name} (${SALADO.key}), world seed ${SALADO.worldSeed}`, () => {
  it("keeps every pick when every weight in the spot is scaled alike", () => {
    for (const weights of [
      [1, 1, 1, 1],
      [2, 1, 3, 1],
      [950, 1000, 1075, 400],
    ]) {
      const base = picks(weights);
      for (const scale of [3, 7, 1000])
        expect(
          picks(weights.map((weight) => weight * scale)),
          `${weights.join(",")} times ${scale}`,
        ).toEqual(base);
    }
  });

  it("still picks every wording, in about its share", () => {
    const counts = new Map<string, number>();
    for (const key of picks([1, 1, 2, 4]))
      counts.set(key, (counts.get(key) ?? 0) + 1);
    // 400 picks at shares 1/8, 1/8, 2/8, 4/8: 50, 50, 100, 200, within a wide band.
    expect(counts.get("w1")).toBeGreaterThan(25);
    expect(counts.get("w2")).toBeGreaterThan(25);
    expect(counts.get("w3")).toBeGreaterThan(60);
    expect(counts.get("w4")).toBeGreaterThan(150);
  });
});

describe("a two-way pick splits across moments whose keys differ only in ids repeated in pairs", () => {
  // A scene's moment key names the asker and the player each twice, so their
  // characters cancel in FNV-1a's lowest bit: hash mod 2 gave every asker at a
  // place the same line (civic roles builder, Nov 15). The fraction reads the high bits.
  it("lands on each of two equal lines between 40 and 60 percent of 1,000 askers", () => {
    let second = 0;
    let lowBitOnes = 0;
    for (let asker = 0; asker < 1000; asker += 1) {
      const id = `person_${stableHash(`asker-${asker}`)}`;
      const hash = stableHash(
        `${SALADO.worldSeed}:${id}:person_player:join-cause:${id}:person_player/core`,
      );
      second += stableDraw(hash, 2);
      lowBitOnes += Number(BigInt(`0x${hash}`) % 2n);
    }
    // The fault this replaces, shown on the same keys.
    expect([0, 1000]).toContain(lowBitOnes);
    expect(second).toBeGreaterThanOrEqual(400);
    expect(second).toBeLessThanOrEqual(600);
  });
});
