import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../../simulation/dates";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { STATES } from "../../simulation/state-reference";
import {
  decideEvictionCase as legacyDecideEvictionCase,
  marketRentLevel,
  marketRentMinor as legacyMarketRentMinor,
  type EvictionCaseFacts as LegacyEvictionCaseFacts,
} from "../../simulation/living-world/town-rent";
import type { World } from "../../simulation/types";
import {
  decideEvictionOutcome,
  marketRentMinorFromFacts,
  type EvictionDecisionFacts,
} from "./rent-and-eviction";

const facts: readonly EvictionDecisionFacts[] = [
  {
    monthsBehind: 3,
    landlordPursues: false,
    tenantAnswers: false,
    lawyer: false,
    planCarried: null,
    judgeLean: 1,
  },
  {
    monthsBehind: 3,
    landlordPursues: true,
    tenantAnswers: false,
    lawyer: false,
    planCarried: null,
    judgeLean: -1,
  },
  {
    monthsBehind: 4,
    landlordPursues: true,
    tenantAnswers: true,
    lawyer: true,
    planCarried: null,
    judgeLean: 1,
  },
  {
    monthsBehind: 5,
    landlordPursues: true,
    tenantAnswers: true,
    lawyer: true,
    planCarried: false,
    judgeLean: -1,
  },
  {
    monthsBehind: 5,
    landlordPursues: true,
    tenantAnswers: true,
    lawyer: false,
    planCarried: true,
    judgeLean: 1,
  },
  {
    monthsBehind: 2,
    landlordPursues: true,
    tenantAnswers: true,
    lawyer: false,
    planCarried: false,
    judgeLean: -1,
  },
  {
    monthsBehind: 3,
    landlordPursues: true,
    tenantAnswers: true,
    lawyer: false,
    planCarried: false,
    judgeLean: -1,
  },
  {
    monthsBehind: 1,
    landlordPursues: true,
    tenantAnswers: true,
    lawyer: false,
    planCarried: null,
    judgeLean: 0,
  },
];

describe("standalone housing rules", () => {
  it.each(facts)("matches the legacy eviction disposition for %o", (row) => {
    expect(decideEvictionOutcome(row)).toBe(
      legacyDecideEvictionCase(row as LegacyEvictionCaseFacts).outcome,
    );
  });

  it.each(Object.keys(STATES).map((usps) => `US-${usps}`))(
    "matches the legacy rent result in %s",
    (key) => {
      const place = stateJurisdictionForKey(key)!;
      const world = {
        currentDate: makeIsoDate("2026-01-01"),
        history: { legislativeMeasures: [], legislativeEnactments: [] },
        macroEconomy: { months: [] },
      } as unknown as World;
      const date = world.currentDate;
      const row = { rents: [1000, 1200, 1400, 1600, 1800] };
      const level = marketRentLevel(world, place.id, date);
      for (const bedrooms of [-1, 0, 2, 4, 6])
        expect(
          marketRentMinorFromFacts(row.rents, level, bedrooms),
          `${key}, ${bedrooms} bedrooms`,
        ).toBe(legacyMarketRentMinor(world, place.id, row, bedrooms, date));
    },
  );
});
