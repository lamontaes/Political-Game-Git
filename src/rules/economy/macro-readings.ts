import type { IsoDate } from "../../simulation/types";
import type {
  MacroMonthRecord,
  MacroReleaseIndicator,
  MacroReleaseRecord,
  MacroScopeKey,
} from "../../simulation/macro-economy/types";
export interface MacroHistoryFacts {
  readonly months: readonly MacroMonthRecord[];
  readonly releases: readonly MacroReleaseRecord[];
}
export function macroConditionsAt(
  facts: MacroHistoryFacts,
  scope: MacroScopeKey,
  asOfDate: IsoDate,
): MacroMonthRecord | null {
  const months = facts.months ?? [];
  for (let index = months.length - 1; index >= 0; index -= 1) {
    const record = months[index]!;
    if (record.scope === scope && record.recordedAt <= asOfDate) return record;
  }
  return null;
}

export function macroMonthHistory(
  facts: MacroHistoryFacts,
  scope: MacroScopeKey,
  asOfDate: IsoDate,
): readonly MacroMonthRecord[] {
  return (facts.months ?? []).filter(
    (record) => record.scope === scope && record.recordedAt <= asOfDate,
  );
}

export function macroReleasesAt(
  facts: MacroHistoryFacts,
  asOfDate: IsoDate,
  indicator?: MacroReleaseIndicator,
): readonly MacroReleaseRecord[] {
  return (facts.releases ?? []).filter(
    (release) =>
      release.releasedAt <= asOfDate &&
      (indicator === undefined || release.indicator === indicator),
  );
}
