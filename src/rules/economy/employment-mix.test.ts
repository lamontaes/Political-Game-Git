import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import {
  addWeightedSectorValuesFromFacts,
  workplaceWeightsFromFacts,
} from "./employment-mix";

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

    expect(
      workplaceWeightsFromFacts(
        {
          sectors: new Map([["retail", 60]]),
          federal: 10,
          state: 10,
          local: new Map([["schools", 20]]),
        },
        {
          sectorWorkplaces: new Map([
            [
              "retail",
              [
                ["shop", 1],
                ["market", 1],
              ],
            ],
          ]),
          localWorkplaces: new Map([
            [
              "schools",
              [
                ["school", 3],
                ["clinic", 1],
              ],
            ],
          ]),
          stateOffice: [["state-office", 1]],
          federalOffice: [["post-office", 1]],
        },
      ),
    ).toEqual(
      new Map([
        ["shop", 30],
        ["market", 30],
        ["school", 15],
        ["clinic", 5],
        ["state-office", 10],
        ["post-office", 10],
      ]),
    );
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
