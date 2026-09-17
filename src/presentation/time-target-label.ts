import type { SimulationMoment } from "../simulation";
import { formatMinute } from "./player-calendar";
import { proseWeekdayDate } from "./prose-dates";

/**
 * How a time control says where it will land, before the player acts.
 *
 * The target comes from `previewTimeCommand` (or a recorded activity); this
 * module only words it. It never computes a destination of its own.
 */

/** "Tuesday, January 20, 2026, 7:00 PM" */
export function describeTimeTarget(moment: SimulationMoment): string {
  return `${proseWeekdayDate(moment.date)}, ${formatMinute(moment.minuteOfDay)}`;
}

/** "Skip to Tuesday, January 20, 2026, 7:00 PM" */
export function skipToLabel(moment: SimulationMoment): string {
  return `Skip to ${describeTimeTarget(moment)}`;
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/** A plain interval: "45 minutes", "3 hours 20 minutes", "2 days 4 hours". */
export function describeInterval(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  if (whole < 60) return plural(whole, "minute");
  const days = Math.floor(whole / 1440);
  const hours = Math.floor((whole % 1440) / 60);
  const rest = whole % 60;
  if (days > 0)
    return hours > 0
      ? `${plural(days, "day")} ${plural(hours, "hour")}`
      : plural(days, "day");
  return rest > 0
    ? `${plural(hours, "hour")} ${plural(rest, "minute")}`
    : plural(hours, "hour");
}

/** The line shown after a skip that did not reach its disclosed target. */
export function stoppedEarlyLabel(target: SimulationMoment): string {
  return `Stopped before ${describeTimeTarget(target)} for something protected that needs you.`;
}

/** What every skip promises before it runs. */
export const PROTECTED_STOP_NOTE =
  "Stops early for a protected commitment or anything that needs you.";
