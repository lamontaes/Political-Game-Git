/**
 * When a state act with no date of its own takes effect: each state's
 * researched default rule (`data/research/laws/local-starting-law/state-effective-dates.json`,
 * from constitutions and codes) through the lifted `stateStatuteOperativeAt`,
 * counting from the session's recorded end where the rule does
 * (`data/research/laws/state-session-calendars-2026.json`).
 */
import rules from "../../data/research/laws/local-starting-law/state-effective-dates.json" with { type: "json" };
import sessions from "../../data/research/laws/state-session-calendars-2026.json" with { type: "json" };
import {
  stateStatuteOperativeAt,
  type StatuteEffectiveRule,
} from "../rules/laws/effective-date";

const ruleByState = (
  rules as unknown as {
    places: Record<
      string,
      { gameRule?: StatuteEffectiveRule & { kind: string }; cite?: string }
    >;
  }
).places;
const sessionEnds = (
  sessions as unknown as {
    sessionEnds: Record<
      string,
      { adjourned?: Record<string, { dates: string[] }> }
    >;
  }
).sessionEnds;

const SUPPORTED = new Set([
  "days-after-enactment",
  "next-date",
  "next-of-dates",
  "date-in-year-else-days",
  "days-after-session-end",
  "next-year-date-by-passage",
  "january-after-days",
]);

/** The date an act enacted on `enactedAt` takes effect, and the rule's citation; null where the rule can't say. */
export function stateActEffectiveDate(
  stateKey: string,
  enactedAt: string,
): { readonly date: string; readonly cite: string } | null {
  const row = ruleByState[stateKey];
  const rule = row?.gameRule;
  if (!rule || !SUPPORTED.has(rule.kind)) return null;
  const date = stateStatuteOperativeAt(rule, enactedAt, {
    sessionEnds: (year) =>
      sessionEnds[stateKey]?.adjourned?.[String(year)]?.dates ?? [],
    finalPassageAt: () => enactedAt,
  });
  return date ? { date, cite: row.cite ?? "state effective-date rule" } : null;
}
