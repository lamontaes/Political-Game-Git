/**
 * What a worker was paid by calendar quarter, gross before withholding, for the
 * programs that read a base period's wages (unemployment benefits take the
 * highest quarter of the last five completed ones). Written at each payday and
 * kept for the current quarter plus the last five completed ones, oldest
 * first; the oldest drops when a new quarter starts. A named worker has one
 * list; a counted group's list holds the pay of one worker of the group (its
 * pay over its head count), so one rule times its count.
 */
import type { IsoDate } from "./types";

/** Completed quarters kept besides the current one. */
export const COMPLETED_QUARTERS_KEPT = 5;

export interface QuarterPay {
  readonly quarter: string;
  readonly grossMinor: number;
}

/** "2025Q1" for a date in the first quarter of 2025. */
export function quarterOf(date: IsoDate): string {
  const month = Number(date.slice(5, 7));
  return `${date.slice(0, 4)}Q${Math.floor((month - 1) / 3) + 1}`;
}

/** A counted group's pay for one worker of it in a quarter. */
export interface CountedQuarterPay {
  readonly quarter: string;
  readonly perWorkerGrossMinor: number;
}

function add<T extends { readonly quarter: string }>(
  list: readonly T[] | undefined,
  date: IsoDate,
  make: (quarter: string, prior: T | undefined) => T,
): T[] {
  const quarter = quarterOf(date);
  const next = [...(list ?? [])];
  const last = next[next.length - 1];
  if (last?.quarter === quarter) next[next.length - 1] = make(quarter, last);
  else next.push(make(quarter, undefined));
  while (next.length > COMPLETED_QUARTERS_KEPT + 1) next.shift();
  return next;
}

/** The list with `grossMinor` added to its quarter, the oldest dropped past the kept quarters. */
export function withQuarterPay(
  list: readonly QuarterPay[] | undefined,
  date: IsoDate,
  grossMinor: number,
): QuarterPay[] {
  return add(list, date, (quarter, prior) => ({
    quarter,
    grossMinor: (prior?.grossMinor ?? 0) + grossMinor,
  }));
}

/** The same for one worker of a counted group. */
export function withCountedQuarterPay(
  list: readonly CountedQuarterPay[] | undefined,
  date: IsoDate,
  perWorkerGrossMinor: number,
): CountedQuarterPay[] {
  return add(list, date, (quarter, prior) => ({
    quarter,
    perWorkerGrossMinor:
      (prior?.perWorkerGrossMinor ?? 0) + perWorkerGrossMinor,
  }));
}
