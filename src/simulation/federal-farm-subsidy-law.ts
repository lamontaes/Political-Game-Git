/** The farm law's annual per-recipient cap is adopted text, not a median historical cut. */
import { federalLawAmountAt } from "./federal-outlay-laws";
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
  const read = federalLawAmountAt(
    world,
    CUT_FARM_SUBSIDIES_QUESTION,
    "cap",
    onDate,
  );
  return {
    cutShare: read.law ? null : 0,
    capDollarsPerRecipient: read.law ? read.amount : null,
    lawMeasureId: read.law?.measureId ?? null,
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
