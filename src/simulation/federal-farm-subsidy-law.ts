/**
 * A federal law that cuts farm subsidies, reaching farmland values.
 *
 * A yes from Congress to "should federal payments to farmers be cut?" cuts
 * each state's farm program payments by the median fall in U.S. government
 * payments to farms in the years they fell since 1996 (21%, ERS Farm Income
 * and Wealth Statistics, `farm-payments-and-land-values-2025.json`), from the
 * day the law takes effect. Payments are worth more than the year's check:
 * each $1 of payments per acre is worth $13 to $30 per acre of farmland value
 * (Goodwin, Mishra and Ortalo-Magne 2011, NBER w16693), so the value of a
 * state's farmland falls by that multiple of the payments cut, as a share of
 * what its farmland is worth. A state's payments are its 2021 to 2025 average
 * (ERS) over its farm real estate value (NASS 2024); a place neither
 * publishes uses the U.S. ratio, marked ESTIMATED FROM AVERAGE in the data. A
 * later law answering no restores the payments the day it takes effect.
 *
 * The outcome web reads the result as the cause
 * `federal.farm-payments-cut-pct-of-land-value` (`outcome-web/index.ts`).
 */
import farmData from "../../data/research/federal/farm-payments-and-land-values-2025.json" with { type: "json" };
import { lawInForce } from "./governing/law-in-force";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { IsoDate, World } from "./types";

export const CUT_FARM_SUBSIDIES_QUESTION =
  "us-federal-positions:agriculture.cut-farm-subsidies";

/** The share of payments a cut removes when its bill names no figure. */
export const FARM_PAYMENT_CUT_SHARE = farmData.typicalCut.share;

const PLACES = farmData.places as Readonly<
  Record<string, { readonly paymentsShareOfLandValue: number }>
>;

/** Whether a law in force cuts farm payments on `onDate`, and which law. */
export function farmPaymentsCutAt(
  world: World,
  onDate: IsoDate,
): { readonly cutShare: number; readonly lawMeasureId: string | null } {
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((definition) => definition.stableKey === CUT_FARM_SUBSIDIES_QUESTION);
  if (!proposition) return { cutShare: 0, lawMeasureId: null };
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    proposition.id,
    onDate,
    "enacted-only",
  );
  if (!law || law.origin !== "enacted" || law.answer !== "yes")
    return { cutShare: 0, lawMeasureId: null };
  return { cutShare: FARM_PAYMENT_CUT_SHARE, lawMeasureId: law.measureId };
}

/**
 * The payments cut, as a percent of the state's farm real estate value: 0
 * with no law; null for a place with no record.
 */
export function farmPaymentsCutPctOfLandValue(
  world: World,
  placeKey: string,
  onDate: IsoDate,
): number | null {
  const place = PLACES[placeKey];
  if (!place) return null;
  return (
    farmPaymentsCutAt(world, onDate).cutShare *
    place.paymentsShareOfLandValue *
    100
  );
}
