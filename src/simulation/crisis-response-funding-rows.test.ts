import { describe, expect, it } from "vitest";

import {
  CRISIS_FUNDING_FEDERAL_SOURCE,
  CRISIS_FUNDING_ROWS,
} from "./crisis-response-funding-rows";
import { RESEARCHED_PLACE_KEYS } from "./statutory-tax-rules";

describe("crisis-response (988) funding rows", () => {
  it("cover all 56 places once each", () => {
    const keys = CRISIS_FUNDING_ROWS.map((row) => row.placeKey);
    expect(new Set(keys).size).toBe(56);
    expect([...keys].sort()).toEqual([...RESEARCHED_PLACE_KEYS].sort());
  });

  it("sum to SAMHSA's published total, by the published formula", () => {
    const total = CRISIS_FUNDING_ROWS.reduce(
      (sum, row) => sum + row.federal.awardMinorUnits,
      0,
    );
    expect(total).toBe(CRISIS_FUNDING_FEDERAL_SOURCE.totalMinorUnits);
    const base = CRISIS_FUNDING_ROWS.filter(
      (row) => row.federal.basis === "base-award",
    );
    expect(base).toHaveLength(11);
    for (const row of base) {
      expect(row.federal.awardMinorUnits).toBe(25_000_000);
      expect(row.federal.callShareLabel).toBeNull();
    }
    for (const row of CRISIS_FUNDING_ROWS.filter(
      (row) => row.federal.basis === "call-share",
    )) {
      expect(row.federal.routedCallsFy2021).toBeGreaterThanOrEqual(4_283);
      expect(row.federal.callShareLabel).toMatch(/%$/);
    }
  });

  it("leave a place the state report does not cover unreported, never guessed", () => {
    const unreported = CRISIS_FUNDING_ROWS.filter(
      (row) => "unreported" in row.state,
    ).map((row) => row.placeKey);
    for (const key of [
      "US-HI",
      "US-MI",
      "US-NE",
      "US-NC",
      "US-OK",
      "US-DC",
      "US-PR",
      "US-GU",
      "US-VI",
      "US-AS",
      "US-MP",
      "US-PA",
    ])
      expect(unreported).toContain(key);
    for (const row of CRISIS_FUNDING_ROWS)
      if (!("unreported" in row.state) && row.state.totalFundingMinorUnits)
        expect(row.state.totalFundingPeriod).toMatch(/^FY\d/);
  });
});
