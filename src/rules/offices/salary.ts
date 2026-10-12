import { OFFICES_PARAMETERS } from "./parameters";
// STOPGAP offices.salary-calendar: Salary uses 52 weeks and tenure uses 365.25 days per year.
// stopgapId: "offices.salary-calendar"
import { addDays, daysBetween, type IsoDate } from "./calendar";
export function weeklyMinor(annualMinor: number): number {
  return Math.round(annualMinor / OFFICES_PARAMETERS.salaryWeeksPerYear.value);
}
export function annualPay(facts: {
  readonly inForce: {
    readonly annualDollars: number;
    readonly law: unknown;
  } | null;
  readonly recordedAnnualMinor: number | null;
  readonly hasLocation: boolean;
  readonly hourlyMinor: number | null;
  readonly weeklyHours: number;
}): { readonly annualMinor: number } | null {
  if (facts.inForce?.law)
    return { annualMinor: facts.inForce.annualDollars * 100 };
  if (!facts.inForce) {
    if (facts.recordedAnnualMinor !== null)
      return { annualMinor: facts.recordedAnnualMinor };
    if (
      !facts.hasLocation ||
      facts.hourlyMinor === null ||
      facts.weeklyHours <= 0
    )
      return null;
    return {
      annualMinor: Math.round(
        facts.hourlyMinor *
          facts.weeklyHours *
          OFFICES_PARAMETERS.salaryWeeksPerYear.value,
      ),
    };
  }
  return { annualMinor: facts.inForce.annualDollars * 100 };
}
export function officePayTenure(startedAt: IsoDate, onDate: IsoDate): number {
  return Math.max(
    0,
    daysBetween(startedAt, onDate) /
      OFFICES_PARAMETERS.salaryDaysPerServiceYear.value,
  );
}
export function dueOfficePeriods(input: {
  readonly startsAt: IsoDate;
  readonly currentDate: IsoDate;
  readonly lastPeriod: IsoDate | undefined;
  readonly activeOnDayBefore: ReadonlySet<IsoDate>;
  readonly paidOnStart: ReadonlySet<IsoDate>;
}): readonly {
  readonly periodStartsAt: IsoDate;
  readonly periodEndsAt: IsoDate;
  readonly onDate: IsoDate;
}[] {
  const paidWeeks =
    input.lastPeriod === undefined
      ? 0
      : Math.max(0, daysBetween(input.startsAt, input.lastPeriod) / 7 + 1);
  const weeksDue = Math.floor(
    daysBetween(input.startsAt, input.currentDate) / 7,
  );
  const periods = [];
  for (let week = paidWeeks + 1; week <= weeksDue; week += 1) {
    const periodStartsAt = addDays(input.startsAt, (week - 1) * 7);
    const dueOn = addDays(input.startsAt, week * 7);
    if (!input.activeOnDayBefore.has(addDays(dueOn, -1))) break;
    if (!input.paidOnStart.has(periodStartsAt)) continue;
    periods.push({
      periodStartsAt,
      periodEndsAt: addDays(dueOn, -1),
      onDate: dueOn,
    });
  }
  return periods;
}
