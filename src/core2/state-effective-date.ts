/**
 * When a state act with no date of its own takes effect: each state's
 * researched default rule (`data/research/laws/local-starting-law/state-effective-dates.json`,
 * from constitutions and codes) through the lifted `stateStatuteOperativeAt`,
 * counting from the session's end where the rule does
 * (`data/research/laws/state-session-calendars.json`): the published
 * adjournment for the year, else the limit the place's law sets, else the
 * median last day of the places read that year, labeled as an estimate.
 */
import rules from "../../data/research/laws/local-starting-law/state-effective-dates.json" with { type: "json" };
import sessions from "../../data/research/laws/state-session-calendars.json" with { type: "json" };
import {
  knownSessionEnds,
  medianSessionEnd,
  stateStatuteOperativeAt,
  type SessionEndRow,
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
      Omit<SessionEndRow, "estimated"> & { estimated?: string }
    >;
  }
).sessionEnds;
const sessionEndRows = Object.values(sessionEnds).map((row): SessionEndRow => ({
  ...row,
  estimated: !!row.estimated,
}));

const SUPPORTED = new Set([
  "days-after-enactment",
  "next-date",
  "next-of-dates",
  "date-in-year-else-days",
  "days-after-session-end",
  "next-year-date-by-passage",
  "january-after-days",
  "first-of-month-after",
]);

/** The date an act enacted on `enactedAt` takes effect, and the rule's citation; null where the rule can't say. */
export function stateActEffectiveDate(
  stateKey: string,
  enactedAt: string,
): { readonly date: string; readonly cite: string } | null {
  const row = ruleByState[stateKey];
  const rule = row?.gameRule;
  if (!rule || !SUPPORTED.has(rule.kind)) return null;
  const end = sessionEnds[stateKey];
  let estimate: string | undefined;
  const date = stateStatuteOperativeAt(rule, enactedAt, {
    sessionEnds: (year) => {
      if (!end) return [];
      const known = knownSessionEnds(
        { ...end, estimated: !!end.estimated },
        year,
      );
      if (known) return known;
      estimate = end.estimated;
      return medianSessionEnd(sessionEndRows, year);
    },
    finalPassageAt: () => enactedAt,
  });
  const cite = row.cite ?? "state effective-date rule";
  return date
    ? {
        date,
        cite:
          rule.kind === "days-after-session-end" && estimate
            ? `${cite}; session end ${estimate}`
            : cite,
      }
    : null;
}
