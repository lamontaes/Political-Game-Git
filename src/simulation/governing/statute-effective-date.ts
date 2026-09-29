import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { addDays, isoDateFromParts, yearOf } from "../dates";
import type { IsoDate } from "../types";

/**
 * When a state statute takes effect if the act names no date of its own, by
 * the state's own rule (`effectiveDates` in the starting-law file, read from
 * each state's constitution or code). A state the file leaves out has no
 * researched rule: the caller keeps its blanket default and says so.
 *
 * NOT MODELED: acts that set their own date, emergency clauses, appropriation
 * acts where a state dates them differently (Minnesota, Missouri, Ohio), and
 * special sessions (Missouri counts from the regular session's end).
 */
export type StatuteEffectiveRule =
  | { readonly kind: "days-after-enactment"; readonly days: number }
  | { readonly kind: "next-date"; readonly month: number; readonly day: number }
  | {
      readonly kind: "days-after-session-end";
      readonly days: number;
      readonly sessionEnds: { readonly month: number; readonly day: number };
    };

const RULES: Readonly<Record<string, { readonly rule: StatuteEffectiveRule }>> =
  (
    startingLaw as unknown as {
      readonly effectiveDates?: {
        readonly rules: Readonly<
          Record<string, { readonly rule: StatuteEffectiveRule }>
        >;
      };
    }
  ).effectiveDates?.rules ?? {};

/** The researched rule for a state (`US-XX`), or null where none is read. */
export function statuteEffectiveRule(
  jurisdictionKey: string,
): StatuteEffectiveRule | null {
  return Object.hasOwn(RULES, jurisdictionKey)
    ? RULES[jurisdictionKey]!.rule
    : null;
}

/**
 * The date a state statute enacted on `enactedAt` takes effect under its
 * state's rule, or null where the state's rule is not researched. Never
 * earlier than the enactment itself.
 */
export function stateStatuteOperativeAt(
  jurisdictionKey: string,
  enactedAt: IsoDate,
): IsoDate | null {
  const rule = statuteEffectiveRule(jurisdictionKey);
  if (!rule) return null;
  const year = yearOf(enactedAt);
  switch (rule.kind) {
    case "days-after-enactment":
      return addDays(enactedAt, rule.days);
    case "next-date": {
      // The first such date after the act: "the first day of June next".
      const thisYear = isoDateFromParts(year, rule.month, rule.day);
      return thisYear > enactedAt
        ? thisYear
        : isoDateFromParts(year + 1, rule.month, rule.day);
    }
    case "days-after-session-end": {
      // The regular session of the act's year; an act signed after the
      // session ends counts from that same adjournment.
      const operative = addDays(
        isoDateFromParts(year, rule.sessionEnds.month, rule.sessionEnds.day),
        rule.days,
      );
      return operative > enactedAt ? operative : enactedAt;
    }
  }
}
