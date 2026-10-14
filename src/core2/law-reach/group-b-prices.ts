/**
 * Group B laws that set a price for the town's households and businesses,
 * carried out by the place-prices engine: a clean electricity standard makes
 * electricity dearer, a carbon price makes fuel dearer (paid to the treasury
 * of the government that passed it), a mileage fee replaces the fuel tax,
 * public broadband is a cheaper offer households take, a bottle deposit is
 * charged on containers and refunded on the ones returned, and fare-free
 * transit sets the fare to nothing. A repeal ends the place's rule.
 */
import goods from "../data/prices/goods.json" with { type: "json" };
import type { CoreAPI } from "../types";
import { lawChain } from "../modules/laws";
import {
  PLACE_PRICES_MODULE_ID,
  addPerUnitCharge,
  adjustPrice,
  endPlaceRule,
  offerHouseholdService,
  setPlacePrice,
  setPlaceTax,
  type Good,
} from "../modules/place-prices";
import { reachParameter } from "./group-b-people";
import { governmentAt, source } from "./group-b-money";

export type PriceMechanic =
  | "electricity-price"
  | "carbon-price"
  | "mileage-fee"
  | "public-broadband"
  | "container-deposit"
  | "transit-fares";

const RULES: Readonly<
  Record<
    PriceMechanic,
    { good: Good; kind: "share" | "price" | "per-unit" | "offer" }
  >
> = {
  "electricity-price": { good: "electricity", kind: "share" },
  "carbon-price": { good: "fuel", kind: "share" },
  "mileage-fee": { good: "vehicle-miles", kind: "per-unit" },
  "public-broadband": { good: "broadband", kind: "offer" },
  "container-deposit": { good: "beverage-container", kind: "per-unit" },
  "transit-fares": { good: "transit-fare", kind: "price" },
};

/** Put the law's price on the town (in force) or end it (repealed). */
export function placePrice(
  api: CoreAPI,
  mechanic: PriceMechanic,
  input: {
    readonly level: string;
    readonly lawId: string;
    readonly enacting: boolean;
    readonly terms: Readonly<Record<string, number>>;
  },
): void {
  if (!api.state.modules.has(PLACE_PRICES_MODULE_ID)) return;
  const placeId = lawChain(api).townPlaceId;
  const rule = RULES[mechanic];
  if (!input.enacting) {
    endPlaceRule(api, placeId, rule.good, rule.kind);
    return;
  }
  const treasury = governmentAt(api, input.level)?.organizationId;
  const cause = `law:${input.lawId}`;
  const src = source(api, `Law ${input.lawId}`);
  const t = input.terms;
  const cents = reachParameter("centsPerDollar");
  switch (mechanic) {
    case "electricity-price":
      adjustPrice(api, {
        placeId,
        good: "electricity",
        share: t.priceShare!,
        cause,
        source: src,
      });
      break;
    case "carbon-price":
      // A household's tons a year at the price, as a share of its fuel spending.
      adjustPrice(api, {
        placeId,
        good: "fuel",
        share:
          (t.dollarsPerTon! * t.householdTonsPerYear! * cents) /
          goods.goods.fuel.ceAnnualMinor,
        ...(treasury ? { payeeId: treasury } : {}),
        cause,
        source: src,
      });
      break;
    case "mileage-fee":
      if (treasury)
        setPlaceTax(api, {
          placeId,
          good: "vehicle-miles",
          centsPerUnit: t.centsPerMile!,
          payeeAccountId: treasury,
          replacesFuelTax: true,
          cause,
          source: src,
        });
      break;
    case "public-broadband":
      if (treasury)
        offerHouseholdService(api, {
          placeId,
          service: "broadband",
          providerId: treasury,
          monthlyMinor: t.monthlyDollars! * cents,
          cause,
          source: src,
        });
      break;
    case "container-deposit":
      addPerUnitCharge(api, {
        placeId,
        good: "beverage-container",
        centsPerUnit: t.depositCents!,
        refundable: true,
        cause,
        source: src,
      });
      break;
    case "transit-fares":
      setPlacePrice(api, {
        placeId,
        good: "transit-fare",
        priceMinor: t.fareMinor!,
        cause,
        source: src,
      });
      break;
  }
}
