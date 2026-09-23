import { describe, expect, it } from "vitest";
import { electedExecutiveOfficeJurisdiction } from "./executive-work-context";
import { stateJurisdictionForKey } from "./life-places";
import { districtOfColumbiaJurisdictionId } from "./nationwide-world/district-of-columbia";

describe("the jurisdiction an elected executive governs from", () => {
  it("is the District's one government for the Mayor, not a district-wide placeholder", () => {
    const governing = electedExecutiveOfficeJurisdiction("US-DC");
    expect(governing?.id).toBe(districtOfColumbiaJurisdictionId());
    // The direct resolution is the placeholder no mayoral contest runs in;
    // every D.C. life froze the day before its first mayoral election when
    // the term planner compared against it.
    expect(governing?.id).not.toBe(stateJurisdictionForKey("US-DC")?.id);
  });

  it("is the state jurisdiction for a governor", () => {
    expect(electedExecutiveOfficeJurisdiction("US-OR")?.id).toBe(
      stateJurisdictionForKey("US-OR")?.id,
    );
  });
});
