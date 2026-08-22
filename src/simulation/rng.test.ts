import { describe, expect, it } from "vitest";

import { SeededRng, normalizeSeed } from "./rng";

function take(rng: SeededRng, count: number): number[] {
  return Array.from({ length: count }, () => rng.nextUint32());
}

describe("SeededRng", () => {
  it("pins the version-one stream and fork vectors", () => {
    expect(take(new SeededRng("alpha"), 5)).toEqual([
      2_147_695_906, 1_123_283_972, 4_288_611_681, 4_163_151_322, 3_082_447_081,
    ]);
    expect(take(new SeededRng("alpha").fork("person:p1"), 5)).toEqual([
      3_762_986_758, 4_222_033_503, 2_375_682_860, 1_234_130_523, 2_053_156_315,
    ]);
  });

  it("replays the same sequence for the same normalized seed", () => {
    expect(take(new SeededRng("  civic-seed  "), 8)).toEqual(
      take(new SeededRng("civic-seed"), 8),
    );
  });

  it("creates keyed forks without consuming the parent stream", () => {
    const untouchedParent = new SeededRng("world");
    const forkedParent = new SeededRng("world");

    const firstFork = forkedParent.fork("person:1");
    const replayedFork = forkedParent.fork("person:1");
    const differentFork = forkedParent.fork("person:2");

    expect(take(firstFork, 6)).toEqual(take(replayedFork, 6));
    expect(take(forkedParent, 6)).toEqual(take(untouchedParent, 6));
    expect(take(new SeededRng("world").fork("person:1"), 6)).not.toEqual(
      take(differentFork, 6),
    );
  });

  it("preserves textual seeds while normalizing whitespace and Unicode", () => {
    expect(normalizeSeed("  00042  ")).toBe("00042");
    expect(normalizeSeed("e\u0301")).toBe("é");
    expect(() => normalizeSeed("   ")).toThrow(/seed/i);
  });

  it("rejects invalid integer ranges", () => {
    const rng = new SeededRng("bounds");
    expect(() => rng.integer(2, 2)).toThrow();
    expect(() => rng.integer(0.5, 2)).toThrow();
  });
});
