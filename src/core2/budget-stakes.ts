/**
 * What a federal budget line sends each state, per resident, against the
 * national average (1 = average): a member of Congress weighs it when a bill
 * raises or cuts the line. Calibrated on USAspending and agency records
 * (data/research/federal/federal-spending-by-state-fy2024.json); each world's
 * stake is drawn around the published one (owner, Oct 27: realistic, not real).
 */
import {
  budgetsOf,
  budgetWorldFactor,
  governmentOfJurisdiction,
} from "./modules/budgets";
import type { CoreAPI } from "./types";
import spending from "../../data/research/federal/federal-spending-by-state-fy2024.json" with { type: "json" };
import revenueLines from "./data/legislature/revenue-lines.json" with { type: "json" };

const REVENUE = revenueLines as unknown as {
  questions: Record<string, { line: string; endsOn: number } | undefined>;
  series: Record<string, { line: string } | undefined>;
};

/** One change a bill makes to the law: an answer to a question, or a rate moved from one amount to another. */
export type RevenueChange =
  | { readonly question: string; readonly direction: number }
  | {
      readonly series: string;
      readonly from: number | null;
      readonly to: number;
    };

/** Whether any budget's revenue line rests on this question or series (a cheap test before the budget is read). */
export function carriesRevenue(key: string | undefined): boolean {
  return (
    key !== undefined &&
    (REVENUE.questions[key] !== undefined || REVENUE.series[key] !== undefined)
  );
}

/**
 * The share of a government's planned revenue, in its budget in force, that
 * one change to its own law gives up by ending a tax (0 to 1): the whole line
 * for an answer that ends it, or for a rate set to zero. A member weighing the
 * bill reads it as the hole the change leaves in the budget they must still
 * pass (legislature positionOfMember, the agenda's filingReason). Nothing for
 * a rate lowered but kept, a raise, a government with no such line in its
 * budget (a state with no income tax), or a law no revenue line rests on: a
 * member weighs a cut or a raise by their own view of it, and spending has no
 * counterpart weight, so only ending a tax outright is weighed by its hole.
 */
export function revenueGivenUp(
  api: CoreAPI,
  jurisdiction: string,
  change: RevenueChange,
): number {
  let line: string | undefined;
  let cut = 0;
  if ("question" in change) {
    const row = REVENUE.questions[change.question];
    if (row && Math.sign(change.direction) === row.endsOn) {
      line = row.line;
      cut = 1;
    }
  } else if (change.from !== null && change.from > 0 && change.to <= 0) {
    line = REVENUE.series[change.series]?.line;
    cut = 1;
  }
  if (!line || cut <= 0) return 0;
  const government = governmentOfJurisdiction(api, jurisdiction);
  if (!government) return 0;
  const budget = budgetsOf(api, government.id)
    .filter((b) => b.startsOn <= api.state.date)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
    .at(-1);
  if (!budget) return 0;
  const planned = Object.values(budget.revenueMinor).reduce((a, v) => a + v, 0);
  const carried = budget.revenueMinor[line] ?? 0;
  return planned > 0 && carried > 0 ? (carried / planned) * cut : 0;
}

const LINES = (
  spending as unknown as {
    lines: Record<string, { stake: Record<string, number> }>;
  }
).lines;

/** A state's stake in a federal budget line ("budget-line:<line>") at the published figures (calibration); 1 where none is recorded. */
export function publishedStateStake(
  stateKey: string,
  question: string,
): number {
  if (!question.startsWith("budget-line:")) return 1;
  return LINES[question.slice("budget-line:".length)]?.stake[stateKey] ?? 1;
}

/** This world's stake of a state in a federal budget line; 1 where none is recorded. */
export function stateStake(
  api: CoreAPI,
  stateKey: string,
  question: string,
): number {
  const published = publishedStateStake(stateKey, question);
  if (!question.startsWith("budget-line:") || published === 1) return published;
  return (
    published *
    budgetWorldFactor(
      api,
      `budget-world:stake:${stateKey}:${question}`,
      "budgetWorldStakeSpreadShare",
    )
  );
}
