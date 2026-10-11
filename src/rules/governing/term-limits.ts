// STOPGAP(RULES3-GOV-001): see docs/plans/rules3/governing-stopgaps.json.
// Lifted unchanged from src/simulation/nationwide-world/executive-term-limits.ts; RULES-3, 2026-10-11.
import { addDays } from "./dates";
import type { TermLimitRule } from "../../simulation/enacted-rule-changes";
import type { EntityId, IsoDate } from "../../simulation/types";
import type { DatedTermInOffice } from "../../simulation/nationwide-world/prior-terms";

export const CONSECUTIVE_GAP_DAYS = 90;

export type ExecutiveTermLimitBasis = "sourced" | "enacted" | "not-researched";

export interface ExecutiveTermLimit {
  readonly stateUsps: string;
  readonly officeKey: string;
  /** Null means there is no limit. */
  readonly limit: TermLimitRule | null;
  readonly basis: ExecutiveTermLimitBasis;
  /** Internal record of where the limit came from. Never a player sentence. */
  readonly provenance: string;
  /** For an enacted limit: the law, and whether earlier service counts. */
  readonly enactment: {
    readonly measureId: EntityId;
    readonly designation: string;
    readonly operativeAt: IsoDate;
    readonly countsPriorService: boolean;
  } | null;
}

export function parseTermLimitCode(code: string): TermLimitRule | null {
  const consecutive = /^(\d+)_CONSECUTIVE(?:_TERMS)?$/.exec(code);
  if (consecutive)
    return {
      maxConsecutiveTerms: Number(consecutive[1]),
      maxLifetimeTerms: null,
      lookbackYears: null,
    };
  const lifetime = /^(\d+)_TERMS_LIFETIME$/.exec(code);
  if (lifetime)
    return {
      maxConsecutiveTerms: null,
      maxLifetimeTerms: Number(lifetime[1]),
      lookbackYears: null,
    };
  return null;
}

export interface ExecutiveTermLimitCheck {
  readonly limit: ExecutiveTermLimit;
  /** Terms in an unbroken run ending just before the term asked about. */
  readonly consecutiveTerms: number;
  /** Terms counted against a lifetime limit. */
  readonly lifetimeTerms: number;
  /** Null when the person may serve the term; otherwise the plain reason. */
  readonly barredReason: string | null;
}

export function consecutiveRunBefore(
  terms: readonly DatedTermInOffice[],
  termStartsAt: IsoDate,
): number {
  const earlier = terms
    .filter((term) => term.startsAt < termStartsAt)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  let run = 0;
  let nextStart = termStartsAt;
  for (let index = earlier.length - 1; index >= 0; index -= 1) {
    const term = earlier[index]!;
    // A term with no recorded end is treated as running to the next one.
    if (
      term.endsAt !== null &&
      addDays(term.endsAt, CONSECUTIVE_GAP_DAYS) < nextStart
    )
      break;
    run += 1;
    nextStart = term.startsAt;
  }
  return run;
}

export function plural(count: number, word: string): string {
  return `${count === 1 ? "one" : count === 2 ? "two" : count === 3 ? "three" : String(count)} ${word}${count === 1 ? "" : "s"}`;
}

export function checkExecutiveTermLimit(
  limit: ExecutiveTermLimit | null,
  all: readonly DatedTermInOffice[],
  input: { readonly termStartsAt: IsoDate },
): ExecutiveTermLimitCheck | null {
  if (!limit) return null;
  // A change that says terms already served do not count starts the count
  // afresh from the day it took effect.
  const counted =
    limit.enactment && !limit.enactment.countsPriorService
      ? all.filter((term) => term.startsAt >= limit.enactment!.operativeAt)
      : all;
  const lookbackFrom =
    limit.limit?.lookbackYears != null
      ? addDays(
          input.termStartsAt,
          -Math.round(limit.limit.lookbackYears * 365.25),
        )
      : null;
  const consecutiveTerms = consecutiveRunBefore(counted, input.termStartsAt);
  const lifetimeTerms = counted.filter(
    (term) =>
      term.startsAt < input.termStartsAt &&
      (lookbackFrom === null || term.startsAt >= lookbackFrom),
  ).length;
  const rule = limit.limit;
  let barredReason: string | null = null;
  if (
    rule?.maxConsecutiveTerms != null &&
    consecutiveTerms >= rule.maxConsecutiveTerms
  )
    barredReason = `This office allows ${plural(rule.maxConsecutiveTerms, "term")} in a row, and this character has served ${plural(consecutiveTerms, "consecutive term")}.${rule.maxLifetimeTerms == null ? " They may stand again after sitting out a term." : ""}`;
  else if (
    rule?.maxLifetimeTerms != null &&
    lifetimeTerms >= rule.maxLifetimeTerms
  )
    barredReason =
      rule.lookbackYears != null
        ? `This office allows ${plural(rule.maxLifetimeTerms, "term")} in any ${rule.lookbackYears} years, and this character has already served ${plural(lifetimeTerms, "term")} in that time.`
        : `This office allows ${plural(rule.maxLifetimeTerms, "term")} in a lifetime, and this character has already served ${plural(lifetimeTerms, "term")}.`;
  return { limit, consecutiveTerms, lifetimeTerms, barredReason };
}
