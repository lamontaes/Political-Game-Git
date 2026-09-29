import { describe, expect, it } from "vitest";
import {
  STATES,
  TERRITORY_USPS,
  birthConfersCitizenship,
  nonvotingHouseMemberTitle,
} from "./state-reference";

describe("what a birth in each place confers", () => {
  it("makes a citizen of a birth in every state and the District", () => {
    const states = Object.keys(STATES).filter(
      (usps) => !TERRITORY_USPS.has(usps),
    );
    expect(states.length).toBeGreaterThanOrEqual(51);
    for (const usps of states) {
      expect(birthConfersCitizenship(`US-${usps}`), usps).toBe(true);
    }
  });

  it("reads each territory from its own statute", () => {
    const confers = Object.fromEntries(
      [...TERRITORY_USPS]
        .sort()
        .map((usps) => [usps, birthConfersCitizenship(`US-${usps}`)]),
    );
    expect(confers).toEqual({
      AS: false,
      GU: true,
      MP: true,
      PR: true,
      VI: true,
    });
  });

  it("does not guess for a key it cannot read", () => {
    expect(birthConfersCitizenship("kentucky")).toBe(false);
    expect(birthConfersCitizenship("US-")).toBe(false);
  });
});

describe("the member a territory or the District sends to the House", () => {
  it("has a title for every place that sends one, and none for a state", () => {
    for (const usps of TERRITORY_USPS)
      expect(nonvotingHouseMemberTitle(usps), usps).not.toBeNull();
    expect(nonvotingHouseMemberTitle("PR")).toBe("Resident Commissioner");
    expect(nonvotingHouseMemberTitle("DC")).toBe("Delegate");
    const states = Object.keys(STATES).filter(
      (usps) => !TERRITORY_USPS.has(usps) && usps !== "DC",
    );
    for (const usps of states)
      expect(nonvotingHouseMemberTitle(usps), usps).toBeNull();
  });
});
