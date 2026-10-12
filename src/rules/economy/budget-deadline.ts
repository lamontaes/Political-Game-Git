/** Retained fiscal-source selection and deadline decision output; no legislative writer. */
import bases from "../../../data/research/money/public-budget-bases.json";
import budgets from "../../../data/research/money/government-budgets-2026.json";
import type {
  World,
  EntityId,
  IsoDate,
  DecisionConsideration,
} from "../../simulation/types";
export interface BudgetDeadlineFacts {
  readonly jurisdictions: World["jurisdictions"];
  readonly onDate: IsoDate;
  readonly federalId: EntityId;
  readonly stateKeys: ReadonlyMap<EntityId, string | null>;
  readonly placeKeys: ReadonlyMap<EntityId, string | null>;
}
const STATE_FISCAL_YEAR = Object.fromEntries(
  Object.entries(
    bases.places as Readonly<
      Record<
        string,
        {
          readonly fiscalYearStart?: string | null;
        }
      >
    >,
  ).flatMap(([key, row]) =>
    row.fiscalYearStart ? [[key, row.fiscalYearStart]] : [],
  ),
) as Readonly<Record<string, string>>;
const FEDERAL_FISCAL_YEAR = budgets.national.federal.fiscalYearStartsOn;
// stopgapId: "economy.budget-deadline-bands"
const DEADLINE_DAYS = { strong: 30, moderate: 90 } as const;
export function fiscalYearStartFor(
  facts: BudgetDeadlineFacts,
  jurisdictionId: EntityId,
): string | null {
  if (jurisdictionId === facts.federalId) return FEDERAL_FISCAL_YEAR;
  const jurisdiction = facts.jurisdictions[jurisdictionId];
  const stateKey =
    (jurisdiction ? facts.stateKeys.get(jurisdiction.id) : null) ??
    facts.placeKeys.get(jurisdictionId) ??
    null;
  return stateKey ? (STATE_FISCAL_YEAR[stateKey] ?? null) : null;
}
export function daysToFiscalYear(today: IsoDate, monthDay: string): number {
  const year = Number(today.slice(0, 4));
  const at = (y: number) => Date.parse(`${y}-${monthDay}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  const next = at(year) > now ? at(year) : at(year + 1);
  return Math.round((next - now) / 86400000);
}
export function budgetDeadlineConsideration(
  facts: BudgetDeadlineFacts,
  jurisdictionId: EntityId,
): DecisionConsideration | null {
  const start = fiscalYearStartFor(facts, jurisdictionId);
  if (!start) return null;
  const days = daysToFiscalYear(facts.onDate, start);
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
