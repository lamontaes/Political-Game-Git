import { describe, expect, it } from "vitest";
import { createStableId } from "../ids";
import { stateJurisdictionForKey } from "../life-places";
import { STATES } from "../state-reference";
import { jurisdictionPowersLevels } from "./question-authority";

describe("recorded jurisdiction-kind authority", () => {
  it("joins all 56 canonical references to the existing powers columns", () => {
    const counts = { state: 0, "federal-district": 0, territory: 0 };
    for (const [usps, reference] of Object.entries(STATES)) {
      const jurisdiction = stateJurisdictionForKey(`US-${usps}`);
      expect(jurisdiction, `canonical jurisdiction ${usps}`).toBeDefined();
      const kind = reference.jurisdictionKind;
      counts[kind] += 1;
      expect(jurisdictionPowersLevels(null, jurisdiction!.id)).toEqual([
        kind === "federal-district" ? "dc" : kind,
      ]);
    }
    expect(counts).toEqual({ state: 50, "federal-district": 1, territory: 5 });
  });

  it("leaves an unknown jurisdiction without an invented state authority", () => {
    const id = createStableId("jurisdiction", "a109-unknown-reference");
    expect(jurisdictionPowersLevels(null, id)).toEqual([]);
    expect(jurisdictionPowersLevels({ jurisdictions: {} }, id)).toEqual([]);
  });
});
