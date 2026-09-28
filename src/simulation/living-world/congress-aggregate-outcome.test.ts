import { describe, expect, it } from "vitest";
import { aggregateCongressAffiliation } from "./congress-aggregate-outcome";

describe("compact congressional party outcome", () => {
  it("uses the saved district view instead of a seeded party flip", () => {
    const race = {
      democraticShare: 0.58,
      baselineAffiliation: "democratic",
      incumbentAffiliation: "republican",
      incumbentSeeking: true,
    };
    expect(aggregateCongressAffiliation(race)).toBe("democratic");
    expect(aggregateCongressAffiliation(race)).toBe("democratic");
  });

  it("lets a seeking incumbent's disclosed bonus matter only near the line", () => {
    expect(
      aggregateCongressAffiliation({
        democraticShare: 0.52,
        baselineAffiliation: "democratic",
        incumbentAffiliation: "republican",
        incumbentSeeking: true,
      }),
    ).toBe("republican");
    expect(
      aggregateCongressAffiliation({
        democraticShare: 0.52,
        baselineAffiliation: "democratic",
        incumbentAffiliation: "republican",
        incumbentSeeking: false,
      }),
    ).toBe("democratic");
  });

  it("preserves a recorded non-major affiliation when no share exists", () => {
    expect(
      aggregateCongressAffiliation({
        democraticShare: null,
        baselineAffiliation: "independent",
        incumbentAffiliation: "independent",
        incumbentSeeking: true,
      }),
    ).toBe("independent");
    expect(
      aggregateCongressAffiliation({
        democraticShare: null,
        baselineAffiliation: null,
        incumbentAffiliation: null,
        incumbentSeeking: false,
      }),
    ).toBeNull();
  });
});
