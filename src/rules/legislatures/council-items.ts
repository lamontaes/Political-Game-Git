import type {
  CouncilMeetingAgendaItem,
  CouncilItemsPlayResult,
} from "../../simulation/living-world/local-council-meetings";
import type { MunicipalCompositionValue } from "../../simulation/municipal-government";
import type { LocalGoverningBodySeatKind } from "../../simulation/nationwide-world/local-governing-body-rules";
import type {
  Share,
  LocalRuleValue,
} from "../../simulation/nationwide-world/typical-council-size";
// stopgapId: "legislatures.pending-council-items"
export function playCouncilItems(
  items: readonly CouncilMeetingAgendaItem[],
): CouncilItemsPlayResult {
  return {
    pendingItems: items.filter((item) => item.reasons.length > 0),
    quietItems: items
      .filter((item) => item.reasons.length === 0)
      .map((item) => item.measure),
    playedMeasureIds: [],
  };
}
// stopgapId: "legislatures.unclassified-seat-district-fallback"
export function localGoverningBodySeatKindFromComposition(
  composition: MunicipalCompositionValue | null,
  seat: number,
): LocalGoverningBodySeatKind {
  if (!composition || !Number.isInteger(seat) || seat < 1) return "district";
  if (composition.pattern === "WARD") return "ward";
  if (composition.pattern === "AT_LARGE") return "at-large";
  if (composition.pattern === "SINGLE_MEMBER_DISTRICT") return "district";
  const count = (value: number | null): number =>
    value !== null && Number.isInteger(value) && value > 0 ? value : 0;
  const wards = count(composition.wardSeats);
  const districts = count(composition.districtSeats);
  const atLarge = count(composition.atLargeSeats);
  if (seat <= wards) return "ward";
  if (seat <= wards + districts) return "district";
  if (seat <= wards + districts + atLarge) return "at-large";
  return "district";
}
export function modalShare(table: readonly Share[]): LocalRuleValue | null {
  if (table.length === 0) return null;
  let best = table[0]!;
  for (const share of table) {
    if (
      share.percent > best.percent ||
      (share.percent === best.percent && share.value < best.value)
    )
      best = share;
  }
  return { value: best.value, basis: "typical" };
}
