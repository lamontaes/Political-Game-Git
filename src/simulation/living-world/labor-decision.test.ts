import { describe, expect, it } from "vitest";
import { laborDemand, type LaborDemandInput } from "./labor-decision";
const base: LaborDemandInput = {
  age: 30,
  householdMonthlyNeedsMinor: 250_000,
  otherHouseholdIncomeMinor: 0,
  expectedMonthlyPayMinor: 350_000,
  savingsMinor: 0,
  retirementMonthlyIncomeMinor: 0,
  schoolHours: 0,
  caregivingHours: 0,
  childcareMonthlyCostMinor: 0,
  healthBurden: 0,
  physicalDemand: 0,
  workCommitment: 0.5,
  caregivingPreference: 0.5,
  employerHours: 40,
};
describe("work time follows household circumstances continuously", () => {
  it("a student needs more paid time as household support falls", () => {
    const student = { ...base, age: 20, schoolHours: 36 };
    expect(
      laborDemand({ ...student, otherHouseholdIncomeMinor: 0 }).weeklyHours,
    ).toBeGreaterThan(
      laborDemand({ ...student, otherHouseholdIncomeMinor: 600_000 })
        .weeklyHours,
    );
  });
  it("retirement resources, age and heavy work reduce hours gradually", () => {
    const older = {
      ...base,
      age: 67,
      savingsMinor: 20_000_000,
      retirementMonthlyIncomeMinor: 200_000,
    };
    expect(laborDemand(older).weeklyHours).toBeLessThan(
      laborDemand({
        ...older,
        savingsMinor: 0,
        retirementMonthlyIncomeMinor: 0,
      }).weeklyHours,
    );
    expect(
      laborDemand({ ...older, healthBurden: 0.5, physicalDemand: 1 })
        .weeklyHours,
    ).toBeLessThan(
      laborDemand({ ...older, healthBurden: 0.5, physicalDemand: 0 })
        .weeklyHours,
    );
    for (const age of [61.99, 62, 62.01, 64.99, 65, 65.01])
      expect(
        Math.abs(
          laborDemand({ ...older, age }).weeklyHours -
            laborDemand({ ...older, age: age + 0.01 }).weeklyHours,
        ),
      ).toBeLessThan(0.05);
  });
  it("partner support and childcare costs increase caregiving time", () => {
    const parent = {
      ...base,
      caregivingHours: 40,
      otherHouseholdIncomeMinor: 600_000,
    };
    expect(
      laborDemand({ ...parent, childcareMonthlyCostMinor: 150_000 })
        .weeklyHours,
    ).toBeLessThan(
      laborDemand({ ...parent, childcareMonthlyCostMinor: 0 }).weeklyHours,
    );
    expect(laborDemand(parent).weeklyHours).toBeLessThan(
      laborDemand({ ...parent, otherHouseholdIncomeMinor: 0 }).weeklyHours,
    );
  });
  it("never assigns more hours than an employer offers", () => {
    for (const employerHours of [0, 12, 24, 40]) {
      const hours = laborDemand({ ...base, employerHours }).weeklyHours;
      expect(hours).toBeGreaterThanOrEqual(0);
      expect(hours).toBeLessThanOrEqual(employerHours);
    }
  });
});
