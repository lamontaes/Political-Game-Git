import type { EntityId, IsoDate, World } from "../types";
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

export interface PublicEconomicConcern {
  readonly concernKey: string;
  readonly label: string;
  /** The public release event the concern rests on. */
  readonly releaseId: EntityId;
  readonly releasedOn: IsoDate;
  readonly indicator: MacroReleaseIndicator;
  readonly direction: "rising" | "falling" | "steady" | "unknown";
}

const CONCERN_LABELS: Readonly<Record<MacroReleaseIndicator, string>> = {
  "unemployment-rate": "Jobs and unemployment",
  "consumer-price-inflation-12m": "Rising prices",
  "real-output-growth-annualized-quarterly": "Economic growth",
};

/**
 * Authored reading band: a change smaller than this between two releases of
 * the same figure is reported as steady rather than as a movement.
 */
const STEADY_BAND_PP = 0.05;

/**
 * What the public has been told about the economy, as concerns a campaign
 * or office can cite. Only released figures count; the model's unreleased
 * state never appears. The jurisdiction's own releases come first when they
 * exist; today releases are national, so every place hears the national
 * figures. Newest first; empty before anything has been released.
 */
export function publicConcernsAt(
  world: World,
  jurisdictionId: EntityId,
  asOf: IsoDate,
): readonly PublicEconomicConcern[] {
  const local = macroScopeForJurisdiction(jurisdictionId);
  const released = macroReleasesAt(world, asOf).filter(
    (release) => release.value !== null,
  );
  const scopeFor = (indicator: MacroReleaseIndicator): MacroScopeKey =>
    released.some((r) => r.indicator === indicator && r.scope === local)
      ? local
      : "national";
  const concerns: PublicEconomicConcern[] = [];
  for (const indicator of Object.keys(
    CONCERN_LABELS,
  ) as MacroReleaseIndicator[]) {
    const scope = scopeFor(indicator);
    const series = released.filter(
      (release) => release.indicator === indicator && release.scope === scope,
    );
    const latest = series.at(-1);
    if (!latest) continue;
    const previous = series.at(-2);
    const change =
      previous && previous.value !== null
        ? latest.value! - previous.value
        : null;
    concerns.push({
      concernKey: `economy:${indicator}`,
      label: CONCERN_LABELS[indicator],
      releaseId: latest.eventId,
      releasedOn: latest.releasedAt,
      indicator,
      direction:
        change === null
          ? "unknown"
          : change > STEADY_BAND_PP
            ? "rising"
            : change < -STEADY_BAND_PP
              ? "falling"
              : "steady",
    });
  }
  return concerns.sort(
    (left, right) =>
      right.releasedOn.localeCompare(left.releasedOn) ||
      left.indicator.localeCompare(right.indicator),
  );
}
