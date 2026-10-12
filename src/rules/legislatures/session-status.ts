import type { IsoDate, LegislativeMeasureRecord } from "../../simulation/types";
import type { LegislativeRulePack } from "../../simulation/legislature-rules";
export const PAST_THE_CHAMBERS: ReadonlySet<string> = new Set([
  "awaiting-enrollment",
  "awaiting-presentation",
  "awaiting-executive",
  "awaiting-enactment",
]);

export function adjournmentStopsPhase(phase: string): boolean {
  return !PAST_THE_CHAMBERS.has(phase);
}
export function sessionStatus(
  onDate: IsoDate,
  closedOn: IsoDate | null,
  measure: LegislativeMeasureRecord,
  pack: LegislativeRulePack,
  phase: string,
): {
  readonly closed: boolean;
  readonly closedOn: IsoDate | null;
} {
  if (!adjournmentStopsPhase(phase)) {
    return { closed: false, closedOn: null };
  }

  return {
    closed: closedOn !== null && onDate > closedOn,
    closedOn,
  };
}
