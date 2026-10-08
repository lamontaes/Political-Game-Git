import { describe, expect, it } from "vitest";
import { orderEnforcementTargets } from "./enforcement-priority";
import { STATES } from "../state-reference";

describe("executive enforcement priority ranking", () => {
  it("puts first, ordinary, and lowest targets in order without breaking ties", () => {
    const targets = [
      { subjectKey: "ordinary-a", personId: "person-a" },
      { subjectKey: "lowest", personId: "person-c" },
      { subjectKey: "first", personId: "person-d" },
      { subjectKey: "ordinary-b", personId: "person-b" },
    ];

    const ranked = orderEnforcementTargets(targets, (subjectKey) => {
      if (subjectKey === "first") return "first";
      if (subjectKey === "lowest") return "lowest";
      return "ordinary";
    });

    expect(ranked.map(({ personId }) => personId)).toEqual([
      "person-d",
      "person-a",
      "person-b",
      "person-c",
    ]);
  });

  it("uses one ranking path across all state, district, and territory keys", () => {
    const jurisdictionKeys = Object.keys(STATES).map((key) => `US-${key}`);
    expect(jurisdictionKeys).toHaveLength(56);

    for (const jurisdictionKey of jurisdictionKeys) {
      const ranked = orderEnforcementTargets(
        [
          { subjectKey: `${jurisdictionKey}:ordinary`, index: 0 },
          { subjectKey: `${jurisdictionKey}:first`, index: 1 },
          { subjectKey: `${jurisdictionKey}:lowest`, index: 2 },
        ],
        (subjectKey) => {
          if (subjectKey.endsWith(":first")) return "first";
          if (subjectKey.endsWith(":lowest")) return "lowest";
          return "ordinary";
        },
      );
      expect(ranked.map(({ index }) => index)).toEqual([1, 0, 2]);
    }
  });
});
