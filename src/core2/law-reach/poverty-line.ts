/**
 * The federal poverty guideline for a household, by place: the HHS figure for
 * one person and for each additional person, read from the research table
 * (`data/research/laws/poverty-guidelines-2026.json`). A place the table does
 * not list reads its default; no place is named here.
 */
import guidelines from "../../../data/research/laws/poverty-guidelines-2026.json" with { type: "json" };

interface Line {
  readonly oneDollars: number;
  readonly stepDollars: number;
}

const BY_STATE = guidelines.states as Readonly<Record<string, Line>>;

/** The poverty guideline, in dollars a year, for a household of this size in this state. */
export function povertyLineDollars(stateKey: string, size: number): number {
  const line = BY_STATE[stateKey] ?? guidelines.default;
  return line.oneDollars + line.stepDollars * (Math.max(1, size) - 1);
}
