import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate } from "../../simulation/dates";
import {
  taxableWages as legacyWages,
  taxAt as legacyTax,
} from "../../simulation/statutory-tax";
import { ruleChangeInForce as legacyRule } from "../../simulation/enacted-rule-changes";
import * as loans from "../../simulation/public-benefit-formulas";
import { schoolYearStartOnOrAfter as legacyYear } from "../../simulation/teacher-salary-floor";
import { taxableWages, taxAt } from "./statutory-payroll";
import { ruleChangeInForce } from "./rule-change-order";
import {
  monthlyInterestMinor,
  revolvingMinimumPaymentMinor,
  cappedAnnualRateBasisPoints,
} from "./loan-arithmetic";
import { schoolYearStartOnOrAfter } from "./school-year-date";
function result(f: () => unknown) {
  try {
    return { value: f() };
  } catch (e) {
    return { name: (e as Error).name, message: (e as Error).message };
  }
}
describe("remaining standalone law-in-force KEEP rules", () => {
  it.each(Object.keys(STATES))(
    "matches payroll, hierarchy, loan and date decisions for %s",
    () => {
      for (const cap of [null, 0, 100000])
        for (const floor of [null, 0, 50000])
          for (const before of [0, 25000, 100000])
            for (const wages of [0, 30000, 100000]) {
              const rule = {
                annualWageCapMinor: cap,
                annualWageFloorMinor: floor,
              };
              expect(taxableWages(rule, before, wages)).toBe(
                legacyWages(rule, before, wages),
              );
            }
      for (const taxable of [-5, 0, 1, 199, 100000, 1.5])
        for (const rate of [0, 100, 765, 10000])
          expect(result(() => taxAt(taxable, rate))).toEqual(
            result(() => legacyTax(taxable, rate)),
          );
      const changes = [
        { level: "local-ordinance", field: "test", id: "a" },
        { level: "state-statute", field: "test", id: "b" },
        { level: "state-statute", field: "test", id: "c" },
        { level: "state-constitution", field: "test", id: "d" },
      ] as unknown as Parameters<typeof legacyRule>[0];
      for (const rows of [
        [],
        changes,
        changes.slice(0, 3),
        [...changes].reverse(),
      ])
        expect(ruleChangeInForce(rows)).toEqual(legacyRule(rows));
      for (const balance of [-1, 0, 1, 1000000])
        for (const rate of [0, 100, 1200, 2500]) {
          expect(monthlyInterestMinor(balance, rate)).toBe(
            loans.monthlyInterestMinor(balance, rate),
          );
          for (const share of [0, 100, 10000])
            expect(
              revolvingMinimumPaymentMinor(balance, rate, share, 2500),
            ).toBe(
              loans.revolvingMinimumPaymentMinor(balance, rate, share, 2500),
            );
          for (const cap of [null, 0, 100, 3000])
            expect(cappedAnnualRateBasisPoints(rate, cap)).toBe(
              loans.cappedAnnualRateBasisPoints(rate, cap),
            );
        }
      for (const day of [
        "2025-12-31",
        "2026-06-30",
        "2026-07-01",
        "2026-07-02",
        "2028-02-29",
      ]) {
        const date = makeIsoDate(day);
        expect(schoolYearStartOnOrAfter(date)).toBe(legacyYear(date));
      }
    },
  );
});
