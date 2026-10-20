/**
 * The method of equal proportions reproduces the House the 2020 Census gave
 * every state from its apportionment population, and moves a seat when a
 * state's count moves it.
 */
import { describe, expect, it } from "vitest";
import data from "../../data/research/apportionment/apportionment-2020.json" with { type: "json" };
import { apportionHouse } from "./apportionment";

const counts = data.states.map((row) => ({
  state: row.state,
  population: row.apportionmentPopulation,
}));

describe("apportionHouse", () => {
  it("reproduces every state's 2020 seats from its apportionment population", () => {
    const seats = apportionHouse(counts, data.houseSize);
    for (const row of data.states)
      expect(seats.get(row.state), row.state).toBe(row.representatives);
    expect([...seats.values()].reduce((n, v) => n + v, 0)).toBe(data.houseSize);
  });

  it("gives a seat to the state that grows past the next priority value, and takes it from another", () => {
    const base = apportionHouse(counts, data.houseSize);
    // Texas grows by a million and a half people over a decade; every other state holds still.
    const grown = counts.map((row) =>
      row.state === "TX"
        ? { ...row, population: row.population + 1_500_000 }
        : row,
    );
    const after = apportionHouse(grown, data.houseSize);
    expect(after.get("TX")!).toBeGreaterThan(base.get("TX")!);
    expect([...after.values()].reduce((n, v) => n + v, 0)).toBe(data.houseSize);
    // The House is fixed, so every seat Texas gains is a seat another state loses.
    const gained = after.get("TX")! - base.get("TX")!;
    const lost = [...base].reduce(
      (n, [state, seats]) => n + Math.max(0, seats - after.get(state)!),
      0,
    );
    expect(lost).toBe(gained);
  });

  it("refuses a House smaller than the number of states", () => {
    expect(() => apportionHouse(counts, 10)).toThrow();
  });
});
