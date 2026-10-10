import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { shortfallOrderFromFacts } from "./public-budget-decisions";

describe("standalone public-budget shortfall decision", () => {
  it.each(lifePlaceStateIdentities())(
    "uses the same principle rule for $jurisdictionKey",
    (place) => {
      const usps = place.usps;
      const index = lifePlaceStateIdentities().indexOf(place);
      const score = [-1, 0, 1][index % 3]!;
      const recordIds = [`${usps}:belief`];
      const result = shortfallOrderFromFacts({
        governorPersonId: `${usps}:governor`,
        reservePrincipleScore: score,
        recordIds,
      });
      expect(result).toEqual({
        cutFirst: score > 0,
        personId: `${usps}:governor`,
        recordIds,
      });
    },
  );

  it("uses the reserve when no governor is selected", () => {
    expect(
      shortfallOrderFromFacts({
        governorPersonId: null,
        reservePrincipleScore: 10,
        recordIds: ["unused"],
      }),
    ).toEqual({ cutFirst: false, personId: null, recordIds: [] });
  });
});
