import type { EntityId, IsoDate } from "../../simulation/types";
export interface StartingMinimumFacts {
  readonly stateMinimums: Readonly<Record<string, number | null>>;
  readonly federalMinimum: number;
}
export interface HourlyMinimumFacts {
  readonly settings: ReadonlyMap<
    string,
    { readonly hourlyMinor: number } | null
  >;
}
export function startingStateMinimumHourly(
  facts: StartingMinimumFacts,
  stateKey: string | null,
): number | null {
  if (!stateKey || !(stateKey in facts.stateMinimums))
    return facts.federalMinimum;
  const state = facts.stateMinimums[stateKey];
  if (state === null || state === undefined) return null;
  return Math.max(facts.federalMinimum, state);
}

export function minimumHourlyAt(
  facts: HourlyMinimumFacts,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
): number | null {
  const setting = facts.settings.get(`${jurisdictionId}:${onDate}`) ?? null;
  return setting === null ? null : setting.hourlyMinor / 100;
}
