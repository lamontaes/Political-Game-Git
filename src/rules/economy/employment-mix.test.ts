import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { addWeightedSectorValuesFromFacts } from "./employment-mix";

const places = lifePlaceStateIdentities();

describe("weighted employment sector rule", () => {
  it.each(places)("adds recorded values for $jurisdictionKey", (place) => {
    const index = places.indexOf(place);
    const current = new Map([["retail", 12]]);
    const sectors = ["manufacturing", "retail", "service", "public"];
    const cells = [index + 1, null, undefined, 4] as const;
    const weight = 1 / (index + 1);
    const totals = addWeightedSectorValuesFromFacts(
      current,
      sectors,
      cells,
      weight,
    );

    expect([...totals.keys()]).toEqual(["retail", "manufacturing", "public"]);
    expect(totals.get("retail")).toBe(12);
    expect(totals.get("manufacturing")).toBeCloseTo(1);
    expect(totals.get("public")).toBeCloseTo(4 / (index + 1));
    expect([...current]).toEqual([["retail", 12]]);
  });

  it("does not add withheld cells", () => {
    expect(
      addWeightedSectorValuesFromFacts(
        new Map(),
        ["retail", "public"],
        [null, undefined],
        1,
      ),
    ).toEqual(new Map());
  });
});
