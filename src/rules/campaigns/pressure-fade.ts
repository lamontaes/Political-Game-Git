// STOPGAP(RULES3-CAM-008): see docs/plans/rules3/campaigns-stopgaps.json.
// Lifted unchanged from src/simulation/pressure/step.ts; RULES-3, 2026-10-11.
import type {
  PressureReading,
  StateFlowRecord,
} from "../../simulation/pressure/contract";

export const FADE_PER_QUARTER_ESTIMATE = 0.25;

export function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function largestPushedFlow(
  readings: readonly PressureReading[],
  flows: readonly StateFlowRecord[],
): { reading: PressureReading; flow: StateFlowRecord } | null {
  const pushed = readings
    .filter((reading) => reading.levels.leave > 0)
    .sort(
      (a, b) =>
        b.levels.leave - a.levels.leave || a.stateKey.localeCompare(b.stateKey),
    )[0];
  if (!pushed) return null;
  const flow = flows.find((row) => row.fromStateKey === pushed.stateKey);
  return flow ? { reading: pushed, flow } : null;
}
