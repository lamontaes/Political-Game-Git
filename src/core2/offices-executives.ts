/**
 * The executive offices the offices engine seats, one row each
 * (src/core2/data/offices/executives.json): the level each sits at and
 * whether it heads that level's executive branch. Every reader that once
 * typed its own list of executive kinds asks these rows instead.
 */
import executiveRows from "./data/offices/executives.json" with { type: "json" };
import type { GovernmentLevel } from "./government-level";

export interface ExecutiveRow {
  /** The office kind, exactly. */
  readonly kind: string;
  readonly level: GovernmentLevel;
  /** The chief of the level's executive branch. */
  readonly heads: boolean;
  readonly source: string;
}

const ROWS = executiveRows.executives as readonly ExecutiveRow[];

/** An executive office's row, by its office kind; undefined for any other office. */
export function executiveRow(kind: string): ExecutiveRow | undefined {
  return ROWS.find((row) => row.kind === kind);
}

/** Whether an office kind heads its level's executive branch (a mayor, a county executive, a governor, a president). */
export function headsExecutive(kind: string): boolean {
  return executiveRow(kind)?.heads === true;
}

/** Whether an office kind heads a local government's executive branch: a mayor or a county executive. */
export function headsLocalExecutive(kind: string): boolean {
  const row = executiveRow(kind);
  return (
    row?.heads === true && (row.level === "city" || row.level === "county")
  );
}

/** Whether an office kind is one of the nation's own executive offices, which no state holds. */
export function nationalExecutive(kind: string): boolean {
  return executiveRow(kind)?.level === "federal";
}
