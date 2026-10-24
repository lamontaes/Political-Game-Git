// The M1-03 and M1-04 checks' measures: counted records count their heads,
// and a state's opening unemployment must match its published rate even when
// its rest-of-state region carries the state's own rate.
import { describe, expect, it } from "vitest";
import { openingRateMatches, represented, weightedRate } from "./m1-measures";

describe("the M1 checks' measures", () => {
  it("count a counted record as the people it stands for", () => {
    const jobs = [
      { personId: "full", heads: 1 },
      { personId: "counted", heads: 3 },
    ];
    expect(represented(jobs, (j) => j.heads)).toBe(4);
    expect(represented([], () => 5)).toBe(0);
  });
  it("weight a state's rate by its regions' people", () => {
    expect(
      weightedRate([
        { pct: 11, people: 1 },
        { pct: 5, people: 1 },
      ]),
    ).toBe(8);
  });
  it("fail a state whose rest region equals its rate but whose weighted rate doesn't", () => {
    // State 5%, its rest-of-state region 5%, a metro at 11%: weighted 8%.
    const rows = [
      { pct: 11, people: 1 },
      { pct: 5, people: 1 },
    ];
    expect(openingRateMatches(rows, 5)).toBe(false);
    expect(openingRateMatches([{ pct: 5, people: 2 }], 5)).toBe(true);
  });
});
