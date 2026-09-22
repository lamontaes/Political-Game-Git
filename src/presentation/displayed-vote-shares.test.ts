import { describe, expect, it } from "vitest";

import { displayedSharePercents } from "./campaign-projection";

/**
 * Election night has to add up.
 *
 * Walked 2026-09-22 across ten towns: Chicago printed "72.0%" and "28.1%",
 * and Hannibal "75.0%" and "25.1%". Nothing was wrong with either count —
 * the simulation allocates whole basis points and they sum to ten thousand —
 * but each share was rounded on its own, so a reader adding two numbers on
 * the screen got 100.1 percent.
 */
describe("the shares election night prints", () => {
  it.each([
    ["Chicago", 0.7195, 0.2805],
    ["Hannibal", 0.7495, 0.2505],
  ])("adds up in %s, which printed 100.1%%", (_where, winner, loser) => {
    const printed = displayedSharePercents([winner, loser]);
    // The claim is the total, not a particular tenth: both halves land exactly
    // half a tenth from a boundary, so either rounding is honest and only one
    // of them can be printed.
    expect(printed.reduce((sum, value) => sum + Number(value), 0)).toBeCloseTo(
      100,
      5,
    );
    // Half a tenth is the largest honest move, and both of these sit on it,
    // so the bound has to include it rather than sit just inside.
    expect(Math.abs(Number(printed[0]) - winner * 100)).toBeLessThanOrEqual(
      0.0501,
    );
    expect(Math.abs(Number(printed[1]) - loser * 100)).toBeLessThanOrEqual(
      0.0501,
    );
    expect(Number(printed[0])).toBeGreaterThan(Number(printed[1]));
  });

  it("leaves a share that was already exact alone", () => {
    expect(displayedSharePercents([0.713, 0.287])).toEqual(["71.3", "28.7"]);
    expect(displayedSharePercents([0.905, 0.095])).toEqual(["90.5", "9.5"]);
  });

  it("adds up for any number of candidates", () => {
    for (const count of [2, 3, 4, 5, 7]) {
      for (let seed = 0; seed < 200; seed += 1) {
        // Whole basis points that sum, which is what the simulation produces.
        const raw: number[] = [];
        let left = 10000;
        for (let index = 0; index < count - 1; index += 1) {
          const take =
            (seed * 37 + index * 911) % Math.max(1, left - (count - index - 1));
          raw.push(take);
          left -= take;
        }
        raw.push(left);
        const printed = displayedSharePercents(
          raw.map((points) => points / 10000),
        );
        const total = printed.reduce((sum, value) => sum + Number(value), 0);
        expect(Math.round(total * 10) / 10).toBe(100);
      }
    }
  });

  it("moves a share by at most one tenth", () => {
    const shares = [0.7195, 0.2805];
    const printed = displayedSharePercents(shares);
    printed.forEach((value, index) => {
      expect(
        Math.abs(Number(value) - shares[index]! * 100),
      ).toBeLessThanOrEqual(0.05);
    });
  });

  it("says nothing about an empty race rather than throwing", () => {
    expect(displayedSharePercents([])).toEqual([]);
  });
});
