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
import { notifySalesReceipt } from "./finance";
import { countedPayment } from "../counted-money";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./laws";
import { BUDGETS_MODULE_ID, governments } from "./budgets";
import lawParameters from "../data/laws/reach-group-b-parameters.json" with { type: "json" };
import { DEFAULT_BUSINESS_BOOKS_DATA } from "../business-books";
import { stopgap } from "../stopgaps";
import { transferCash } from "../world-transfer";
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
  kind: "share" | "price" | "per-unit" | "offer" | "road" | "sale";
  /** Share change in price ("share"), a price in cents ("price"), cents a unit ("per-unit"), a monthly price ("offer"), the share of roads in poor condition ("road"), or a resident's yearly spending ("sale"). */
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

/**
 * The share of roads in poor condition when the highways line stands at
 * `level` times its base: the base share, falling as the line rises and
 * rising as it falls (never more than every road).
 */
export function poorRoadShareAt(api: CoreAPI, level: number): number {
  const base = goods.goods["vehicle-repair"].poorShareBase;
  if (level <= 0) return 1;
  return Math.min(
    1,
    base / level ** api.parameter("pricesRoadLevelElasticity"),
  );
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
): { payMinor: number; refundMinor: number } {
  const g = goods.goods;
  switch (rule.kind) {
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
    case "sale": {
      // Residents who now buy from the town's licensed sellers no longer send
      // that spending out of the town; the sellers' share of it is theirs.
      const spend = (rule.value * scale * persons) / MONTHS;
      return { payMinor: spend, refundMinor: spend };
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

interface Seller {
  readonly id: string;
  readonly weight: number;
}

/**
 * The town's open retail businesses and their weights (the demand they have
 * been serving): where a legal sale of a licensed good goes. Sorted so the
 * remainder of a rounded split always lands on the same seller.
 */
function licensedSellers(c: CoreState, placeId: string): readonly Seller[] {
  const sellers: Seller[] = [];
  for (const [id, book] of c.finance.businesses) {
    const org = c.organizations.get(id);
    const classification =
      org?.classification ??
      DEFAULT_BUSINESS_BOOKS_DATA.classifications.find(
        (row) => row.kindId === book.kindId,
      )?.classification ??
      "";
    if (
      book.closedAt ||
      !org ||
      org.outsideFlow ||
      org.placeId !== placeId ||
      !classification.startsWith("enterprise:retail")
    )
      continue;
    sellers.push({ id, weight: Math.max(book.annualDemandMinor, 1) });
  }
  return sellers.sort(
    (a, b) => b.weight - a.weight || a.id.localeCompare(b.id),
  );
}

/** A whole-cent split of an amount by weight; the first seller takes the rounding. */
function splitBy(amount: number, sellers: readonly Seller[]): number[] {
  const total = sellers.reduce((n, s) => n + s.weight, 0);
  const parts = sellers.map((s) => Math.floor((amount * s.weight) / total));
  parts[0] = (parts[0] ?? 0) + (amount - parts.reduce((n, x) => n + x, 0));
  return parts;
}

/**
 * A price law's sale is a paid sale like any other: the sales tax in force
 * collects on what the seller was actually paid, through the same receipt.
 */
function saleReceipt(
  api: CoreAPI,
  rule: Rule,
  id: string,
  sellerId: string,
  buyerIds: readonly string[],
  paidMinor: number,
  counted: boolean,
): void {
  if (!(paidMinor > 0)) return;
  notifySalesReceipt(api, {
    id,
    date: api.state.date,
    sellerId,
    buyerIds,
    kind: rule.good,
    paidMinor,
    placeId: rule.placeId,
    counted,
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
  sellers: readonly Seller[] = [],
): void {
  const c = core(api),
    outside = outsideId ?? outsideOf(c, rule.placeId);
  if (!outside) return;
  // A sale with no seller in town stays where it was: nothing moves.
  if (rule.kind === "sale" && !sellers.length) return;
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
    if (pay > 0 && rule.kind === "sale") {
      const parts = splitBy(pay, sellers);
      sellers.forEach((seller, i) => {
        if (parts[i]! > 0)
          saleReceipt(
            api,
            rule,
            `${sourceId}:pay:${seller.id}`,
            seller.id,
            [countedHouseholdId],
            countedPayment(api, {
              id: `${sourceId}:pay:${seller.id}`,
              placeId: rule.placeId,
              householdId: countedHouseholdId,
              otherOwnerId: seller.id,
              amountMinor: parts[i]!,
              reasonKey: "price",
              source: rule.source,
            }),
            true,
          );
      });
    } else if (pay > 0)
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
  if (pay > 0 && rule.kind === "sale") {
    const parts = splitBy(pay, sellers);
    sellers.forEach((seller, i) => {
      if (parts[i]! > 0)
        saleReceipt(
          api,
          rule,
          `${sourceId}:pay:${seller.id}`,
          seller.id,
          [accountOwnerId],
          transferCash(
            api,
            `${sourceId}:pay:${seller.id}`,
            accountOwnerId,
            seller.id,
            parts[i]!,
            rule.source,
          ),
          false,
        );
    });
  } else if (pay > 0 && to !== accountOwnerId)
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
  // stopgapId: SG-GOV-REACH-A-cannabis-market — the town's existing retail
  // businesses sell; no dedicated dispensary, license or tax yet.
  // Legal adult-use sales: residents buy from the town's licensed sellers.
  sync(
    "us-policy-positions:business-commerce.legalize-cannabis-sales",
    {
      good: "cannabis",
      kind: "sale",
      value: api.parameter("pricesCannabisSpendPerResidentMinor"),
    },
    "SG-GOV-REACH-A-cannabis-market",
  );
}

/** Each month: every rule's change in spending, settled for each full household and each place's counted households together. */
function month(api: CoreAPI): void {
  const c = core(api);
  readPriceLaws(api);
  const rules = store(api)
    .table("rules")
    .query("all", [true]) as unknown as Rule[];
  if (!rules.length) return;
  const rt = residentsRuntime(c);
  for (const rule of rules) {
    const sellers =
      rule.kind === "sale" ? licensedSellers(c, rule.placeId) : [];
    for (const household of c.households.values()) {
      if (household.placeId !== rule.placeId) continue;
      const members = household.memberIds.filter(
        (id) => c.people.get(id)?.alive,
      );
      if (!members.length) continue;
      let pay = 0;
      for (const id of members) {
        const job = c.jobs.get(c.people.get(id)!.jobId ?? "");
        if (job && job.endsAt === undefined)
          pay +=
            (job.wageDailyMinor * api.parameter("jobsDaysPerYear")) / MONTHS;
      }
      const change = monthlyChange(
        rule,
        scaleFor(api, pay, rule.good),
        members.length,
      );
      // The controlled person's money moves only by their own choice (owner,
      // Oct 14), and a dependent one (no job) pays nothing of the household's
      // bills: the household's price changes fall on the others.
      const payers = members.filter(
        (id) => id !== c.playerId || c.people.get(id)!.jobId,
      );
      if (!payers.length) continue;
      const payer = payers.sort(
        (a, b) => c.people.get(b)!.liquidMinor - c.people.get(a)!.liquidMinor,
      )[0]!;
      settle(
        api,
        `price:${rule.id}:${c.date}:${household.id}`,
        rule,
        payer,
        change,
        undefined,
        undefined,
        sellers,
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
        sellers,
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
