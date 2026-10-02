import { describe, expect, it } from "vitest";
import {
  CONTINGENT_STATES,
  ELECTORAL_ALLOCATION,
  nationalElectionRules,
} from "./national-election-rules";
import {
  STATES,
  FEDERAL_DISTRICT_USPS,
  TERRITORY_USPS,
  birthConfersCitizenship,
  nonvotingHouseMemberTitle,
} from "./state-reference";

describe("place data owns jurisdiction kind and elector allocation", () => {
  it("classifies all 56 places without giving territories electors or a contingent state vote", () => {
    const places = Object.entries(STATES);
    expect(places).toHaveLength(56);
    expect(
      places.filter(([, place]) => place.jurisdictionKind === "state"),
    ).toHaveLength(50);
    expect([...FEDERAL_DISTRICT_USPS]).toEqual(["DC"]);
    expect([...TERRITORY_USPS].sort()).toEqual(["AS", "GU", "MP", "PR", "VI"]);
    expect(CONTINGENT_STATES).toHaveLength(50);
    for (const [usps, place] of places) {
      expect(CONTINGENT_STATES.includes(usps), usps).toBe(
        place.jurisdictionKind === "state",
      );
      expect(place.electorAllocation === "none", usps).toBe(
        place.jurisdictionKind === "territory",
      );
    }
  });

  it("preserves the sourced district splits and all 538 electors in every supported allocation version", () => {
    expect(
      Object.entries(STATES)
        .filter(
          ([, place]) => place.electorAllocation === "congressional-district",
        )
        .map(([usps]) => usps)
        .sort(),
    ).toEqual(["ME", "NE"]);
    for (const cycle of [2024, 2028, 2032]) {
      const rules = nationalElectionRules(cycle);
      expect(rules.units.reduce((sum, unit) => sum + unit.electors, 0)).toBe(
        538,
      );
      for (const [usps, place] of Object.entries(STATES)) {
        const units = rules.units.filter((unit) => unit.state === usps);
        expect(
          units.reduce((sum, unit) => sum + unit.electors, 0),
          `${cycle} ${usps}`,
        ).toBe(ELECTORAL_ALLOCATION[usps] ?? 0);
        if (place.electorAllocation === "congressional-district") {
          expect(units[0], usps).toEqual({
            key: usps,
            state: usps,
            electors: 2,
            countsPopular: true,
          });
          expect(
            units
              .slice(1)
              .every((unit) => unit.electors === 1 && !unit.countsPopular),
            usps,
          ).toBe(true);
          expect(
            units.map((unit) => unit.key),
            usps,
          ).toEqual([
            usps,
            ...Array.from(
              { length: ELECTORAL_ALLOCATION[usps]! - 2 },
              (_, index) => `${usps}-${index + 1}`,
            ),
          ]);
        } else {
          expect(units, usps).toHaveLength(
            place.electorAllocation === "none" ? 0 : 1,
          );
        }
      }
      expect(nationalElectionRules(cycle)).toBe(rules);
      expect(Object.isFrozen(rules.units)).toBe(true);
    }
  });
});

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
