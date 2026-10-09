import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import {
  medianHourlyPayFromFacts,
  unemploymentRateFromFacts,
} from "./town-measures";

const places = lifePlaceStateIdentities();

describe("town measure calculations", () => {
  it.each(places)(
    "calculates labor and pay measures from selected facts in $jurisdictionKey",
    (place) => {
      const index = places.indexOf(place);
      expect(
        unemploymentRateFromFacts([
          { status: "employed", holdsWork: true },
          { status: "looking-for-work", holdsWork: false },
          { status: "student", holdsWork: false },
          { status: "retired", holdsWork: false },
        ]),
      ).toEqual({ value: 50, basis: 2 });
      expect(
        medianHourlyPayFromFacts([300 + index, 100 + index, 200 + index]),
      ).toEqual({ value: 200 + index, basis: 3 });
    },
  );

  it("returns unknown measures when their source facts are empty", () => {
    expect(unemploymentRateFromFacts([])).toEqual({ value: null, basis: 0 });
    expect(medianHourlyPayFromFacts([])).toEqual({ value: null, basis: 0 });
  });

  it("rounds an even-count median to a minor unit", () => {
    expect(medianHourlyPayFromFacts([100, 201])).toEqual({
      value: 151,
      basis: 2,
    });
  });
});
