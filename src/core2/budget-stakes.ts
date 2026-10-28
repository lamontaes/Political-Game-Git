/**
 * What a federal budget line sends each state, per resident, against the
 * national average (1 = average): a member of Congress weighs it when a bill
 * raises or cuts the line. Read from USAspending and agency records
 * (data/research/federal/federal-spending-by-state-fy2024.json).
 */
import spending from "../../data/research/federal/federal-spending-by-state-fy2024.json" with { type: "json" };

const LINES = (
  spending as unknown as {
    lines: Record<string, { stake: Record<string, number> }>;
  }
).lines;

/** A state's stake in a federal budget line ("budget-line:<line>"); 1 where none is recorded. */
export function stateStake(stateKey: string, question: string): number {
  if (!question.startsWith("budget-line:")) return 1;
  return LINES[question.slice("budget-line:".length)]?.stake[stateKey] ?? 1;
}
