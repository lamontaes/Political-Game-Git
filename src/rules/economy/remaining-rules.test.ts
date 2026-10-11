import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate, addDays } from "../../simulation/dates";
import { assessedCompletedHourlyGrossMinor as legacyGross } from "../../simulation/completed-hourly-gross";
import { modeledLocalBusinessOperatingIncomeMinor as legacyIncome } from "../../simulation/local-economy";
import { estimateLivingCostsCategoryAnnual as legacyCosts } from "../../simulation/living-costs-data";
import { cannabisRetailRevenue as legacyRevenue } from "../../simulation/public-budgets/cannabis-sales-revenue";
import { daysToFiscalYear as legacyFiscal } from "../../simulation/governing/budget-stakes";
import { previousMonthKey as legacyMonth } from "../../simulation/macro-economy/store";
import * as rent from "../../simulation/living-world/town-rent";
import * as pay from "../../simulation/living-world/town-pay";
import { onShiftAt as legacyShift } from "../../simulation/living-world/work-schedules";
import { assessedCompletedHourlyGrossMinor } from "./completed-gross";
import { modeledLocalBusinessOperatingIncomeMinor } from "./operating-income";
import { estimateLivingCostsCategoryAnnual } from "./living-cost-ratio";
import { cannabisRetailRevenue } from "./retail-revenue";
import { daysToFiscalYear, previousMonthKey } from "./fiscal-and-month-dates";
import {
  bedroomsForHousehold,
  inclusionarySetAsideOpen,
} from "./housing-occupancy";
import {
  payPeriodEndingOn,
  nextPaydayDate,
  weeklyHoursOf,
  onShiftAt,
} from "./payday-and-shift";
function result(f: () => unknown) {
  try {
    return { value: f() };
  } catch (e) {
    return { name: (e as Error).name, message: (e as Error).message };
  }
}
describe("remaining standalone economy KEEP rules", () => {
  it.each(Object.keys(STATES))(
    "matches completed work, costs, housing, budgets and calendars for %s",
    (place) => {
      for (const hourly of [-1, 0, 1000, 1.5, Infinity])
        for (const minutes of [0, 1, 60, 90, 1.5])
          for (const contract of [0, 10000])
            expect(
              result(() =>
                assessedCompletedHourlyGrossMinor(hourly, minutes, contract),
              ),
            ).toEqual(result(() => legacyGross(hourly, minutes, contract)));
      for (const receipts of [-1, 0, 100000, 1.5])
        for (const wages of [-1, 0, 50000, 200000])
          expect(
            result(() =>
              modeledLocalBusinessOperatingIncomeMinor(receipts, wages),
            ),
          ).toEqual(result(() => legacyIncome(receipts, wages)));
      const mean = (annualMeanUsd: number) => ({
        annualMeanUsd,
        standardErrorUsd: 1,
        relativeStandardErrorPercent: 1,
      });
      for (const size of [undefined, mean(1000)])
        for (const region of [undefined, mean(900)])
          for (const national of [undefined, mean(0), mean(1000)])
            expect(
              estimateLivingCostsCategoryAnnual(size, region, national),
            ).toEqual(legacyCosts(size, region, national));
      for (const persons of [-1, 0, 1, 2, 3, 8, 10, 1.5])
        expect(result(() => bedroomsForHousehold(persons))).toEqual(
          result(() => rent.bedroomsForHousehold(persons)),
        );
      for (const letHomes of [0, 1, 5])
        for (const homes of [0, 1, 10, 20])
          for (const share of [0, 0.1, 0.3, 1])
            expect(inclusionarySetAsideOpen(letHomes, homes, share)).toBe(
              rent.inclusionarySetAsideOpen(letHomes, homes, share),
            );
      for (const buyerShare of [0, 0.5, 1, -1, NaN])
        for (const salesTaxIncludesExcise of [false, true])
          for (const sources of [
            {
              lawTerms: place,
              adultBuyerBase: "adult records",
              spending: "spending records",
              legalMarketShare: "market records",
            },
            {
              lawTerms: "",
              adultBuyerBase: "adult",
              spending: "spending",
              legalMarketShare: "market",
            },
            {},
          ]) {
            const input = {
              adultResidents: 1000,
              buyerShare,
              annualPretaxSpendingPerBuyer: 200,
              legalMarketShare: 0.75,
              exciseRate: 0.1,
              stateSalesTaxRate: 0.05,
              salesTaxIncludesExcise,
              sources,
            } as Parameters<typeof legacyRevenue>[0];
            expect(result(() => cannabisRetailRevenue(input))).toEqual(
              result(() => legacyRevenue(input)),
            );
          }
      for (const day of [
        "2026-01-01",
        "2026-01-02",
        "2026-01-15",
        "2026-02-27",
        "2026-02-28",
        "2028-02-29",
        "2026-12-31",
      ]) {
        const date = makeIsoDate(day);
        for (const monthDay of ["01-01", "07-01", "10-01"])
          expect(daysToFiscalYear(date, monthDay)).toBe(
            legacyFiscal(date, monthDay),
          );
        for (const back of [-1, 0, 1, 12, 25])
          expect(previousMonthKey(day.slice(0, 7), back)).toBe(
            legacyMonth(day.slice(0, 7), back),
          );
        expect(nextPaydayDate(date)).toBe(pay.nextPaydayDate(date));
        for (const period of [
          "weekly",
          "biweekly",
          "semimonthly",
          "monthly",
        ] as const)
          for (const phase of [0, 1])
            expect(payPeriodEndingOn(period, date, phase)).toEqual(
              pay.payPeriodEndingOn(period, date, phase),
            );
        for (const startMinute of [0, 480, 1320])
          for (const minutes of [0, 480, 1440])
            for (const minuteOfDay of [0, 479, 480, 960, 1439])
              for (const workedDay of [day, addDays(date, -1), "never"]) {
                const schedule = {
                  shift: { startMinute, minutes },
                  worksOn: (d: string) => d === workedDay,
                } as unknown as Parameters<typeof legacyShift>[0];
                const moment = {
                  date,
                  minuteOfDay,
                  timeZone: "UTC",
                  utcOffsetMinutes: 0,
                };
                expect(onShiftAt(schedule, moment)).toBe(
                  legacyShift(schedule, moment),
                );
              }
      }
      for (const [minimumHours, maximumHours] of [
        [0, 0],
        [20, 30],
        [35, 45],
      ]) {
        const role = {
          timeDemand: { expectedWeekly: { minimumHours, maximumHours } },
        } as unknown as Parameters<typeof pay.weeklyHoursOf>[0];
        expect(weeklyHoursOf(role)).toBe(pay.weeklyHoursOf(role));
      }
    },
  );
});
