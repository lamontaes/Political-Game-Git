import { expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../life-places";
import { addDays } from "../dates";
import {
  allocateTownPayPeriods,
  openingPaydayPhase,
  payPeriodEndingOn,
} from "./town-pay";

it("allocates employer periods deterministically across all 56 places", () => {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  const shares = places.map(() => ({
    weekly: 0.25,
    biweekly: 0.25,
    semimonthly: 0.25,
    monthly: 0.25,
  }));

  const assigned = allocateTownPayPeriods(shares);
  expect(assigned).toEqual(allocateTownPayPeriods(shares));
  expect(assigned).toHaveLength(56);
  expect(assigned).toEqual([
    ...Array.from({ length: 14 }, () => "weekly"),
    ...Array.from({ length: 14 }, () => "biweekly"),
    ...Array.from({ length: 14 }, () => "semimonthly"),
    ...Array.from({ length: 14 }, () => "monthly"),
  ]);
});

it.each(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-07"])(
  "starts the biweekly Friday cycle within one week of opening on %s",
  (openedAt) => {
    const firstFriday = addDays(
      openedAt,
      (5 - new Date(`${openedAt}T00:00:00Z`).getUTCDay() + 7) % 7,
    );
    const phase = openingPaydayPhase(openedAt);
    expect(payPeriodEndingOn("biweekly", firstFriday, phase)).not.toBeNull();
    expect(
      (new Date(`${firstFriday}T00:00:00Z`).getTime() -
        new Date(`${openedAt}T00:00:00Z`).getTime()) /
        86_400_000,
    ).toBeLessThanOrEqual(6);
  },
);

it("gives each employer the cadence its own industry and size favor", () => {
  const mostlyMonthly = {
    weekly: 0.05,
    biweekly: 0.1,
    semimonthly: 0.05,
    monthly: 0.8,
  };
  const mostlyWeekly = {
    weekly: 0.7,
    biweekly: 0.2,
    semimonthly: 0.05,
    monthly: 0.05,
  };
  // Same two employers in either formation order get the same cadences.
  expect(allocateTownPayPeriods([mostlyMonthly, mostlyWeekly])).toEqual([
    "monthly",
    "weekly",
  ]);
  expect(allocateTownPayPeriods([mostlyWeekly, mostlyMonthly])).toEqual([
    "weekly",
    "monthly",
  ]);
});
