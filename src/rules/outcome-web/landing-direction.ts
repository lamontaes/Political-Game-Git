export type OutcomeDirection = "higher-is-better" | "higher-is-worse";
export type LandingDirection = "gain" | "cost";

export function outcomeLandingDirectionFromFacts(
  previousFactor: number,
  currentFactor: number,
  outcomeDirection: OutcomeDirection,
): LandingDirection {
  // STOPGAP RULES4-OW-003: equal factors are a gain for higher-is-worse; retain legacy.
  const increased = currentFactor > previousFactor;
  const improved =
    outcomeDirection === "higher-is-better" ? increased : !increased;
  return improved ? "gain" : "cost";
}
