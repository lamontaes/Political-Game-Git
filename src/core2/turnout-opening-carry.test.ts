/** A first election turns out the share the voters' propensities say, not only those at one half or more. */
import { describe, expect, it } from "vitest";
import { OPENING_CARRY, namedTurnout, openingVoterCarry } from "./turnout";

const ids = Array.from({ length: 400 }, (_, i) => `person_${i.toString(16)}`);

describe("a named voter's starting carry", () => {
  it("lets a town of low propensities turn out about their sum in a first election", () => {
    const propensity = 0.05;
    const voters = ids.filter(
      (id) => namedTurnout(openingVoterCarry(id), propensity).votes,
    ).length;
    // The share is the propensity, within the spread of 400 ids' starts.
    expect(voters).toBeGreaterThan(ids.length * propensity * 0.6);
    expect(voters).toBeLessThan(ids.length * propensity * 1.4);
    // Starting everyone at one carry turns out nobody below one half: Troy, Vermont's 56 voters.
    expect(
      ids.filter((id) => namedTurnout(OPENING_CARRY, propensity).votes && id)
        .length,
    ).toBe(0);
  });
  it("spreads starts over zero to one and gives a voter the same start every time", () => {
    const starts = ids.map(openingVoterCarry);
    expect(Math.min(...starts)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...starts)).toBeLessThan(1);
    const mean = starts.reduce((a, b) => a + b, 0) / starts.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
    expect(openingVoterCarry(ids[7]!)).toBe(openingVoterCarry(ids[7]!));
  });
});
