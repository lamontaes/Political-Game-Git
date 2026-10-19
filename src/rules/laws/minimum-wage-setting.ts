export interface MinimumWageSettingFact {
  readonly hourlyMinor: number;
  readonly level: "federal" | "state" | "local";
  readonly measureId: string | null;
  readonly designation: string | null;
  readonly effectiveAt: string | null;
}

/** Select the higher state/federal floor, then a local floor only if it exceeds both. */
export function minimumWageSettingFromFacts(
  federal: MinimumWageSettingFact | null,
  state: MinimumWageSettingFact | null,
  local: MinimumWageSettingFact | null,
): MinimumWageSettingFact | null {
  if (federal === null || state === null) return null;
  const base = federal.hourlyMinor > state.hourlyMinor ? federal : state;
  return local !== null && local.hourlyMinor > base.hourlyMinor ? local : base;
}
