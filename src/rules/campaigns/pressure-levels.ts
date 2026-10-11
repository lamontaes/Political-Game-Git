// KEEP arithmetic lifted from pressure/step.ts:102-113; no quarterly writer.
import type {
  PressureContribution,
  PressureKind,
} from "../../simulation/pressure/contract";
import { FADE_PER_QUARTER_ESTIMATE, round } from "./pressure-fade";
export function pressureLevel(
  before: number,
  contributions: readonly PressureContribution[],
  kind: PressureKind,
): number {
  return round(
    before * (1 - FADE_PER_QUARTER_ESTIMATE) +
      contributions
        .filter((entry) => entry.kind === kind)
        .reduce((sum, entry) => sum + entry.amount, 0),
  );
}
