import { describe, expect, it } from "vitest";
import {
  apportionHouse,
  CENSUS_2020_APPORTIONMENT,
  electoralVotesFromSeats,
  HOUSE_SIZE,
} from "./apportionment";
import { ELECTORAL_ALLOCATION } from "./national-election-rules";

describe("House apportionment by equal proportions", () => {
  it("gives every state the seats the 2020 Census gave it", () => {
    const seats = apportionHouse(CENSUS_2020_APPORTIONMENT);
    expect(Object.keys(seats)).toHaveLength(50);
    for (const row of CENSUS_2020_APPORTIONMENT) {
      expect(seats[row.state], row.state).toBe(row.representatives);
    }
    expect(Object.values(seats).reduce((sum, count) => sum + count, 0)).toBe(
      HOUSE_SIZE,
    );
  });

  it("gives the same electors as the archives' allocation for 2024 and 2028", () => {
    const electors = electoralVotesFromSeats(
      apportionHouse(CENSUS_2020_APPORTIONMENT),
    );
    expect(electors).toEqual({ ...ELECTORAL_ALLOCATION });
  });

  it("moves a seat when a state grows past its neighbor's claim", () => {
    const before = apportionHouse(CENSUS_2020_APPORTIONMENT);
    const grown = CENSUS_2020_APPORTIONMENT.map((row) =>
      row.state === "NM"
        ? {
            ...row,
            apportionmentPopulation: row.apportionmentPopulation + 700_000,
          }
        : row,
    );
    const after = apportionHouse(grown);
    expect(after.NM).toBe(before.NM! + 1);
    const losers = Object.keys(before).filter(
      (state) => after[state]! < before[state]!,
    );
    expect(losers).toHaveLength(1);
  });

  it("guarantees one seat to a state of any size", () => {
    const seats = apportionHouse(
      [
        { state: "AA", apportionmentPopulation: 10_000_000 },
        { state: "BB", apportionmentPopulation: 1 },
      ],
      5,
    );
    expect(seats).toEqual({ AA: 4, BB: 1 });
  });

  it("refuses a House too small for one seat each, and a doubled state", () => {
    expect(() =>
      apportionHouse([{ state: "AA", apportionmentPopulation: 5 }], 0),
    ).toThrow(/cannot give each/);
    expect(() =>
      apportionHouse([
        { state: "AA", apportionmentPopulation: 5 },
        { state: "AA", apportionmentPopulation: 6 },
      ]),
    ).toThrow(/listed twice/);
  });
});
