import { describe, expect, it } from "vitest";
import {
  combinePrinciplePulls,
  type WeightedPrinciplePull,
} from "./principle-strength";

const pull = (
  evidenceKey: string,
  weight: number,
  direction: WeightedPrinciplePull["direction"] = "endorses",
): WeightedPrinciplePull => ({ evidenceKey, weight, direction });

describe("continuous strength from recorded pulls", () => {
  it("invents no view when no source supports one", () => {
    expect(combinePrinciplePulls([])).toEqual({
      strength: 0,
      direction: null,
      supportFor: 0,
      supportAgainst: 0,
      evidenceKeys: [],
    });
  });

  it("reinforces a direction through distinct agreeing experiences", () => {
    const prior = combinePrinciplePulls([pull("first", 0.2)]);
    const later = combinePrinciplePulls([
      pull("first", 0.2),
      pull("later", 0.4),
    ]);
    expect(prior.strength).toBeCloseTo(0.2);
    expect(later.strength).toBeCloseTo(0.52);
    expect(later.direction).toBe("endorses");
    expect(later.strength).toBeGreaterThan(prior.strength);
    expect(later.strength).toBeLessThan(1);
  });

  it("nets opposing experiences and follows the stronger direction", () => {
    const agreement = pull("agreement", 0.75);
    const contradiction = pull("contradiction", 0.25, "rejects");
    expect(combinePrinciplePulls([agreement, contradiction]).strength).toBe(
      0.5,
    );
    expect(combinePrinciplePulls([agreement, contradiction]).direction).toBe(
      "endorses",
    );
    const reversed = combinePrinciplePulls([
      pull("agreement", 0.25),
      pull("contradiction", 0.75, "rejects"),
    ]);
    expect(reversed.strength).toBe(0.5);
    expect(reversed.direction).toBe("rejects");
  });

  it("holds neither direction when evidence exactly balances", () => {
    const result = combinePrinciplePulls([
      pull("for", 0.7),
      pull("against", 0.7, "rejects"),
    ]);
    expect(result.strength).toBe(0);
    expect(result.direction).toBeNull();
  });

  it("does not reinforce a view by rereading the same evidence", () => {
    const recorded = pull("recorded", 0.4);
    expect(combinePrinciplePulls([recorded, recorded, recorded])).toEqual(
      combinePrinciplePulls([recorded]),
    );
  });

  it("gives an identical result when input records are reordered", () => {
    const recorded = [
      pull("c", 0.1),
      pull("a", 0.2),
      pull("b", 0.35, "rejects"),
    ];
    expect(combinePrinciplePulls(recorded)).toEqual(
      combinePrinciplePulls([...recorded].reverse()),
    );
    expect(recorded.map((entry) => entry.evidenceKey)).toEqual(["c", "a", "b"]);
  });

  it("rejects invalid sizes and a single source claiming certainty", () => {
    for (const weight of [-0.1, 1, 1.1, NaN, Infinity, -Infinity])
      expect(() => combinePrinciplePulls([pull("source", weight)])).toThrow(
        "in [0, 1)",
      );
  });

  it("requires unambiguous recorded-source identity", () => {
    expect(() => combinePrinciplePulls([pull(" ", 0.2)])).toThrow(
      "recorded evidence key",
    );
    expect(() =>
      combinePrinciplePulls([pull("same", 0.2), pull("same", 0.3)]),
    ).toThrow("inconsistent pulls");
    expect(() =>
      combinePrinciplePulls([pull("same", 0.2), pull("same", 0.2, "rejects")]),
    ).toThrow("inconsistent pulls");
  });
});
