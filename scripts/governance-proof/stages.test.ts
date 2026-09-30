import { describe, expect, it } from "vitest";
import { passedChamberMeasures } from "./stages";
import type { EntityId } from "../../src/simulation/types";

const action = (measure: string, chamber: string, stage: string) => ({
  kind: "floor-stage-passed" as const,
  measureId: measure as EntityId,
  chamberKey: chamber,
  floorStageKey: stage,
});
describe("counting laws through each chamber", () => {
  it("does not count cloture or an intermediate reading as chamber passage", () => {
    expect(
      passedChamberMeasures(
        [action("a", "senate", "cloture"), action("b", "senate", "passage")],
        "senate",
        "passage",
      ),
    ).toBe(1);
  });
  it("counts a bill once and keeps the two chambers separate", () => {
    expect(
      passedChamberMeasures(
        [
          action("a", "house", "passage"),
          action("a", "house", "passage"),
          action("b", "senate", "passage"),
        ],
        "house",
        "passage",
      ),
    ).toBe(1);
  });
  it("uses the final stage of each bill's recorded route", () => {
    expect(
      passedChamberMeasures(
        [
          action("ordinary", "senate", "cloture"),
          action("ordinary", "senate", "passage"),
          action("other", "senate", "third-reading"),
          action("unresolved", "senate", "passage"),
        ],
        "senate",
        (measureId) =>
          measureId === "ordinary"
            ? "passage"
            : measureId === "other"
              ? "third-reading"
              : null,
      ),
    ).toBe(2);
  });
  it("does not manufacture passage when the final stage is unresolved", () => {
    expect(
      passedChamberMeasures([action("a", "senate", "passage")], "senate", null),
    ).toBe(0);
  });
});
