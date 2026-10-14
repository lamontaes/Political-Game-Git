/**
 * What a law does to the economy, for the policies whose effect runs through
 * OPUS-WORLD's engines: zoning, set-aside units, gas hookups and farmland
 * move what builders build; rent stabilization caps renewals; right to
 * counsel changes how eviction cases end; a property tax cap holds
 * assessments; transit fares, a mileage fee, public broadband, an
 * electricity standard, a carbon price and a bottle deposit change what
 * households pay; a clean air plan and a groundwater limit bind businesses.
 * Each handler is registered with OPUS-GOV's `registerPolicyHandler` and runs
 * whenever the law in force on its key may have changed. The magnitudes are
 * OPUS-GOV's law-reach parameters.
 */
import { setConsumerRateCap } from "./modules/credit";
import { setCannabisLegal } from "./business-cannabis";
import { setRightToWork } from "./jobs-unions";
import reachA from "./data/laws/reach-group-a-parameters.json" with { type: "json" };
import reachB from "./data/laws/reach-group-b-parameters.json" with { type: "json" };
import { countyNonattainment } from "./business-operating-rules";
import { openingZoning } from "./housing-construction";
import {
  addBusinessComplianceCost,
  setBusinessOperatingLimit,
} from "./modules/business";
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { baseLine, budgetToday } from "./law-reach/group-a-money";
import {
  setHousingZoning,
  setRentHelp,
  setRentIncreaseCap,
  setRightToCounsel,
  HOUSING_MODULE_ID,
} from "./modules/housing";
import {
  inForceHere,
  registerPolicyHandler,
  type PolicyHandler,
} from "./law-reach/host";
import {
  addPerUnitCharge,
  adjustPrice,
  endPlaceRule,
  offerHouseholdService,
  PLACE_PRICES_MODULE_ID,
  setPlacePrice,
  setPlaceTax,
  setRoadCondition,
} from "./modules/place-prices";
import { setPropertyTaxCap } from "./housing-property-tax";
import type { CoreAPI, CoreState, Source } from "./types";

const POLICY = "us-policy-positions:";
type Reach = { parameters: Record<string, { value: number }> };
const gov = (key: string): number => {
  const row =
    (reachA as unknown as Reach).parameters[key] ??
    (reachB as unknown as Reach).parameters[key];
  if (!row) throw new Error(`No law-reach parameter: ${key}`);
  return row.value;
};

const has = (api: CoreAPI, moduleId: string) =>
  (api.state as CoreState).modules.has(moduleId);

function source(api: CoreAPI, lawId: string, what: string): Source {
  return {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation: `The law in force (${lawId || "a law"}) and OPUS-GOV's law-reach parameters (src/core2/data/laws/reach-group-*-parameters.json).`,
    estimatedFrom: what,
  };
}

/** The treasury of the government at the level that enacted the law, else the town's, county's or state's. */
function treasury(api: CoreAPI, level: string): string | undefined {
  if (!has(api, BUDGETS_MODULE_ID)) return undefined;
  const rows = governments(api);
  return (
    rows.find((row) => row.level === level) ??
    rows.find((row) => row.level === "city") ??
    rows.find((row) => row.level === "county") ??
    rows.find((row) => row.level === "state")
  )?.organizationId;
}

const zoning =
  (
    change: (on: boolean) => Parameters<typeof setHousingZoning>[2],
  ): PolicyHandler =>
  (api, law) => {
    if (has(api, HOUSING_MODULE_ID))
      setHousingZoning(api, law.placeId, change(law.inForce));
  };

const prices =
  (
    good: string,
    kind: string,
    apply: (api: CoreAPI, law: Parameters<PolicyHandler>[1]) => void,
  ): PolicyHandler =>
  (api, law) => {
    if (!has(api, PLACE_PRICES_MODULE_ID)) return;
    if (law.inForce) apply(api, law);
    else endPlaceRule(api, law.placeId, good as never, kind as never);
  };

/** What a carbon price adds to electricity and fuel, as a share of their price (EIA and EPA intensities in the prices parameters). */
function carbonShare(api: CoreAPI, good: "electricity" | "fuel"): number {
  const dollarsPerTon = gov("carbonPricePerTonDollars");
  return good === "fuel"
    ? (dollarsPerTon * api.parameter("pricesGasolineTonsCo2PerGallon")) /
        api.parameter("pricesGasolineDollarsPerGallon")
    : (dollarsPerTon * api.parameter("pricesElectricityTonsCo2PerMwh")) /
        api.parameter("pricesElectricityDollarsPerMwh");
}

const CLEAN_POWER = `${POLICY}environment-energy.clean-electricity-standard`,
  CARBON = `${POLICY}environment-energy.price-carbon`;

/** Electricity and fuel prices from both energy laws in force: an electricity standard's cost and a carbon price add up. */
const energy: PolicyHandler = (api, law) => {
  if (!has(api, PLACE_PRICES_MODULE_ID)) return;
  const clean = inForceHere(api, CLEAN_POWER),
    carbon = inForceHere(api, CARBON);
  const shares = {
    electricity:
      (clean ? gov("cleanElectricityPriceShare") : 0) +
      (carbon ? carbonShare(api, "electricity") : 0),
    fuel: carbon ? carbonShare(api, "fuel") : 0,
  };
  const payeeId = carbon ? treasury(api, law.level) : undefined;
  for (const good of ["electricity", "fuel"] as const)
    if (shares[good] > 0)
      adjustPrice(api, {
        placeId: law.placeId,
        good,
        share: shares[good],
        // A carbon price's revenue goes to the government that levies it.
        ...(payeeId ? { payeeId } : {}),
        cause: law.lawId,
        source: source(
          api,
          law.lawId,
          `The price of ${good} with ${[
            clean && good === "electricity"
              ? "a clean electricity standard's cost"
              : "",
            carbon
              ? `a carbon price of $${gov("carbonPricePerTonDollars")} a ton`
              : "",
          ]
            .filter(Boolean)
            .join(" and ")}.`,
        ),
      });
    else endPlaceRule(api, law.placeId, good, "share");
};

/** The share of roads in poor condition with the highway budget against its base: less money, worse roads, on a sliding scale. */
const roads: PolicyHandler = (api, law) => {
  if (!has(api, PLACE_PRICES_MODULE_ID) || !has(api, BUDGETS_MODULE_ID)) return;
  const gov = governments(api).find((row) => row.level === law.level);
  const budget = gov ? budgetToday(api, gov) : null;
  if (!gov || !budget) return;
  const base = baseLine(api, gov, budget, "highways");
  const now = budget.spendingMinor.highways ?? 0;
  if (!(base > 0)) return;
  if (now === base) {
    endPlaceRule(api, law.placeId, "vehicle-repair", "road");
    return;
  }
  setRoadCondition(api, {
    placeId: law.placeId,
    poorShare: Math.min(
      1,
      api.parameter("pricesRoadPoorShareBase") *
        (base / Math.max(1, now)) **
          api.parameter("pricesRoadSpendingElasticity"),
    ),
    cause: law.lawId,
    source: source(
      api,
      law.lawId,
      `The ${law.level} highway budget at ${(now / base).toFixed(3)} of its base.`,
    ),
  });
};

/**
 * Housing spending above its base pays rent help: as many households as the
 * extra money covers at the program's yearly amount, those with the least cash
 * per member first (OPUS-GOV's rule for who it reaches), the renters among
 * them paid each month.
 */
const rentHelp: PolicyHandler = (api, law) => {
  if (!has(api, HOUSING_MODULE_ID) || !has(api, BUDGETS_MODULE_ID)) return;
  const c = api.state as CoreState;
  const government = governments(api).find((row) => row.level === law.level);
  const budget = government ? budgetToday(api, government) : null;
  if (!government || !budget) return;
  const annual = gov("housingAssistanceAnnualMinor");
  const extra =
    (budget.spendingMinor.housing ?? 0) -
    baseLine(api, government, budget, "housing");
  const slots = Math.max(0, Math.floor(extra / annual));
  const byHousehold = new Map<string, { cash: number; members: number }>();
  for (const person of c.people.values()) {
    if (!person.alive || person.placeId !== law.placeId) continue;
    const row = byHousehold.get(person.householdId) ?? { cash: 0, members: 0 };
    row.cash += person.liquidMinor;
    row.members += 1;
    byHousehold.set(person.householdId, row);
  }
  const chosen = [...byHousehold]
    .sort(
      ([a, x], [b, y]) =>
        x.cash / x.members - y.cash / y.members || a.localeCompare(b),
    )
    .slice(0, slots)
    .map(([id]) => id)
    .filter((id) => {
      const lease = c.finance.contracts.get(`lease:${id}`);
      return lease !== undefined && !lease.endedAt;
    });
  setRentHelp(api, {
    governmentKey: government.id,
    payerId: government.organizationId,
    households: chosen,
    monthlyLimitMinor: Math.round(annual / api.parameter("macroMonthsPerYear")),
  });
};

const HANDLERS: Readonly<Record<string, PolicyHandler>> = {
  "budget-line:highways": roads,
  "budget-line:housing": rentHelp,
  [`${POLICY}housing-land-use.allow-multifamily-in-single-family-zones`]:
    zoning((on) => ({
      multifamilyLandShare: on ? 1 : openingZoning().multifamilyLandShare,
    })),
  [`${POLICY}housing-land-use.inclusionary-requirement`]: zoning((on) => ({
    inclusionaryShare: on ? gov("inclusionaryAffordableShare") : 0,
  })),
  [`${POLICY}environment-energy.ban-new-gas-hookups`]: zoning((on) => ({
    allElectric: on,
  })),
  [`${POLICY}agriculture-natural-resources.protect-farmland-from-development`]:
    zoning((on) => ({ farmlandProtected: on })),
  // Adult-use cannabis: the place's retailers may apply for a license (business-cannabis.ts).
  [`${POLICY}business-commerce.legalize-cannabis-sales`]: (api, law) => {
    if (has(api, "business"))
      setCannabisLegal(
        api.moduleState("business").table("cannabis"),
        law.placeId,
        law.inForce,
        gov("cannabisAge"),
      );
  },
  // A consumer loan rate cap: the town bank writes household loans at no more (bank personal loans rarely reach it).
  [`${POLICY}business-commerce.cap-consumer-loan-rates`]: (api, law) => {
    if (has(api, "credit"))
      setConsumerRateCap(api, law.inForce ? gov("consumerLoanRateCap") : null);
  },
  // Right-to-work: represented workers needn't join or pay the union, so fewer do (jobs-unions.ts).
  [`${POLICY}labor-workforce.right-to-work`]: (api, law) => {
    if (has(api, "jobs"))
      setRightToWork(
        api.moduleState("jobs").table("unions"),
        law.placeId,
        law.inForce,
      );
  },
  [`${POLICY}housing-land-use.rent-stabilization`]: (api, law) => {
    if (has(api, HOUSING_MODULE_ID))
      setRentIncreaseCap(
        api,
        law.placeId,
        law.inForce ? gov("rentIncreaseCap") : null,
      );
  },
  [`${POLICY}housing-land-use.right-to-counsel-in-eviction`]: (api, law) => {
    if (has(api, HOUSING_MODULE_ID))
      setRightToCounsel(
        api,
        law.placeId,
        law.inForce,
        treasury(api, law.level),
      );
  },
  [`${POLICY}fiscal.cap-property-tax-growth`]: (api, law) => {
    if (has(api, HOUSING_MODULE_ID))
      setPropertyTaxCap(
        api,
        law.inForce ? gov("propertyTaxGrowthCapShare") : null,
      );
  },
  [`${POLICY}transportation-infrastructure.fare-free-transit`]: prices(
    "transit-fare",
    "price",
    (api, law) =>
      setPlacePrice(api, {
        placeId: law.placeId,
        good: "transit-fare",
        priceMinor: 0,
        cause: law.lawId,
        source: source(api, law.lawId, "Fare-free transit: the fare is zero."),
      }),
  ),
  [`${POLICY}transportation-infrastructure.mileage-fee-replaces-fuel-tax`]:
    prices("vehicle-miles", "per-unit", (api, law) => {
      const payee = treasury(api, law.level);
      if (payee)
        setPlaceTax(api, {
          placeId: law.placeId,
          good: "vehicle-miles",
          centsPerUnit: gov("mileageFeeCentsPerMile"),
          payeeAccountId: payee,
          replacesFuelTax: true,
          cause: law.lawId,
          source: source(
            api,
            law.lawId,
            "A mileage fee in place of the fuel tax.",
          ),
        });
    }),
  [`${POLICY}transportation-infrastructure.public-broadband`]: prices(
    "broadband",
    "offer",
    (api, law) => {
      const provider = treasury(api, law.level);
      if (provider)
        offerHouseholdService(api, {
          placeId: law.placeId,
          service: "broadband",
          providerId: provider,
          monthlyMinor: gov("broadbandMonthlyDollars") * 100,
          cause: law.lawId,
          source: source(
            api,
            law.lawId,
            "Public broadband at its monthly price.",
          ),
        });
    },
  ),
  [CLEAN_POWER]: energy,
  [CARBON]: energy,
  [`${POLICY}environment-energy.bottle-deposit`]: prices(
    "beverage-container",
    "per-unit",
    (api, law) =>
      addPerUnitCharge(api, {
        placeId: law.placeId,
        good: "beverage-container",
        centsPerUnit: gov("bottleDepositCents"),
        refundable: true,
        cause: law.lawId,
        source: source(api, law.lawId, "A refundable bottle deposit."),
      }),
  ),
  [`${POLICY}environment-energy.clean-air-plan-for-polluted-counties`]: (
    api,
    law,
  ) => {
    if (!law.inForce) return;
    const c = api.state as CoreState;
    const county = c.placeMetadata?.housingCounty ?? "";
    // Only where EPA lists the county as out of attainment does the plan bind its emitters.
    if (
      !countyNonattainment(county, Number(c.date.slice(0, 4))).some(
        (row) => !row.revoked,
      )
    )
      return;
    for (const [id, book] of c.finance.businesses)
      if (
        !book.closedAt &&
        /manufacturing|quarry/.test(book.kindId) &&
        c.organizations.get(id)?.placeId === law.placeId
      )
        addBusinessComplianceCost(api, {
          organizationId: id,
          cause: law.lawId,
          source: source(
            api,
            law.lawId,
            `A clean air plan for county ${county}, out of attainment.`,
          ),
        });
  },
  [`${POLICY}agriculture-natural-resources.limit-groundwater-withdrawal`]: (
    api,
    law,
  ) => {
    const c = api.state as CoreState;
    for (const [id, book] of c.finance.businesses)
      if (
        !book.closedAt &&
        /farm/.test(book.kindId) &&
        c.organizations.get(id)?.placeId === law.placeId
      )
        setBusinessOperatingLimit(api, {
          organizationId: id,
          input: "groundwater",
          share: law.inForce ? 1 - gov("groundwaterWithdrawalShare") : 0,
          cause: law.lawId,
          source: source(
            api,
            law.lawId,
            "Groundwater withdrawals limited to their share of the past.",
          ),
        });
  },
};

let registered = false;
/** Registers the economy's handlers with the laws' effects, once. */
export function registerWorldLawReach(): void {
  if (registered) return;
  registered = true;
  for (const [key, handler] of Object.entries(HANDLERS))
    registerPolicyHandler(key, handler);
}

export const WORLD_LAW_REACH_KEYS = Object.keys(HANDLERS);
