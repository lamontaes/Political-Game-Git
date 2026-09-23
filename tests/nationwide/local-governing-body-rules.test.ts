import { describe, expect, it } from "vitest";
import {
  allGovernmentUnits,
  governmentUnitsForPlace,
} from "../../src/simulation/government-units";
import {
  localGoverningBodyReadSpread,
  localGoverningBodyRules,
  localRuleCoverage,
} from "../../src/simulation/nationwide-world/local-governing-body-rules";
import { townSeatRulesSentence } from "../../src/presentation/local-governing-seat";
import { governmentUnitDisplayName } from "../../src/simulation/nationwide-world/government-unit-names";

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
    const { seats, termYears } = localGoverningBodyReadSpread();
    expect(Math.min(...seats)).toBe(4);
    expect(Math.max(...seats)).toBeLessThanOrEqual(15);
    expect(termYears).toEqual([2, 3, 4, 6]);
  });

  it("across the country, unread towns come out in ICMA's national shares", () => {
    // ICMA 2018 as ChatGPT reported it: 5 seats 39.3%, 7 seats 26.1%, 4-year
    // terms 63.6% of those with a stated length.
    const unread = allGovernmentUnits()
      .map(localGoverningBodyRules)
      .filter(
        (rules) => rules !== null && rules.researchedGovernmentKey === null,
      );
    expect(unread.length).toBeGreaterThan(19_000);
    const share = (pick: (r: (typeof unread)[number]) => boolean) =>
      unread.filter(pick).length / unread.length;
    expect(share((r) => r!.seats!.value === 5)).toBeCloseTo(0.393, 1);
    expect(share((r) => r!.seats!.value === 7)).toBeCloseTo(0.261, 1);
    expect(share((r) => r!.termYears!.value === 4)).toBeCloseTo(0.652, 1);
    expect(share((r) => r!.seats!.value >= 8)).toBeCloseTo(0.101, 1);
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
      "The game has not read how this body is made up, so it gives it 9 seats and 2-year terms, as town councils across the country commonly have.",
    );
    expect(
      townSeatRulesSentence({
        seats: { value: 5, basis: "read" },
        termYears: { value: 3, basis: "typical" },
      }),
    ).toBe(
      "By the town's own rules the body has 5 seats. The game has not read the rest, so it gives it 3-year terms, as town councils across the country commonly have.",
    );
    expect(townSeatRulesSentence({ seats: null, termYears: null })).toBeNull();
  });
});

describe("a government's name as people write it", () => {
  it.each([
    ["COUNTY OF WASHINGTON", "county", "Washington County"],
    ["COUNTY OF ST LOUIS", "county", "St. Louis County"],
    ["PARISH OF ST JAMES", "county", "St. James Parish"],
    ["BOROUGH OF KODIAK ISLAND", "county", "Kodiak Island Borough"],
    ["BOROUGH OF PRINCETON", "municipality", "Borough of Princeton"],
    ["CITY OF ST MARYS", "municipality", "City of St. Marys"],
    ["CITY OF EASTPORT", "municipality", "City of Eastport"],
    ["TOWN OF WEST ST", "municipality", "Town of West St"],
  ] as const)("%s reads %s", (name, unitType, expected) => {
    expect(governmentUnitDisplayName({ name, unitType })).toBe(expected);
  });
});
