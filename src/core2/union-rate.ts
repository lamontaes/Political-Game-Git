/**
 * A state's union membership rate (BLS, 2025) in one world: the published
 * rate is the center and the world's own draw moves it (owner, Oct 27:
 * realistic, not real). Read by a union local's dues and by the
 * right-to-work law's reach; only the rate is a statistic, what a law does to
 * it is law.
 */
import unionData from "./data/business/union-membership.json" with { type: "json" };
import { worldRate } from "./world-draw";

const UNION_RATES = (
  unionData as { states: Record<string, { membersPct: number }> }
).states;
const UNION_NATION_PCT = (unionData as { nationMembersPct: number })
  .nationMembersPct;
const PERCENT = 100;

/** The state's published union membership rate in percent (BLS, 2025), the nation's where BLS has no row: calibration for the world's draw and its checks. */
export function publishedUnionRatePct(housingState: string | undefined) {
  return UNION_RATES[housingState ?? ""]?.membersPct ?? UNION_NATION_PCT;
}

/** This world's union membership rate in percent: the published state rate moved by the world's own draw. */
export function worldUnionRatePct(
  seed: string,
  housingState: string | undefined,
): number {
  return (
    PERCENT *
    worldRate(
      publishedUnionRatePct(housingState) / PERCENT,
      seed,
      "business-world:union-rate",
      "businessWorldUnionRateSpreadShare",
    )
  );
}
