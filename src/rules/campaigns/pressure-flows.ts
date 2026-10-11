// STOPGAP(RULES3-CAM-005): see docs/plans/rules3/campaigns-stopgaps.json.
// Lifted unchanged from src/simulation/pressure/flows.ts; RULES-3, 2026-10-11.
import type {
  PressureReading,
  StateFlowRecord,
} from "../../simulation/pressure/contract";

export const BASE_OUTFLOW_PCT_PER_YEAR_ESTIMATE = 2;

export const MIN_PULL_ESTIMATE = 0.1;

export const FLOW_DESTINATIONS_KEPT = 5;

export function pullOf(reading: PressureReading | undefined): number {
  if (!reading) return 1;
  return Math.max(
    MIN_PULL_ESTIMATE,
    1 + reading.levels.arrive - reading.levels.leave,
  );
}

export function pushOf(reading: PressureReading | undefined): number {
  return 1 + (reading?.levels.leave ?? 0);
}

export function flowsForYear(
  stateKeys: readonly string[],
  readings: ReadonlyMap<string, PressureReading>,
  year: number,
  flowYear: number,
): readonly StateFlowRecord[] {
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return stateKeys.map((origin) => {
    const others = stateKeys.filter((other) => other !== origin);
    const total = others.reduce(
      (sum, other) => sum + pullOf(readings.get(other)),
      0,
    );
    const destinations = others
      .map((other) => ({
        stateKey: other,
        sharePct: total > 0 ? (pullOf(readings.get(other)) / total) * 100 : 0,
      }))
      .sort(
        (a, b) =>
          b.sharePct - a.sharePct || a.stateKey.localeCompare(b.stateKey),
      )
      .slice(0, FLOW_DESTINATIONS_KEPT)
      .map((entry) => ({ ...entry, sharePct: round(entry.sharePct) }));
    return {
      key: `${flowYear}:${origin}`,
      year,
      flowYear,
      fromStateKey: origin,
      outflowSharePct: round(
        BASE_OUTFLOW_PCT_PER_YEAR_ESTIMATE * pushOf(readings.get(origin)),
      ),
      destinations,
    };
  });
}
