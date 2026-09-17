import type { IsoDate, World } from "../types";
import { monthKeyOf } from "./store";
import type {
  MacroMonthRecord,
  MacroReleaseIndicator,
  MacroReleaseRecord,
  MacroScopeKey,
  MacroShockRecord,
  MacroStartingConditions,
} from "./types";

/**
 * Pure read selectors. None of them writes, draws or steps anything: a value
 * that was not recorded when its month closed does not exist here.
 */

export function macroScopeForJurisdiction(
  jurisdictionId: string,
): MacroScopeKey {
  return `jurisdiction:${jurisdictionId}`;
}

/** Latest recorded month for a scope as of a date, or null. */
export function macroConditionsAt(
  world: World,
  scope: MacroScopeKey,
  asOfDate: IsoDate,
): MacroMonthRecord | null {
  const months = world.macroEconomy?.months ?? [];
  for (let index = months.length - 1; index >= 0; index -= 1) {
    const record = months[index]!;
    if (record.scope === scope && record.recordedAt <= asOfDate) return record;
  }
  return null;
}

export function macroMonthHistory(
  world: World,
  scope: MacroScopeKey,
  asOfDate: IsoDate,
): readonly MacroMonthRecord[] {
  return (world.macroEconomy?.months ?? []).filter(
    (record) => record.scope === scope && record.recordedAt <= asOfDate,
  );
}

export function macroReleasesAt(
  world: World,
  asOfDate: IsoDate,
  indicator?: MacroReleaseIndicator,
): readonly MacroReleaseRecord[] {
  return (world.macroEconomy?.releases ?? []).filter(
    (release) =>
      release.releasedAt <= asOfDate &&
      (indicator === undefined || release.indicator === indicator),
  );
}

export function macroHistoryStart(
  world: World,
): MacroStartingConditions | null {
  return world.macroEconomy?.start ?? null;
}

export interface ActiveMacroShockView {
  readonly shock: MacroShockRecord;
  readonly endedAt: IsoDate | null;
}

/** Shocks recorded by a date whose disruption had not ended by then. */
export function publicMacroShocksAt(
  world: World,
  asOfDate: IsoDate,
): readonly ActiveMacroShockView[] {
  const store = world.macroEconomy;
  if (!store) return [];
  const ends = new Map(
    store.shockEnds
      .filter((end) => end.recordedAt <= asOfDate)
      .map((end) => [end.shockKey, end.endedAt]),
  );
  return store.shocks
    .filter(
      (shock) =>
        shock.observedState === "public" && shock.recordedAt <= asOfDate,
    )
    .map((shock) => ({ shock, endedAt: ends.get(shock.key) ?? null }));
}

/** Which recorded month a date falls in, for callers that label periods. */
export function macroMonthKey(date: IsoDate): string {
  return monthKeyOf(date);
}
