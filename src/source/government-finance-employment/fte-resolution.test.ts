import { describe, expect, it } from "vitest";

import { resolveFullTimeEquivalent } from "./employment_normalizer.js";
import { isFteResolved } from "./types.js";

/**
 * PR #56's defect: when part-time employees existed but no conversion input
 * was published, FTE fell back to the full-time headcount. That silently
 * omitted the entire part-time contribution while presenting a complete total.
 * These tests are written against that specific failure.
 */
describe("full-time-equivalent resolution refuses to guess", () => {
  const BASE = {
    reported: null,
    fullTimeEmployees: 100,
    partTimeEmployees: null,
    partTimeHours: null,
    partTimePayroll: null,
    averageFullTimeSalary: null,
  };

  it("THE DEFECT: part-time staff with no conversion input stays unresolved, never the full-time headcount", () => {
    const result = resolveFullTimeEquivalent({
      ...BASE,
      partTimeEmployees: 40,
    });

    expect(result.fte).toBeNull();
    expect(result.fte).not.toBe(100);
    expect(result.fteResolution.status).toBe(
      "unresolved_missing_part_time_conversion_inputs",
    );
    expect(isFteResolved(result.fteResolution)).toBe(false);
    expect(result.fteResolution.explanation).toMatch(/40 part-time employees/);
  });

  it("stays unresolved when part-time payroll is present but average salary is not", () => {
    const result = resolveFullTimeEquivalent({
      ...BASE,
      partTimeEmployees: 40,
      partTimePayroll: 90_000,
      averageFullTimeSalary: null,
    });

    expect(result.fte).toBeNull();
    expect(result.fteResolution.status).toBe(
      "unresolved_missing_part_time_conversion_inputs",
    );
  });

  it("stays unresolved when the part-time headcount itself is unknown", () => {
    const result = resolveFullTimeEquivalent(BASE);

    expect(result.fte).toBeNull();
    expect(result.fteResolution.status).toBe(
      "unresolved_unknown_part_time_headcount",
    );
  });

  it("treats a KNOWN zero part-time headcount as a finding, not as missing data", () => {
    const result = resolveFullTimeEquivalent({
      ...BASE,
      partTimeEmployees: 0,
    });

    expect(result.fte).toBe(100);
    expect(result.fteResolution.status).toBe(
      "equals_full_time_no_part_time_staff",
    );
    expect(isFteResolved(result.fteResolution)).toBe(true);
  });

  it("derives from part-time hours when the source publishes them", () => {
    const result = resolveFullTimeEquivalent({
      ...BASE,
      partTimeEmployees: 40,
      partTimeHours: 3200,
    });

    expect(result.fte).toBe(120); // 100 + 3200/160
    expect(result.fteResolution.status).toBe("derived_from_part_time_hours");
  });

  it("derives from part-time payroll against average full-time salary", () => {
    const result = resolveFullTimeEquivalent({
      ...BASE,
      partTimeEmployees: 40,
      partTimePayroll: 90_000,
      averageFullTimeSalary: 4500,
    });

    expect(result.fte).toBe(120); // 100 + 90000/4500
    expect(result.fteResolution.status).toBe("derived_from_part_time_payroll");
  });

  it("prefers a directly reported figure over any derivation", () => {
    const result = resolveFullTimeEquivalent({
      ...BASE,
      reported: 117,
      partTimeEmployees: 40,
      partTimeHours: 3200,
    });

    expect(result.fte).toBe(117);
    expect(result.fteResolution.status).toBe("reported_by_source");
  });

  it("stays unresolved when there is no full-time base at all", () => {
    const result = resolveFullTimeEquivalent({
      ...BASE,
      fullTimeEmployees: null,
      partTimeEmployees: 40,
      partTimeHours: 3200,
    });

    expect(result.fte).toBeNull();
    expect(result.fteResolution.status).toBe(
      "unresolved_unknown_full_time_headcount",
    );
  });

  it("never collapses an unresolved FTE to zero", () => {
    for (const input of [
      { ...BASE, partTimeEmployees: 40 },
      { ...BASE },
      { ...BASE, fullTimeEmployees: null, partTimeEmployees: 40 },
    ]) {
      const { fte } = resolveFullTimeEquivalent(input);
      expect(fte).toBeNull();
      expect(fte).not.toBe(0);
    }
  });
});
