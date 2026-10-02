import { describe, expect, it } from "vitest";
import oldAppearance from "../presentation/fixtures/leg-american-english1-old-save.json" with { type: "json" };
import oldUnpinned from "../presentation/fixtures/morning23-old-unpinned.json" with { type: "json" };
import oldGen2 from "../presentation/fixtures/morning23-old-gen2.json" with { type: "json" };
import { restoreLegacyPrincipleStrengths } from "./principle-legacy-strength";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { BeliefConviction, World } from "./types";

const appearancePayload = JSON.stringify(oldAppearance);
const saved = [
  ["old appearance", appearancePayload],
  ["unpinned MORNING23", oldUnpinned.payload],
  ["gen2 MORNING23", oldGen2.payload],
] as const;

// This is the old reader boundary, where a required field was not yet saved.
function writtenWorld(payload = appearancePayload): World {
  return (JSON.parse(payload) as { world: World }).world;
}

function withConviction(conviction: BeliefConviction): World {
  const world = writtenWorld();
  return {
    ...world,
    history: {
      ...world.history,
      principles: world.history.principles.map((record) => ({
        ...record,
        conviction,
      })),
    },
  };
}

describe("saved principles before continuous strength", () => {
  it.each([
    ["tentative", 0.25, 1],
    ["moderate", 0.5, 2],
    ["strong", 0.75, 3],
    ["settled", 1, 4],
  ] as const)(
    "preserves the former %s score",
    (conviction, strength, formerScore) => {
      const before = withConviction(conviction);
      const original = structuredClone(before);
      const after = restoreLegacyPrincipleStrengths(before);
      expect(after.history.principles).toEqual(
        before.history.principles.map((record) => ({ ...record, strength })),
      );
      expect(after.history.principles[0]!.strength * 4).toBe(formerScore);
      expect(before).toEqual(original);
      expect(restoreLegacyPrincipleStrengths(after)).toBe(after);
    },
  );

  it.each(saved)(
    "opens %s without changing people or principle identity",
    (_, payload) => {
      const original = writtenWorld(payload);
      const reopened = deserializeWorld(payload);
      expect(reopened.history.principles).toEqual(
        original.history.principles.map((record) => ({
          ...record,
          strength: 0.5,
        })),
      );
      expect(reopened.people).toEqual(original.people);
      expect(reopened.history.nextSequence).toBe(original.history.nextSequence);
      expect(deserializeWorld(serializeWorld(reopened))).toEqual(reopened);
      expect(writtenWorld(payload)).toEqual(original);
    },
  );

  it("keeps an existing continuous strength verbatim", () => {
    const world = restoreLegacyPrincipleStrengths(writtenWorld());
    const current = {
      ...world,
      history: {
        ...world.history,
        principles: world.history.principles.map((record) => ({
          ...record,
          strength: 0.625,
        })),
      },
    };
    expect(restoreLegacyPrincipleStrengths(current)).toBe(current);
    expect(
      deserializeWorld(serializeWorld(current)).history.principles[0]!.strength,
    ).toBe(0.625);
  });

  it.each([null, "0.5", -0.1, 1.1])(
    "does not repair present invalid strength %s",
    (strength) => {
      const parsed = JSON.parse(appearancePayload) as { world: World };
      // Deliberately corrupt incoming JSON rather than a typed current writer.
      const principles = parsed.world.history.principles as unknown as Record<
        string,
        unknown
      >[];
      principles[0]!.strength = strength;
      expect(restoreLegacyPrincipleStrengths(parsed.world)).toBe(parsed.world);
      expect(() => deserializeWorld(JSON.stringify(parsed))).toThrow(
        /strength/,
      );
    },
  );

  it("rejects an unknown old conviction instead of assigning a score", () => {
    const world = writtenWorld();
    (
      world.history.principles[0] as unknown as Record<string, unknown>
    ).conviction = "unknown";
    expect(() => restoreLegacyPrincipleStrengths(world)).toThrow(
      /unrecognized conviction/,
    );
  });

  it("authenticates the original saved identity before accepting migrated content", () => {
    const parsed = JSON.parse(appearancePayload) as { snapshotId: string };
    parsed.snapshotId = "snapshot_forged";
    expect(() => deserializeWorld(JSON.stringify(parsed))).toThrow(
      /metadata does not match/,
    );
  });
});
