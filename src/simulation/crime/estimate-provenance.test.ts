import { describe, expect, it } from "vitest";

import { LOCAL_CRIME_RATES, TOWN_POLICE_LOG } from "./contract";
import { DIPLOMA_OFFENDING_ESTIMATE, OFFENDER_WEIGHTS } from "./offenders";
import { VICTIM_EXPOSURE_ESTIMATE } from "./producer";

describe("every crime value says where it comes from", () => {
  it.each([
    ["local crime rates", LOCAL_CRIME_RATES],
    ["town police log", TOWN_POLICE_LOG],
    ["offender weights", OFFENDER_WEIGHTS],
    ["diploma offending", DIPLOMA_OFFENDING_ESTIMATE],
    ["victim exposure", VICTIM_EXPOSURE_ESTIMATE],
  ])("%s carries an estimate flag and its source", (_name, table) => {
    expect(table.provenance).toBe("estimated-from-average");
    expect(table.provenance).not.toMatch(/unresearched|blanket/);
    expect(table.estimated).toBe(true);
    expect(table.estimatedFrom.length).toBeGreaterThan(20);
  });

  it("starts each offense from the national BJS rate", () => {
    const assault = LOCAL_CRIME_RATES.offenses.find(
      (rule) => rule.offense === "assault",
    )!;
    // 4.5 aggravated plus 13.8 simple per 1,000 persons 12+, 2023.
    expect(assault.annualRate).toBeCloseTo(0.0183, 4);
  });
});
