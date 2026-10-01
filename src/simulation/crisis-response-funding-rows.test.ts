import { describe, expect, it } from "vitest";

import budgets from "../../data/research/money/government-budgets-2026.json" with { type: "json" };
import {
  CRISIS_FUNDING_FEDERAL_SOURCE,
  CRISIS_FUNDING_ROWS,
} from "./crisis-response-funding-rows";
import { RESEARCHED_PLACE_KEYS } from "./statutory-tax-rules";

const byKey = new Map(CRISIS_FUNDING_ROWS.map((row) => [row.placeKey, row]));

describe("crisis-response (988) funding rows", () => {
  it("cover all 56 places once each, at each government's own fiscal-year start", () => {
    const keys = CRISIS_FUNDING_ROWS.map((row) => row.placeKey);
    expect(new Set(keys).size).toBe(56);
    expect([...keys].sort()).toEqual([...RESEARCHED_PLACE_KEYS].sort());
    const places = budgets.places as Record<
      string,
      { fiscalYear: { startsOn: string } }
    >;
    for (const row of CRISIS_FUNDING_ROWS)
      expect(row.fiscalYearStartsOn).toBe(
        places[row.placeKey]!.fiscalYear.startsOn,
      );
    expect(byKey.get("US-NY")!.fiscalYearStartsOn).toBe("04-01");
    expect(byKey.get("US-TX")!.fiscalYearStartsOn).toBe("09-01");
    expect(byKey.get("US-AL")!.fiscalYearStartsOn).toBe("10-01");
  });

  it("keep SAMHSA's expired ceilings as calibration that sums to the published total", () => {
    const total = CRISIS_FUNDING_ROWS.reduce(
      (sum, row) => sum + row.federalMaxEligibility.maxEligibilityMinorUnits,
      0,
    );
    expect(total).toBe(CRISIS_FUNDING_FEDERAL_SOURCE.totalMinorUnits);
    const base = CRISIS_FUNDING_ROWS.filter(
      (row) => row.federalMaxEligibility.basis === "base-award",
    );
    expect(base).toHaveLength(11);
    for (const row of base)
      expect(row.federalMaxEligibility.maxEligibilityMinorUnits).toBe(
        25_000_000,
      );
  });

  it("take a state's adopted appropriation only from its quoted line, dated by its own fiscal year", () => {
    const state = (key: string) => {
      const row = byKey.get(key)!.state;
      if ("unreported" in row) throw new Error(`${key} unreported`);
      return row;
    };
    // Alaska: $750,000 appropriated against a $2.8 million all-source total.
    expect(state("US-AK").stateAdoptedAppropriations).toEqual([
      {
        amountMinorUnits: 75_000_000,
        fiscalYear: "FY26",
        availableFrom: "2025-07-01",
        availableThrough: "2026-06-30",
        sourceQuote: "FY26 State Appropriation: $750,000",
      },
    ]);
    expect(state("US-AK").allSourceTotalMinorUnits).toBe(280_000_000);
    // Arkansas names no state amount: nothing adopted, the grants stay calibration.
    expect(state("US-AR").stateAdoptedAppropriations).toEqual([]);
    expect(state("US-AR").allSourceTotalMinorUnits).toBe(156_000_000);
    // Alabama's line names two fiscal years, each on its October 1 year.
    expect(
      state("US-AL").stateAdoptedAppropriations.map((row) => [
        row.fiscalYear,
        row.amountMinorUnits,
        row.availableFrom,
        row.availableThrough,
      ]),
    ).toEqual([
      ["FY25", 350_000_000, "2024-10-01", "2025-09-30"],
      ["FY26", 400_000_000, "2025-10-01", "2026-09-30"],
    ]);
    // New York's fiscal year starts April 1.
    expect(state("US-NY").stateAdoptedAppropriations[0]).toMatchObject({
      availableFrom: "2025-04-01",
      availableThrough: "2026-03-31",
    });
    for (const row of CRISIS_FUNDING_ROWS) {
      if ("unreported" in row.state) continue;
      for (const adopted of row.state.stateAdoptedAppropriations) {
        expect(adopted.sourceQuote).toBe(row.state.appropriationLine);
        expect(adopted.amountMinorUnits).toBeGreaterThan(0);
        expect(adopted.availableFrom < adopted.availableThrough).toBe(true);
      }
      if (row.state.appropriationLine?.includes("None specified"))
        expect(row.state.stateAdoptedAppropriations).toEqual([]);
    }
  });

  it("leave a place the state report does not cover unreported, never guessed", () => {
    const unreported = CRISIS_FUNDING_ROWS.filter(
      (row) => "unreported" in row.state,
    ).map((row) => row.placeKey);
    expect([...unreported].sort()).toEqual(
      [
        "US-AS",
        "US-DC",
        "US-GU",
        "US-HI",
        "US-MI",
        "US-MP",
        "US-NC",
        "US-NE",
        "US-OK",
        "US-PA",
        "US-PR",
        "US-VI",
      ].sort(),
    );
  });
});
