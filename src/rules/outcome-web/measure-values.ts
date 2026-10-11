/** Minimum-wage state lookup and federal hierarchy are supplied by the legal reader. */
export function stateMinimumHourlyFromFacts(
  validPlaceKey: boolean,
  setting: {
    readonly hourlyMinor: number;
    readonly beforeMinor: number | null;
  } | null,
  federalMinimumHourly: number,
): { readonly now: number; readonly before: number | null } | null {
  if (!validPlaceKey || setting === null) return null;
  return {
    now: Math.max(federalMinimumHourly, setting.hourlyMinor / 100),
    before:
      setting.beforeMinor === null
        ? null
        : Math.max(federalMinimumHourly, setting.beforeMinor / 100),
  };
}
