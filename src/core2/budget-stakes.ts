/**
 * What a federal budget line sends each state, per resident, against the
 * national average (1 = average): a member of Congress weighs it when a bill
 * raises or cuts the line. Calibrated on USAspending and agency records
 * (data/research/federal/federal-spending-by-state-fy2024.json); each world's
 * stake is drawn around the published one (owner, Oct 27: realistic, not real).
 */
import { budgetWorldFactor } from "./modules/budgets";
import type { CoreAPI } from "./types";
import spending from "../../data/research/federal/federal-spending-by-state-fy2024.json" with { type: "json" };

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
