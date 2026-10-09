import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { shortfallOrderFromFacts } from "./public-budget-decisions";

describe("standalone public-budget shortfall decision", () => {
  it.each(Object.keys(STATES))(
    "uses the same principle rule for US-%s",
    (usps, index) => {
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
