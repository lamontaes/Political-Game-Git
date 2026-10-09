import { describe, expect, it } from "vitest";
import { OUTCOMES_PRODUCED } from ".";
import { PLACE_OUTCOME_BASES } from "./place-outcome-store";
import { expectTerritoriesEstimated } from "../../../tests/fixtures/territory-estimates";

/*
 * Three federal-law outcomes used to start every place at 100 because no
 * level had been read. Each now starts from a published level: consumer
 * prices from the Bureau of Economic Analysis regional price parities (2024),
 * Part D out-of-pocket drug spending per enrollee from the HHS ASPE state
 * table (2022), and the share of people 62 to 66 working from the Census
 * Bureau's employment-by-age table (ACS 2020-2024).
 */
describe("real starting levels for the federal-law outcomes", () => {
  it("starts consumer prices at each state's price level against the nation", () => {
    const places = PLACE_OUTCOME_BASES["household.prices"]!.places;
    expectTerritoriesEstimated(PLACE_OUTCOME_BASES["household.prices"]!);
    expect(places["US-CA"]).toBeGreaterThan(105);
    expect(places["US-AR"]).toBeLessThan(90);
    expect(Object.values(places).every((value) => value !== 100)).toBe(true);
    expect(OUTCOMES_PRODUCED.has("household.prices")).toBe(true);
  });

  it("starts drug out-of-pocket costs at each state's 2022 Part D mean", () => {
    const places = PLACE_OUTCOME_BASES["health.drug-out-of-pocket"]!.places;
    expectTerritoriesEstimated(
      PLACE_OUTCOME_BASES["health.drug-out-of-pocket"]!,
    );
    expect(places["US-AL"]).toBe(378);
    expect(places["US-AK"]).toBe(233);
    expect(places["US-CA"]).toBe(266);
  });

  it("starts older employment at each place's share of people 62 to 66 working", () => {
    const places = PLACE_OUTCOME_BASES["labor.older-employment"]!.places;
    // The 50 states, D.C. and Puerto Rico.
    expect(Object.keys(places)).toHaveLength(52);
    expect(places["US-PR"]).toBeLessThan(30);
    for (const [key, share] of Object.entries(places)) {
      expect(share, key).toBeGreaterThan(15);
      expect(share, key).toBeLessThan(60);
    }
  });
});
