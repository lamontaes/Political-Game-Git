// STOPGAP(RULES3-GOV-002): see docs/plans/rules3/governing-stopgaps.json.
// Lifted unchanged from src/simulation/governing/budget-stakes.ts; RULES-3, 2026-10-11.
import type { DecisionConsideration, IsoDate } from "../../simulation/types";

export const DEADLINE_DAYS = { strong: 30, moderate: 90 } as const;

export function daysToFiscalYear(today: IsoDate, monthDay: string): number {
  const year = Number(today.slice(0, 4));
  const at = (y: number) => Date.parse(`${y}-${monthDay}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  const next = at(year) > now ? at(year) : at(year + 1);
  return Math.round((next - now) / 86_400_000);
}

export function budgetDeadlineConsideration(
  today: IsoDate,
  start: string | null,
): DecisionConsideration | null {
  if (!start) return null;
  const days = daysToFiscalYear(today, start);
  return {
    stableKey: "member:budget-deadline",
    optionKey: "vote-yea",
    sourceType: "context:budget-deadline",
    direction: "supports",
    importance:
      days <= DEADLINE_DAYS.strong
        ? "strong"
        : days <= DEADLINE_DAYS.moderate
          ? "moderate"
          : "slight",
    confidence: "high",
    explanation: `Without a budget in force when the new budget year begins in ${days} days, the government's offices close.`,
    sourceRefs: [],
  };
}
