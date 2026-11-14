/**
 * The one decision a renter household makes about buying a home, for both
 * tiers (one model, two tiers): the home its rent stands for, the down
 * payment, what owning costs over renting, the household's own reasons, the
 * shared chooser, the down payment against its means, and the bank's yes on
 * the loan. A full renter's means are its members' cash and bank savings
 * (`buyHomes` in modules/housing.ts); a counted renter's are its own savings
 * from its record (housing-counted-buy.ts). Only how the money moves differs.
 */
import housingData from "./data/housing/housing.json" with { type: "json" };
import { chooseAct } from "./choice";
import { bankYes } from "./modules/credit";
import type { ActOffer, CoreAPI, CoreState } from "./types";

export const BUY_PULL = "housing:pull";

/** The month's mortgage terms every buyer weighs: the 30-year rate from the economy's latest month. */
export interface BuyMarket {
  readonly rate: number;
  /** Months in the loan's term. */
  readonly term: number;
  /** The monthly rate. */
  readonly r: number;
  /** The month's macro row the rate came from. */
  readonly monthId: string;
}

/** The latest macro month's mortgage terms, or undefined before the economy has a month. */
export function buyMarket(api: CoreAPI): BuyMarket | undefined {
  const c = api.state as CoreState;
  if (!c.modules.has("credit") || !c.modules.has("macro")) return undefined;
  const p = (key: string) => api.parameter(key);
  const latest = api.moduleState("macro").table("state").get("macro:state") as
    { latestMonth: string } | undefined;
  const monthId = latest ? `macro-month:${latest.latestMonth}` : "";
  const month = latest
    ? (api.moduleState("macro").table("months").get(monthId) as
        { mortgage30Pct: number } | undefined)
    : undefined;
  if (!month) return undefined;
  const rate = month.mortgage30Pct / p("macroHundred");
  return {
    rate,
    term: p("housingMortgageTermYears") * p("macroMonthsPerYear"),
    r: rate / p("macroMonthsPerYear"),
    monthId,
  };
}

/** The monthly payment on a loan at the month's terms. */
export function monthlyPayment(market: BuyMarket, principal: number): number {
  return market.r > 0
    ? (principal * market.r) / (1 - (1 + market.r) ** -market.term)
    : principal / market.term;
}

/** 0 to 1: rises through the late twenties and fades after the late fifties, each a smooth step. */
export function buyingAgeShape(api: CoreAPI, age: number): number {
  const step = (center: number) =>
    1 / (1 + Math.exp(-(age - center) / api.parameter("housingBuyAgeScale")));
  return (
    step(api.parameter("housingBuyAgeRiseCenter")) *
    (1 - step(api.parameter("housingBuyAgeFadeCenter")))
  );
}

function buyOffer(
  buy: boolean,
  targetId: string,
  reasons: Record<string, number>,
): ActOffer {
  const row = buy ? housingData.actions.buy : housingData.actions.rent;
  return {
    definition: {
      id: row.id,
      actKinds: row.actKinds,
      goalKinds: [],
      need: "money",
      effortParameter: "zero",
      effectParameter: "zero",
      targetKind: "housing-option",
      effect: "housing-choice",
    },
    targetId,
    availableHours: 1,
    effortHours: 0,
    reasonBindings: Object.entries(reasons).map(([id, value]) => ({
      id,
      provider: BUY_PULL,
      weightParameter: "one",
      arguments: { value: String(value) },
    })),
  };
}

/**
 * Why a renter household would buy, each reason sliding with the household's
 * own record and none a bar: owning's cost over the rent (the interest, the
 * rest of the payment being equity), the share of the down payment it is
 * short, children at home, the head's age, years in the lease, and savings
 * beyond the down payment. `baseline` is how far buying sits below renting
 * before these.
 */
export function homeBuyReasons(
  p: (key: string) => number,
  c: {
    interestMinor: number;
    rentMinor: number;
    incomeMinor: number;
    downMinor: number;
    meansMinor: number;
    children: number;
    /** The age pull, 0 to 1 (`buyingAgeShape`). */
    agePull: number;
    leaseYears: number;
  },
): Record<string, number> {
  return {
    baseline: p("housingBuyBaseline"),
    cost:
      -p("housingBuyCostWeight") *
      ((c.interestMinor - c.rentMinor) / c.incomeMinor),
    // The share of the down payment the household is short, from none to all of it: a household with nine tenths of it is nearly as ready as one with all of it.
    down:
      -p("housingBuyDownWeight") * Math.max(0, 1 - c.meansMinor / c.downMinor),
    children: (p("housingBuyChildWeight") * Math.min(c.children, 3)) / 3,
    age: p("housingBuyAgeWeight") * c.agePull,
    tenure:
      p("housingBuyTenureWeight") *
      Math.min(1, c.leaseYears / p("housingBuyTenureYears")),
    savings:
      p("housingBuySavingsWeight") *
      Math.min(
        1,
        Math.max(0, Math.log((c.meansMinor + 1) / (c.downMinor + 1))),
      ),
  };
}

/** What a renter household weighed and, when it buys, the loan the bank would make. */
export interface HomeWeighed {
  readonly buy: boolean;
  /** Each reason's pull on the buy option. */
  readonly reasons: Record<string, number>;
  /** The home's price, the down payment and the monthly payment on the rest. */
  readonly valueMinor: number;
  readonly downMinor: number;
  readonly paymentMinor: number;
  /** What the bank would lend (its yes's share of the rest); 0 when it would not. */
  readonly principalMinor: number;
}

/**
 * A renter household weighs buying the home its rent stands for. Its head
 * chooses through the shared chooser (a counted head is built for it as a
 * counted person); a choice to buy stands only with the down payment in hand
 * and a loan the bank says yes to.
 */
export function weighHome(
  api: CoreAPI,
  market: BuyMarket,
  input: {
    readonly headId: string;
    readonly householdId: string;
    readonly valueMinor: number;
    readonly rentMinor: number;
    readonly incomeMinor: number;
    /** What it could put down: a full household's cash and savings, a counted one's own savings. */
    readonly meansMinor: number;
    readonly children: number;
    readonly headAge: number;
    readonly leaseYears: number;
  },
): HomeWeighed {
  const p = (key: string) => api.parameter(key);
  const value = input.valueMinor;
  const down = value * housingData.mortgage.downPayment.firstTime;
  const payment = monthlyPayment(market, value - down);
  // What owning costs over renting is the interest: the rest of the payment is principal the household keeps as equity.
  const interest = (value - down) * market.r;
  const reasons = homeBuyReasons(p, {
    interestMinor: interest,
    rentMinor: input.rentMinor,
    incomeMinor: input.incomeMinor,
    downMinor: down,
    meansMinor: input.meansMinor,
    children: input.children,
    agePull: buyingAgeShape(api, input.headAge),
    leaseYears: input.leaseYears,
  });
  const weighed = {
    reasons,
    valueMinor: value,
    downMinor: down,
    paymentMinor: payment,
  };
  const result = chooseAct(api.state as CoreState, input.headId, [
    buyOffer(false, input.householdId, {}),
    buyOffer(true, input.householdId, reasons),
  ]);
  if (
    result.selected!.definition.id !== housingData.actions.buy.id ||
    input.meansMinor < down
  )
    return { ...weighed, buy: false, principalMinor: 0 };
  // The bank finances its yes's share of the loan; the household buys what that and the down payment pay for.
  const principal = Math.floor(
    (value - down) * bankYes(api, payment, input.incomeMinor),
  );
  return { ...weighed, buy: principal > 0, principalMinor: principal };
}
