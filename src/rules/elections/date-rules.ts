import { addDays, makeIsoDate, type IsoDate } from "./calendar";
export type ElectionDateRule =
  | {
      readonly kind: "nth-weekday";
      readonly month: number;
      readonly weekday: number;
      readonly nth: number;
      readonly offsetDays?: number;
    }
  | {
      readonly kind: "weekday-after";
      readonly month: number;
      readonly anchorWeekday: number;
      readonly anchorNth: number;
      readonly weekday: number;
      readonly ordinal?: number;
    }
  | {
      readonly kind: "days-before-general";
      readonly days: number;
    }
  | {
      readonly kind: "days-after-primary";
      readonly days: number;
    };

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  nth: number,
): IsoDate | null {
  if (nth > 0) {
    const first = weekdayOf(year, month, 1);
    const day = 1 + ((weekday - first + 7) % 7) + (nth - 1) * 7;
    return day <= daysInMonth(year, month)
      ? makeIsoDate(`${year}-${pad(month)}-${pad(day)}`)
      : null;
  }
  const last = daysInMonth(year, month);
  const lastWeekday = weekdayOf(year, month, last);
  const day = last - ((lastWeekday - weekday + 7) % 7) + (nth + 1) * 7;
  return day >= 1 ? makeIsoDate(`${year}-${pad(month)}-${pad(day)}`) : null;
}

export function dateFromElectionRule(
  rule: ElectionDateRule,
  year: number,
  anchors: {
    readonly generalDay?: IsoDate | null;
    readonly primaryDay?: IsoDate | null;
  } = {},
): IsoDate | null {
  switch (rule.kind) {
    case "nth-weekday": {
      const day = nthWeekday(year, rule.month, rule.weekday, rule.nth);
      return day && rule.offsetDays ? addDays(day, rule.offsetDays) : day;
    }
    case "weekday-after": {
      const anchor = nthWeekday(
        year,
        rule.month,
        rule.anchorWeekday,
        rule.anchorNth,
      );
      if (!anchor) return null;
      const anchorWeekday = rule.anchorWeekday;
      const gap = (rule.weekday - anchorWeekday + 7) % 7 || 7;
      return addDays(anchor, gap + ((rule.ordinal ?? 1) - 1) * 7);
    }
    case "days-before-general":
      return anchors.generalDay
        ? addDays(anchors.generalDay, -rule.days)
        : null;
    case "days-after-primary":
      return anchors.primaryDay ? addDays(anchors.primaryDay, rule.days) : null;
  }
}

function whole(value: unknown, min: number, max: number): boolean {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

export function isElectionDateRule(value: unknown): value is ElectionDateRule {
  if (typeof value !== "object" || value === null) return false;
  const rule = value as Record<string, unknown>;
  const keys = Object.keys(rule).sort().join(",");
  switch (rule.kind) {
    case "nth-weekday":
      return (
        (keys === "kind,month,nth,weekday" ||
          keys === "kind,month,nth,offsetDays,weekday") &&
        whole(rule.month, 1, 12) &&
        whole(rule.weekday, 0, 6) &&
        whole(rule.nth, -2, 5) &&
        rule.nth !== 0 &&
        (rule.offsetDays === undefined || whole(rule.offsetDays, -27, 27))
      );
    case "weekday-after":
      return (
        (keys === "anchorNth,anchorWeekday,kind,month,weekday" ||
          keys === "anchorNth,anchorWeekday,kind,month,ordinal,weekday") &&
        whole(rule.month, 1, 12) &&
        whole(rule.anchorWeekday, 0, 6) &&
        whole(rule.anchorNth, 1, 4) &&
        whole(rule.weekday, 0, 6) &&
        (rule.ordinal === undefined || whole(rule.ordinal, 1, 4))
      );
    case "days-before-general":
      return keys === "days,kind" && whole(rule.days, 1, 300);
    case "days-after-primary":
      return keys === "days,kind" && whole(rule.days, 1, 120);
    default:
      return false;
  }
}
