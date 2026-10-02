/** A defense law carries its own annual appropriation, not a historical growth ramp. */
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import {
  federalLawInForceAt,
  recordedFederalAnnualSpendingBefore,
} from "./federal-outlay-laws";
import type { IsoDate, World } from "./types";
export const GROW_DEFENSE_SPENDING_QUESTION =
  "us-federal-positions:defense.grow-defense-spending";

export function defenseBuildUpShare(
  world: World,
  onDate: IsoDate,
): {
  readonly share: number;
  readonly lawMeasureId: string | null;
  readonly unsupportedReason: string | null;
} {
  const law = federalLawInForceAt(
    world,
    GROW_DEFENSE_SPENDING_QUESTION,
    onDate,
  );
  if (!law) return { share: 0, lawMeasureId: null, unsupportedReason: null };
  // Read this consumer's exact canonical term, with starting/enacted parity.
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey: GROW_DEFENSE_SPENDING_QUESTION,
    termKey: "appropriation",
    unit: "dollars/year",
    onDate,
  });
  const base = recordedFederalAnnualSpendingBefore(world, 4, law.operativeAt);
  if (!term || !Number.isFinite(term.value) || term.value < 0 || base === null)
    return {
      share: 0,
      lawMeasureId: law.measureId,
      unsupportedReason:
        "annual-appropriation-or-recorded-defense-base-unavailable",
    };
  return {
    share: (term.value - base) / base,
    lawMeasureId: law.measureId,
    unsupportedReason: null,
  };
}

/** National appropriations do not establish a state's contracts or dollar GDP. */
export function defenseBoostPct(
  world: World,
  _placeKey: string,
  onDate: IsoDate,
): number | null {
  const read = defenseBuildUpShare(world, onDate);
  return read.unsupportedReason || read.share !== 0 ? null : 0;
}
