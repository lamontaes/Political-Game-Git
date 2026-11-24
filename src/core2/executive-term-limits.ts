/**
 * A state executive's term limit, read from the research on each state's
 * constitution (`data/research/offices/state-offices.json`): none, a limit on
 * consecutive terms, or a limit over a lifetime. A governor or other
 * statewide officer who has served that many terms may not stand again.
 * Whether service "consecutive" resets after a gap is not modeled: a person
 * who held the office before and left counts every term they held, which
 * overstates the limit only for a returning officeholder.
 */
import stateOfficeResearch from "../../data/research/offices/state-offices.json" with { type: "json" };

export interface ExecutiveTermLimit {
  readonly kind: "none" | "consecutive" | "lifetime";
  readonly terms: number;
}

interface ResearchExecutive {
  readonly key: string;
  readonly termLimit?: { readonly kind?: string; readonly terms?: number };
}

const places = (
  stateOfficeResearch as unknown as {
    places: Record<
      string,
      { readonly executives?: readonly ResearchExecutive[] }
    >;
  }
).places;

/** The limit on one statewide office, or none where the research reads none. */
export function executiveTermLimit(
  stateKey: string,
  officeKind: string,
): ExecutiveTermLimit {
  const limit = places[stateKey]?.executives?.find(
    (row) => row.key === officeKind,
  )?.termLimit;
  if (
    (limit?.kind === "consecutive" || limit?.kind === "lifetime") &&
    typeof limit.terms === "number"
  )
    return { kind: limit.kind, terms: limit.terms };
  return { kind: "none", terms: 0 };
}

/** Whether an officeholder who has served this many terms may not stand again. */
export function termLimitReachedBy(
  limit: ExecutiveTermLimit,
  termsServed: number,
): boolean {
  return limit.kind !== "none" && termsServed >= limit.terms;
}
