/**
 * Prices a law sets for a place's households and businesses: a dearer or
 * cheaper good (an electricity standard, a carbon price), a set price (a
 * transit fare), a tax by use (a mileage fee in place of the fuel tax), a
 * per-unit charge (a bottle deposit), a public offer households can take
 * (public broadband), and road condition (what drivers spend on repairs).
 *
 * Households already spend on these through the core's living cost, which
 * leaves the town. Each month this engine works out how far a law moves
 * each household's spending on the good, from what the average household
 * spends (BLS Consumer Expenditure Survey) scaled by its pay, and moves that
 * difference through the ledger: to the law's payee when spending rises,
 * back from outside the town when it falls. Businesses pay a dearer energy
 * price on their own energy costs the same way.
 */
import goods from "../data/prices/goods.json" with { type: "json" };
import pricesParameters from "../data/prices/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
import { residentsRuntime } from "./residents";
import { countedPayment } from "../counted-money";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./laws";
import { BUDGETS_MODULE_ID, governments } from "./budgets";
import lawParameters from "../data/laws/reach-group-b-parameters.json" with { type: "json" };
import { stopgap } from "../stopgaps";
import { transferCash } from "../world-transfer";
import { notifySalesReceipt } from "./finance";
import groupAParameters from "../data/laws/reach-group-a-parameters.json" with { type: "json" };
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";

export const PLACE_PRICES_MODULE_ID = "place-prices";
export const PRICES_PARAMETERS = pricesParameters as unknown as Readonly<
  Record<string, Parameter>
>;

export type Good = keyof typeof goods.goods;

interface Rule {
  id: string;
  placeId: string;
  good: Good;
  kind: "share" | "price" | "per-unit" | "offer" | "road" | "market";
  /** Share change in price ("share"), a price in cents ("price"), cents a unit ("per-unit"), a monthly price ("offer"),, the share of roads in poor condition ("road"), or a year's spending for each adult at licensed sellers ("market"). */
  value: number;
  refundable?: boolean;
  /** The fuel tax a mileage fee replaces is refunded. */
  replacesFuelTax?: boolean;
  payeeId?: string;
  providerId?: string;
  cause: string;
  since: string;
  source: Source;
}

const MONTHS = 12;
function store(api: CoreAPI) {
  return api.moduleState(PLACE_PRICES_MODULE_ID);
}
const core = (api: CoreAPI) => api.state as CoreState;

function put(api: CoreAPI, rule: Omit<Rule, "id" | "since">): void {
  store(api)
    .table("rules")
    .put({
      ...rule,
      id: `${rule.placeId}:${rule.good}:${rule.kind}`,
      since: api.state.date,
      isRule: true,
    } as unknown as { id: string });
}

/** A law makes a good dearer or cheaper by a share (an electricity standard, a carbon price). */
export function adjustPrice(
  api: CoreAPI,
  input: {
    placeId: string;
    good: "electricity" | "fuel";
    share: number;
    cause: string;
    payeeId?: string;
    source: Source;
  },
): void {
  put(api, { ...input, kind: "share", value: input.share });
}

/** A law sets a good's price (a transit fare, fare-free at zero); the payee runs the service. */
export function setPlacePrice(
  api: CoreAPI,
  input: {
    placeId: string;
    good: "transit-fare";
    priceMinor: number;
    payeeId?: string;
    cause: string;
    source: Source;
  },
): void {
  put(api, { ...input, kind: "price", value: input.priceMinor });
}

/** A law taxes use (a mileage fee), optionally in place of the fuel tax. */
export function setPlaceTax(
  api: CoreAPI,
  input: {
    placeId: string;
    good: "vehicle-miles";
    centsPerUnit: number;
    payeeAccountId: string;
    replacesFuelTax?: boolean;
    cause: string;
    source: Source;
  },
): void {
  put(api, {
    placeId: input.placeId,
    good: input.good,
    kind: "per-unit",
    value: input.centsPerUnit,
    payeeId: input.payeeAccountId,
    ...(input.replacesFuelTax ? { replacesFuelTax: true } : {}),
    cause: input.cause,
    source: input.source,
  });
}

/** A per-unit charge (a bottle deposit); a refundable charge comes back on what's redeemed. */
export function addPerUnitCharge(
  api: CoreAPI,
  input: {
    placeId: string;
    good: "beverage-container";
    centsPerUnit: number;
    refundable: boolean;
    payeeId?: string;
    cause: string;
    source: Source;
  },
): void {
  put(api, { ...input, kind: "per-unit", value: input.centsPerUnit });
}

/** A public offer of a household service (public broadband) at a monthly price. */
export function offerHouseholdService(
  api: CoreAPI,
  input: {
    placeId: string;
    service: "broadband";
    providerId: string;
    monthlyMinor: number;
    cause: string;
    source: Source;
  },
): void {
  put(api, {
    placeId: input.placeId,
    good: input.service,
    kind: "offer",
    value: input.monthlyMinor,
    providerId: input.providerId,
    cause: input.cause,
    source: input.source,
  });
}

/** The share of the place's roads in poor condition, as a budget leaves them. */
export function setRoadCondition(
  api: CoreAPI,
  input: {
    placeId: string;
    poorShare: number;
    cause: string;
    source: Source;
  },
): void {
  put(api, {
    placeId: input.placeId,
    good: "vehicle-repair",
    kind: "road",
    value: input.poorShare,
    cause: input.cause,
    source: input.source,
  });
}

/** A law repealed or a budget restored: the place's rule for the good ends. */
export function endPlaceRule(
  api: CoreAPI,
  placeId: string,
  good: Good,
  kind: Rule["kind"],
): void {
  store(api).table("rules").remove(`${placeId}:${good}:${kind}`);
}

/**
 * A household's monthly payments under the rule, in cents: what it now pays
 * the law's payee (`payMinor`), and what it no longer sends out of the town
 * through its living cost (`refundMinor`). `scale` is the household's
 * spending against the average household's (from its pay).
 */
export function monthlyChange(
  rule: Pick<
    Rule,
    "good" | "kind" | "value" | "refundable" | "replacesFuelTax"
  >,
  scale: number,
  persons: number,
  /** Members old enough to buy a good the law sells only to adults ("market"). */
  adults = 0,
): { payMinor: number; refundMinor: number } {
  const g = goods.goods;
  switch (rule.kind) {
    case "market":
      // What the household's adults spend a month at licensed sellers; the
      // market it replaces was outside the town's books, so nothing comes back.
      return {
        payMinor: (adults * rule.value * scale) / MONTHS,
        refundMinor: 0,
      };
    case "share": {
      const base =
        rule.good === "electricity"
          ? g.electricity.ceAnnualMinor
          : g.fuel.ceAnnualMinor;
      const change = (base * scale * rule.value) / MONTHS;
      return change >= 0
        ? { payMinor: change, refundMinor: 0 }
        : { payMinor: 0, refundMinor: -change };
    }
    case "price": {
      // Riders pay the new fare to the operator; the old fare no longer leaves the town.
      const t = g["transit-fare"],
        trips = (t.tripsPerHouseholdYear * scale) / MONTHS;
      return {
        payMinor: trips * rule.value,
        refundMinor: trips * t.farePerTripMinor,
      };
    }
    case "per-unit": {
      if (rule.good === "vehicle-miles") {
        const v = g["vehicle-miles"],
          miles = (v.milesPerHouseholdYear * scale) / MONTHS;
        return {
          payMinor: miles * rule.value,
          refundMinor: rule.replacesFuelTax
            ? (miles / v.milesPerGallon) * v.fuelTaxCentsPerGallon
            : 0,
        };
      }
      // A refundable deposit comes back on the containers returned; the rest is the payee's.
      const b = g["beverage-container"],
        units = (b.perPersonYear * persons) / MONTHS;
      return {
        payMinor:
          units * rule.value * (rule.refundable ? 1 - b.redemptionRate : 1),
        refundMinor: 0,
      };
    }
    case "offer": {
      // Subscribers take the public offer when it's cheaper; the old bill no longer leaves the town.
      // Each household switches as the subscribing share of one, not by its own choice yet.
      stopgap("SG-WORLD-prices-household-shares");
      const b = g.broadband;
      if (rule.value >= b.monthlyPriceMinor)
        return { payMinor: 0, refundMinor: 0 };
      return {
        payMinor: rule.value * b.subscriptionShare,
        refundMinor: b.monthlyPriceMinor * b.subscriptionShare,
      };
    }
    case "road": {
      const r = g["vehicle-repair"];
      const change =
        ((rule.value - r.poorShareBase) / r.poorShareOfReferenceRoads) *
        ((r.extraCostPerVehiclePoorRoadsMinor *
          r.vehiclesPerHousehold *
          scale) /
          MONTHS);
      return change >= 0
        ? { payMinor: change, refundMinor: 0 }
        : { payMinor: 0, refundMinor: -change };
    }
  }
}

/**
 * A household's spending on a good against the average household's, from its
 * pay: the Survey's spending by income group gives each good's income
 * elasticity, and a household with little or no pay spends as the lowest
 * income group does.
 */
function scaleFor(api: CoreAPI, monthlyPayMinor: number, good: Good): number {
  const average = goods.ceIncomeBeforeTaxesMinor;
  const income = Math.max(
    monthlyPayMinor * MONTHS,
    average * api.parameter("pricesIncomeFloorShare"),
  );
  return (
    (income / average) ** api.parameter(goods.goods[good].elasticityParameter)
  );
}

function outsideOf(c: CoreState, placeId: string): string | undefined {
  return [...c.organizations.values()].find(
    (org) => org.placeId === placeId && org.outsideFlow !== undefined,
  )?.id;
}

/** The town's open businesses licensed to sell a regulated good, in id order. */
function licensedSellers(c: CoreState, placeId: string, good: Good): string[] {
  const classification = (
    goods.goods[good] as { licensedClassification?: string }
  ).licensedClassification;
  if (!classification) return [];
  const out: string[] = [];
  for (const [id, org] of c.organizations)
    if (
      org.placeId === placeId &&
      org.classification === classification &&
      org.outsideFlow === undefined &&
      !c.finance.businesses.get(id)?.closedAt
    )
      out.push(id);
  return out.sort();
}

/**
 * A regulated good bought at licensed sellers: the household's spending is
 * shared evenly among the town's licensed sellers (outside the town when it
 * has none), and each sale is reported like any paid sale, so the sales tax
 * in force collects on it.
 */
function settleMarket(
  api: CoreAPI,
  id: string,
  rule: Rule,
  accountOwnerId: string,
  change: { payMinor: number },
  outside: string,
  buyerIds: readonly string[],
  countedHouseholdId?: string,
): void {
  const c = core(api);
  const pay = Math.round(change.payMinor);
  if (pay <= 0) return;
  const sellers = licensedSellers(c, rule.placeId, rule.good);
  const payees = sellers.length ? sellers : [outside];
  const each = Math.floor(pay / payees.length);
  payees.forEach((seller, index) => {
    const amountMinor = each + (index === 0 ? pay - each * payees.length : 0);
    if (amountMinor <= 0) return;
    const saleId = `${id}:${rule.cause}:pay:${seller}`;
    const paid = countedHouseholdId
      ? countedPayment(api, {
          id: saleId,
          placeId: rule.placeId,
          householdId: countedHouseholdId,
          otherOwnerId: seller,
          amountMinor,
          reasonKey: "price",
          source: rule.source,
        })
      : transferCash(
          api,
          saleId,
          accountOwnerId,
          seller,
          amountMinor,
          rule.source,
        );
    if (paid > 0 && seller !== outside)
      notifySalesReceipt(api, {
        id: saleId,
        date: c.date,
        sellerId: seller,
        buyerIds,
        kind: `household.${rule.good}`,
        paidMinor: paid,
        placeId: rule.placeId,
        counted: countedHouseholdId !== undefined,
      });
  });
}

function settle(
  api: CoreAPI,
  id: string,
  rule: Rule,
  accountOwnerId: string,
  change: { payMinor: number; refundMinor: number },
  countedHouseholdId?: string,
  outsideId?: string,
  buyerIds: readonly string[] = [],
): void {
  const c = core(api),
    outside = outsideId ?? outsideOf(c, rule.placeId);
  if (!outside) return;
  if (rule.kind === "market") {
    settleMarket(
      api,
      id,
      rule,
      accountOwnerId,
      change,
      outside,
      buyerIds,
      countedHouseholdId,
    );
    return;
  }
  const to =
    (rule.kind === "offer" ? rule.providerId : rule.payeeId) ?? outside;
  const refund = Math.round(change.refundMinor),
    pay = Math.round(change.payMinor);
  // The existing journal source names the law that changed this payment.
  // A cash difference is not, by itself, knowledge of who caused it.
  const sourceId = `${id}:${rule.cause}`;
  if (countedHouseholdId) {
    if (refund > 0)
      countedPayment(api, {
        id: `${sourceId}:refund`,
        placeId: rule.placeId,
        householdId: countedHouseholdId,
        otherOwnerId: outside,
        amountMinor: -refund,
        reasonKey: "price",
        source: rule.source,
      });
    if (pay > 0)
      countedPayment(api, {
        id: `${sourceId}:pay`,
        placeId: rule.placeId,
        householdId: countedHouseholdId,
        otherOwnerId: to,
        amountMinor: pay,
        reasonKey: "price",
        source: rule.source,
      });
    return;
  }
  if (refund > 0)
    transferCash(
      api,
      `${sourceId}:refund`,
      outside,
      accountOwnerId,
      refund,
      rule.source,
    );
  if (pay > 0 && to !== accountOwnerId)
    transferCash(api, `${sourceId}:pay`, accountOwnerId, to, pay, rule.source);
}

/** Read statutes where the existing price engine is about to charge use. */
function readPriceLaws(api: CoreAPI): void {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return;
  const placeId = lawChain(api).townPlaceId;
  const p = lawParameters.parameters;
  const sync = (
    question: string,
    rule: Omit<Rule, "id" | "since" | "placeId" | "cause" | "source">,
    gap: string,
    publicPayee = false,
  ) => {
    const law = lawInForce(api, question);
    const id = `${placeId}:${rule.good}:${rule.kind}`;
    const cause = `law:${question}:`;
    if (law.value !== 1 || !law.governing) {
      // End only this statute's price, not a separately recorded service rule.
      if (
        String(store(api).table("rules").get(id)?.cause ?? "").startsWith(cause)
      )
        endPlaceRule(api, placeId, rule.good, rule.kind);
      return;
    }
    api.stopgap(gap);
    const treasury = api.state.modules.has(BUDGETS_MODULE_ID)
      ? governments(api).find((g) => g.id === law.governing!.jurisdiction)
          ?.organizationId
      : undefined;
    if (publicPayee && !treasury) {
      if (
        String(store(api).table("rules").get(id)?.cause ?? "").startsWith(cause)
      )
        endPlaceRule(api, placeId, rule.good, rule.kind);
      return;
    }
    put(api, {
      ...rule,
      placeId,
      cause: `${cause}${law.governing.id}`,
      ...(publicPayee
        ? rule.kind === "offer"
          ? { providerId: treasury }
          : { payeeId: treasury }
        : {}),
      source: {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation: `${law.governing.id}; ${String(law.governing.source)}; ${goods.source.citation}`,
        estimatedFrom:
          "Recorded household earnings and size with the consumption and statutory-cost parameters in data/prices and data/laws/reach-group-b-parameters.json.",
      },
    });
  };
  // stopgapId: SG-GOV-REACH-B-energy-price — calibrated consumption and
  // policy sizes, not metered utility bills or a delivered explanation yet.
  sync(
    "us-policy-positions:environment-energy.clean-electricity-standard",
    {
      good: "electricity",
      kind: "share",
      value: p.cleanElectricityPriceShare.value,
    },
    "SG-GOV-REACH-B-energy-price",
  );
  sync(
    "us-policy-positions:environment-energy.price-carbon",
    {
      good: "fuel",
      kind: "share",
      value:
        (p.carbonPricePerTonDollars.value *
          p.householdTonsPerYear.value *
          p.centsPerDollar.value) /
        goods.goods.fuel.ceAnnualMinor,
    },
    "SG-GOV-REACH-B-energy-price",
    true,
  );
  // stopgapId: SG-GOV-REACH-B-retail-price — container use and redemption
  // still use household estimates rather than individual return decisions.
  sync(
    "us-policy-positions:environment-energy.bottle-deposit",
    {
      good: "beverage-container",
      kind: "per-unit",
      value: p.bottleDepositCents.value,
      refundable: true,
    },
    "SG-GOV-REACH-B-retail-price",
  );
  // stopgapId: SG-GOV-REACH-B-mileage-fee-price
  sync(
    "us-policy-positions:transportation-infrastructure.mileage-fee-replaces-fuel-tax",
    {
      good: "vehicle-miles",
      kind: "per-unit",
      value: p.mileageFeeCentsPerMile.value,
      replacesFuelTax: true,
    },
    "SG-GOV-REACH-B-mileage-fee-price",
    true,
  );
  // stopgapId: SG-GOV-REACH-B-broadband-bill
  sync(
    "us-policy-positions:transportation-infrastructure.public-broadband",
    {
      good: "broadband",
      kind: "offer",
      value: p.broadbandMonthlyDollars.value * p.centsPerDollar.value,
    },
    "SG-GOV-REACH-B-broadband-bill",
    true,
  );
  // stopgapId: SG-GOV-REACH-B-transit-fare-price
  sync(
    "us-policy-positions:transportation-infrastructure.fare-free-transit",
    {
      good: "transit-fare",
      kind: "price",
      value: 0,
    },
    "SG-GOV-REACH-B-transit-fare-price",
  );
  // stopgapId: SG-GOV-REACH-A-cannabis-market — every town retailer is
  // assumed licensed and shares the sales evenly; no store applies or is refused.
  sync(
    "us-policy-positions:business-commerce.legalize-cannabis-sales",
    {
      good: "cannabis",
      kind: "market",
      value:
        api.parameter(goods.goods.cannabis.annualPerAdultParameter) *
        api.parameter("minorPerDollar"),
    },
    "SG-GOV-REACH-A-cannabis-market",
  );
}

/** Each month: every rule's change in spending, settled for each full household and each place's counted households together. */
function month(api: CoreAPI): void {
  const c = core(api);
  const buyingAge = groupAParameters.parameters.cannabisAge.value;
  readPriceLaws(api);
  const rules = store(api)
    .table("rules")
    .query("all", [true]) as unknown as Rule[];
  if (!rules.length) return;
  const rt = residentsRuntime(c);
  for (const rule of rules) {
    for (const household of c.households.values()) {
      if (household.placeId !== rule.placeId) continue;
      const members = household.memberIds.filter((id) => c.people.has(id));
      if (!members.length) continue;
      let pay = 0;
      for (const id of members) {
        const job = c.jobs.get(c.people.get(id)!.jobId ?? "");
        if (job && job.endsAt === undefined)
          pay +=
            (job.wageDailyMinor * api.parameter("jobsDaysPerYear")) / MONTHS;
      }
      // A regulated good is bought by the household's adults of the law's age.
      const buyers =
        rule.kind === "market"
          ? members.filter(
              (id) =>
                ageOnDate(
                  makeIsoDate(c.people.get(id)!.birthDate),
                  makeIsoDate(c.date),
                ) >= buyingAge,
            )
          : members;
      const change = monthlyChange(
        rule,
        scaleFor(api, pay, rule.good),
        members.length,
        rule.kind === "market" ? buyers.length : 0,
      );
      const payer = [...(rule.kind === "market" ? buyers : members)].sort(
        (a, b) => c.people.get(b)!.liquidMinor - c.people.get(a)!.liquidMinor,
      )[0];
      if (!payer) continue;
      settle(
        api,
        `price:${rule.id}:${c.date}:${household.id}`,
        rule,
        payer,
        change,
        undefined,
        undefined,
        rule.kind === "market" ? buyers : [],
      );
    }
    // Apply the same nonlinear consumption rule to each counted household.
    // Averaging incomes before applying the elasticity changes the total.
    // Households of one group draw on one fund, so their rounded changes are
    // summed and settled once per group (the total is the same as settling
    // each in turn: each pays what the fund holds, in order).
    const outside = outsideOf(c, rule.placeId);
    const byGroup = new Map<
      number,
      { household: string; payMinor: number; refundMinor: number }
    >();
    for (const household of rt?.store.liveHouseholds() ?? []) {
      if (household.gone || household.placeId !== rule.placeId) continue;
      const persons = rt!.store.countedCount(household);
      if (!persons) continue;
      let pay = 0;
      for (const recorded of household.jobs) {
        const job = rt!.jobs.get(recorded.id);
        if (job && job.endsAt === undefined)
          pay +=
            (job.wageDailyMinor * api.parameter("jobsDaysPerYear")) / MONTHS;
      }
      const change = monthlyChange(
        rule,
        scaleFor(api, pay, rule.good),
        persons,
        rule.kind === "market"
          ? rt!.store
              .countedMembers(household)
              .filter(
                (m) =>
                  ageOnDate(
                    makeIsoDate(rt!.store.born[m]!),
                    makeIsoDate(c.date),
                  ) >= buyingAge,
              ).length
          : 0,
      );
      const total = byGroup.get(household.group) ?? {
        household: household.id,
        payMinor: 0,
        refundMinor: 0,
      };
      total.payMinor += Math.round(change.payMinor);
      total.refundMinor += Math.round(change.refundMinor);
      byGroup.set(household.group, total);
    }
    for (const [group, total] of byGroup)
      settle(
        api,
        `price:${rule.id}:${c.date}:group-${group}`,
        rule,
        "",
        total,
        total.household,
        outside,
      );
    // Businesses pay a dearer energy price on their own energy costs.
    if (rule.kind === "share")
      for (const [organizationId, book] of c.finance.businesses) {
        if (book.closedAt) continue;
        if (c.organizations.get(organizationId)?.placeId !== rule.placeId)
          continue;
        const share = api.parameter(
          rule.good === "electricity"
            ? "pricesBusinessElectricityShare"
            : "pricesBusinessFuelShare",
        );
        const change =
          (book.annualOtherCostsMinor * share * rule.value) / MONTHS;
        settle(
          api,
          `price:${rule.id}:${c.date}:${organizationId}`,
          rule,
          organizationId,
          change >= 0
            ? { payMinor: change, refundMinor: 0 }
            : { payMinor: 0, refundMinor: -change },
        );
      }
  }
}

function scheduleMonth(api: CoreAPI): void {
  const at = new Date(`${api.state.date}T00:00:00Z`);
  at.setUTCMonth(at.getUTCMonth() + 1, 3);
  api.moduleCalendar(PLACE_PRICES_MODULE_ID).schedule({
    key: `month:${at.toISOString().slice(0, 7)}`,
    date: at.toISOString().slice(0, "YYYY-MM-DD".length),
    kind: "place-prices-month",
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation: goods.source.citation,
    },
    sourceRecordIds: ["place-prices:state"],
  });
}

export const PLACE_PRICES_MODULE: CoreModule = {
  id: PLACE_PRICES_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      rules: { indexes: { all: { fields: ["isRule"] } } },
    },
  },
  onDay(api) {
    if (store(api).table("state").get("place-prices:state")) return;
    store(api)
      .table("state")
      .put({ id: "place-prices:state", openedAt: api.state.date });
    scheduleMonth(api);
  },
  onCalendarWork(api, work) {
    if (work.kind !== "place-prices-month") return;
    month(api);
    scheduleMonth(api);
  },
};
