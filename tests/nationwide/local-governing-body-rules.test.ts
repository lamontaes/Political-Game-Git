import { describe, expect, it } from "vitest";
import { governmentUnitsForPlace } from "../../src/simulation/government-units";
import {
  localGoverningBodyReadSpread,
  localGoverningBodyRules,
  localRuleCoverage,
} from "../../src/simulation/nationwide-world/local-governing-body-rules";
import { townSeatRulesSentence } from "../../src/presentation/local-governing-seat";

/**
 * Which towns' governing-body rules the game has read, and what every other
 * town is given instead. Places are spread across the country on purpose:
 * big and small, read and unread, none of them Kentucky.
 */

const rulesAt = (placeGeoid: string) => {
  const units = governmentUnitsForPlace(placeGeoid)
    .map(localGoverningBodyRules)
    .filter((rules) => rules !== null);
  expect(units).toHaveLength(1);
  return units[0]!;
};

// Towns nobody has read: a Maine city, an Iowa town, a New Mexico spa town
// and an Idaho farm town.
const UNREAD = {
  "Presque Isle, ME": "2360825",
  "Sioux Center, IA": "1973335",
  "Truth or Consequences, NM": "3579840",
  "American Falls, ID": "1601900",
};

describe("the record of which towns have researched rules", () => {
  it("covers every town offered a governing body and names the ones read", () => {
    const coverage = localRuleCoverage();
    expect(coverage.towns).toBe(19_462);
    // Pinned so a change to what has been read is a deliberate edit here.
    expect(coverage.researched).toHaveLength(60);
    expect(
      coverage.researched.filter((row) => row.read.length > 0),
    ).toHaveLength(39);
    expect(coverage.onTypicalValues).toBe(
      coverage.towns -
        coverage.researched.filter((row) => row.read.length > 0).length,
    );
    // Every state's towns add up to the whole; Hawaii has no municipal
    // government of its own, and Puerto Rico's municipios are not in this
    // listing as municipalities.
    const byState = Object.values(coverage.byState);
    expect(byState.reduce((sum, state) => sum + state.towns, 0)).toBe(
      coverage.towns,
    );
    expect(coverage.byState.HI).toBeUndefined();
    expect(coverage.byState.PR).toBeUndefined();
    expect(coverage.byState.DC).toEqual({ towns: 1, researched: 1 });
  });

  it.each([
    ["Bangor, ME", "2302795"],
    ["Manchester, NH", "3345140"],
    ["Trenton, NJ", "3474000"],
    ["Carson City, NV", "3209700"],
  ])("%s: both seats and term are the town's own", (_, geoid) => {
    const rules = rulesAt(geoid);
    expect(rules.researchedGovernmentKey).not.toBeNull();
    expect(rules.seats?.basis).toBe("read");
    expect(rules.termYears?.basis).toBe("read");
  });
});

describe("a town nobody has read", () => {
  it.each(Object.entries(UNREAD))(
    "%s is given typical values from the councils the game has read",
    (_, geoid) => {
      const rules = rulesAt(geoid);
      const spread = localGoverningBodyReadSpread();
      expect(rules.researchedGovernmentKey).toBeNull();
      expect(rules.seats?.basis).toBe("typical");
      expect(rules.termYears?.basis).toBe("typical");
      expect(spread.seats).toContain(rules.seats!.value);
      expect(spread.termYears).toContain(rules.termYears!.value);
      // The same town draws the same council every time it is asked.
      expect(rulesAt(geoid)).toEqual(rules);
    },
  );

  it("never draws the extremes: a consolidated city's council is not typical", () => {
    const { seats } = localGoverningBodyReadSpread();
    expect(Math.min(...seats)).toBeGreaterThanOrEqual(5);
    expect(Math.max(...seats)).toBeLessThanOrEqual(15);
    // Across many unread towns more than one size comes out.
    const drawn = new Set<number>();
    for (const geoid of Object.values(UNREAD))
      drawn.add(rulesAt(geoid).seats!.value);
    expect(drawn.size).toBeGreaterThan(1);
  });
});

describe("what the office screen says about the body", () => {
  it("says a read rule plainly and labels a typical one as typical", () => {
    expect(
      townSeatRulesSentence({
        seats: { value: 5, basis: "read" },
        termYears: { value: 4, basis: "read" },
      }),
    ).toBe("By the town's own rules the body has 5 seats and 4-year terms.");
    expect(
      townSeatRulesSentence({
        seats: { value: 9, basis: "typical" },
        termYears: { value: 2, basis: "typical" },
      }),
    ).toBe(
      "The game has not read how this body is made up, so it gives it 9 seats and 2-year terms, as the councils it has read typically have.",
    );
    expect(
      townSeatRulesSentence({
        seats: { value: 5, basis: "read" },
        termYears: { value: 3, basis: "typical" },
      }),
    ).toBe(
      "By the town's own rules the body has 5 seats. The game has not read the rest, so it gives it 3-year terms, as the councils it has read typically have.",
    );
    expect(townSeatRulesSentence({ seats: null, termYears: null })).toBeNull();
  });
});
