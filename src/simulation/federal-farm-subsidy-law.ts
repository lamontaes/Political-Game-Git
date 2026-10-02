/** The farm law's annual per-recipient cap is adopted text, not a median historical cut. */
import { recordedFarmCapAt } from "./federal-farm-payments";
import type { IsoDate, World } from "./types";
export const CUT_FARM_SUBSIDIES_QUESTION =
  "us-federal-positions:agriculture.cut-farm-subsidies";
export function farmPaymentsCutAt(
  world: World,
  onDate: IsoDate,
): {
  readonly cutShare: number | null;
  readonly capDollarsPerRecipient: number | null;
  readonly lawMeasureId: string | null;
} {
  const read = recordedFarmCapAt(world, onDate);
  const active = read.law?.answer === "yes" ? read.law : null;
  return {
    cutShare: active ? null : 0,
    capDollarsPerRecipient: active ? (read.term?.value ?? null) : null,
    lawMeasureId: active?.measureId ?? null,
  };
}
/** A per-recipient cap needs recorded recipients/payments before an aggregate cut exists. */
export function farmPaymentsCutPctOfLandValue(
  world: World,
  _placeKey: string,
  onDate: IsoDate,
): number | null {
  return farmPaymentsCutAt(world, onDate).cutShare;
}
