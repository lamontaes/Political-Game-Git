/**
 * The game's census: a state's count follows its recorded growth, and the House
 * follows the counts. Against the 2020 table, a state that grew since gains a
 * seat and a state that shrank loses one.
 */
import { describe, expect, it } from "vitest";
import apportionment from "../../data/research/apportionment/apportionment-2020.json" with { type: "json" };
import { HOUSE_SIZE, censusCounts, censusSeats } from "./census";

const seats2020 = new Map(
  apportionment.states.map((row) => [row.state, row.representatives]),
);

describe("the game's census", () => {
  it("returns the 2020 seats when asked about 2020's own growth path origin year", () => {
    // 2024 carried back to 2020 is the 2020 resident count times the apportioned share: the 2020 table.
    const seats = censusSeats(2020);
    for (const [state, n] of seats2020) expect(seats.get(state), state).toBe(n);
  });

  it("moves seats toward the states that grew by 2030, and the House stays the same size", () => {
    const seats = censusSeats(2030);
    expect([...seats.values()].reduce((n, v) => n + v, 0)).toBe(HOUSE_SIZE);
    // Texas and Florida grew fastest in the 2020s; California and New York shrank.
    expect(seats.get("TX")!).toBeGreaterThan(seats2020.get("TX")!);
    expect(seats.get("FL")!).toBeGreaterThan(seats2020.get("FL")!);
    expect(seats.get("CA")!).toBeLessThan(seats2020.get("CA")!);
    expect(seats.get("NY")!).toBeLessThan(seats2020.get("NY")!);
    const gained = [...seats].reduce(
      (n, [state, v]) => n + Math.max(0, v - seats2020.get(state)!),
      0,
    );
    const lost = [...seats].reduce(
      (n, [state, v]) => n + Math.max(0, seats2020.get(state)! - v),
      0,
    );
    expect(gained).toBe(lost);
    expect(gained).toBeGreaterThan(0);
  });

  it("counts every state, and a later census counts more people where a state grew", () => {
    const a = censusCounts(2030),
      b = censusCounts(2040);
    expect(a).toHaveLength(50);
    const tx = (rows: typeof a) =>
      rows.find((r) => r.state === "TX")!.population;
    expect(tx(b)).toBeGreaterThan(tx(a));
  });
});
