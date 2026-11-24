import { describe, expect, it } from "vitest";
import { affectAt } from "./emotion";
import { P } from "./parameters";
import type { Affect } from "./types";

function anchor(): Affect {
  return {
    at: "2020-02-28",
    mood: P.one,
    stress: P.one,
    moodBaseline: P.zero,
    stressBaseline: P.zero,
  };
}

describe("affect date validation after repeated reads", () => {
  it("validates a caller's changed, missing, and nonfinite index after a warm read", () => {
    const params: Record<string, number> = { ...P };
    affectAt(anchor(), "2020-02-29", params);
    params.zero = P.one;
    expect(() => affectAt(anchor(), "2020-02-29", params)).toThrow(
      /valid UTC date-only/,
    );
    delete params.zero;
    expect(() => affectAt(anchor(), "2020-02-29", params)).toThrow(
      /Missing or non-finite numeric affect parameter: zero/,
    );
    params.zero = Number.NaN;
    expect(() => affectAt(anchor(), "2020-02-29", params)).toThrow(
      /Missing or non-finite numeric affect parameter: zero/,
    );
    params.zero = P.zero;
    expect(affectAt(anchor(), "2020-02-29", params).at).toBe("2020-02-29");
  });

  it("keeps malformed-date errors ahead of index reads and rejects normalized dates", () => {
    const params: Record<string, number> = { ...P };
    delete params.zero;
    expect(() => affectAt(anchor(), "not-a-date", params)).toThrow(
      /valid UTC date-only/,
    );
    expect(() => affectAt(anchor(), "2020-02-30", P)).toThrow(
      /valid UTC date-only/,
    );
    expect(() => affectAt(anchor(), "2020-02-29T00:00:00Z", P)).toThrow(
      /valid UTC date-only/,
    );
  });

  it("continues checking changed half-lives on same-date cache hits", () => {
    const params: Record<string, number> = { ...P };
    affectAt(anchor(), anchor().at, params);
    params.moodHalfLifeDays = P.zero;
    expect(() => affectAt(anchor(), anchor().at, params)).toThrow(
      /half-life must be finite and positive/,
    );
    delete params.moodHalfLifeDays;
    expect(() => affectAt(anchor(), anchor().at, params)).toThrow(
      /Missing or non-finite numeric affect parameter: moodHalfLifeDays/,
    );
  });

  it("keeps independent coefficients, future-anchor rejection, and dates after eviction", () => {
    const params: Record<string, number> = {
      ...P,
      stressHalfLifeDays: P.stressHalfLifeDays * P.two,
    };
    const slow = affectAt(anchor(), "2020-03-01", params);
    const regular = affectAt(anchor(), "2020-03-01", P);
    expect(slow.stress).toBeGreaterThan(regular.stress);
    for (const day of [
      "2020-03-02",
      "2020-03-03",
      "2021-02-28",
      "2020-02-29",
    ]) {
      expect(affectAt(anchor(), day, params).at).toBe(day);
    }
    expect(() => affectAt(anchor(), "2020-02-27", params)).toThrow(
      /before its recorded anchor/,
    );
  });
});
