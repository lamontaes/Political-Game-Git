import data from "../../data/research/employer-pay-practices.json" with { type: "json" };
import { addDays, daysBetween, makeIsoDate } from "./dates";
import type { IsoDate } from "./types";

export interface EmployerPayPractice {
  readonly period: "weekly" | "biweekly" | "semimonthly" | "monthly";
  readonly firstPayday: IsoDate;
  readonly source: string;
  readonly estimatedFrom: string | null;
}

/** Missing employer calendars use a published modal practice, never a roll. */
export function estimatedEmployerPayPractice(
  classification: string,
  formedAt: IsoDate,
  staff?: number,
  publicEmployer = false,
): EmployerPayPractice {
  const shares: Readonly<Record<string, Readonly<Record<string, number>>>> =
    data.shares;
  const overall = shares["overall|all private establishments"]!;
  const industryOf: Readonly<Record<string, string>> = data.industryOf;
  const industry = shares[`industry|${industryOf[classification]}`] ?? overall;
  const sizeKey =
    staff === undefined
      ? null
      : (data.sizeGroups.find(([limit]) => staff < Number(limit))?.[1] ??
        data.largestSizeGroup);
  const size =
    sizeKey === null ? overall : shares[`establishment-size|${sizeKey}`]!;
  const modes = Object.keys(overall)
    .map((key) => ({
      key,
      weight:
        overall[key]! > 0 ? (industry[key]! * size[key]!) / overall[key]! : 0,
    }))
    .sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key));
  const periods: Readonly<Record<string, string>> = data.periodOfBls;
  const selected =
    publicEmployer || data.governmentClassifications.includes(classification)
      ? data.publicPeriod
      : periods[modes[0]!.key]!;
  if (
    selected !== "weekly" &&
    selected !== "biweekly" &&
    selected !== "semimonthly" &&
    selected !== "monthly"
  )
    throw new Error("The payroll source contains an unsupported period.");
  const weekday = new Date(`${formedAt}T00:00:00Z`).getUTCDay();
  return {
    period: selected,
    firstPayday: addDays(formedAt, (data.paydayWeekday - weekday + 7) % 7),
    source: data.source,
    estimatedFrom: data.estimatedFrom,
  };
}

/** The employer's first recorded Friday anchors its alternating payroll weeks. */
export function employerBiweeklyPhase(practice: EmployerPayPractice): number {
  const weeks = Math.floor(
    daysBetween(makeIsoDate(data.calendarEpoch), practice.firstPayday) / 7,
  );
  return ((weeks % 2) + 2) % 2;
}
