import { describe, expect, it } from "vitest";
import { affordableStaff } from "./modules/jobs";
import type { BusinessTradingMonth } from "./modules/business";

const month: BusinessTradingMonth = {
  id: "trading:firm:month",
  organizationId: "firm",
  date: "2025-02-01",
  from: "2025-01-01",
  days: 31,
  salesMinor: 800,
  payrollMinor: 600,
  costsMinor: 1000,
  complianceMinor: 0,
  lossMonths: 1,
};

describe("staffing from an employer's own trading", () => {
  it("cuts more after persistent losses, without a turnover-rate input", () => {
    const first = affordableStaff(12, 12, month);
    const persistent = affordableStaff(12, 12, { ...month, lossMonths: 3 });
    expect(first).toBeLessThan(12);
    expect(persistent).toBeLessThan(first);
    expect(persistent).toBeGreaterThan(0);
  });
  it("reads paid costs including compliance and preserves a lower demand target", () => {
    const costly = { ...month, costsMinor: 1200, complianceMinor: 200 };
    expect(affordableStaff(12, 12, costly)).toBeLessThan(
      affordableStaff(12, 12, month),
    );
    expect(affordableStaff(2, 12, month)).toBe(2);
  });
  it("does not invent losses before trading or when there is no payroll", () => {
    expect(affordableStaff(12, 10, undefined)).toBe(12);
    expect(affordableStaff(12, 10, { ...month, payrollMinor: 0 })).toBe(12);
    expect(affordableStaff(12, 10, { ...month, salesMinor: 1200 })).toBe(12);
  });
});
