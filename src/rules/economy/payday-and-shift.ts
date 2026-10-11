import { makeIsoDate, addDays, daysBetween, type IsoDate } from "./calendar";
import type { SimulationMoment, WorkRoleRecord } from "../../simulation/types";
import type { TownPayPeriod } from "../../simulation/living-world/town-pay";
import type { WorkSchedule } from "../../simulation/living-world/work-schedules";
function weekday(date: IsoDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function lastDayOfMonth(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return makeIsoDate(
    `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  );
}

// stopgapId: "economy.common-payday-calendar"
export function payPeriodEndingOn(
  period: TownPayPeriod,
  date: IsoDate,
  phase: number,
): {
  readonly startsAt: IsoDate;
  readonly endsAt: IsoDate;
} | null {
  if (period === "weekly" || period === "biweekly") {
    if (weekday(date) !== 5) return null;
    if (period === "biweekly") {
      const weeks = Math.floor(
        daysBetween(makeIsoDate("2000-01-07"), date) / 7,
      );
      if ((weeks + phase) % 2 !== 0) return null;
    }
    return {
      startsAt: addDays(date, period === "weekly" ? -6 : -13),
      endsAt: date,
    };
  }
  const last = lastDayOfMonth(date);
  const day = Number(date.slice(8, 10));
  if (period === "semimonthly" && day === 15)
    return { startsAt: makeIsoDate(`${date.slice(0, 8)}01`), endsAt: date };
  if (date !== last) return null;
  return {
    startsAt:
      period === "semimonthly"
        ? makeIsoDate(`${date.slice(0, 8)}16`)
        : makeIsoDate(`${date.slice(0, 8)}01`),
    endsAt: date,
  };
}

export function nextPaydayDate(date: IsoDate): IsoDate {
  for (let n = 1; n <= 7; n += 1) {
    const next = addDays(date, n);
    if (
      weekday(next) === 5 ||
      next.slice(8, 10) === "15" ||
      next === lastDayOfMonth(next)
    )
      return next;
  }
  throw new Error("No payday within a week.");
}

export function weeklyHoursOf(role: WorkRoleRecord): number {
  const { minimumHours, maximumHours } = role.timeDemand.expectedWeekly;
  return (minimumHours + maximumHours) / 2;
}
function previousDate(date: IsoDate): IsoDate {
  const at = new Date(`${date}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() - 1);
  return makeIsoDate(at.toISOString().slice(0, 10));
}

export function onShiftAt(
  schedule: WorkSchedule,
  moment: SimulationMoment,
): boolean {
  const { startMinute, minutes } = schedule.shift;
  const today = moment.date;
  if (
    schedule.worksOn(today) &&
    moment.minuteOfDay >= startMinute &&
    moment.minuteOfDay < startMinute + minutes
  )
    return true;
  const overflow = startMinute + minutes - 24 * 60;
  return (
    overflow > 0 &&
    moment.minuteOfDay < overflow &&
    schedule.worksOn(previousDate(today))
  );
}
