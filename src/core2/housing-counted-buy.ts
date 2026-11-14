/**
 * A counted renter household buys a home (pool item world-counted-renters-buy):
 * the same decision a full renter makes (housing-buy.ts), weighed once a year
 * on its lease's anniversary month, with the money moved through its group's
 * accounts. Its means are its own savings: its share of its group's account,
 * the money that goes with it when it changes groups (`departingCash`), which
 * its savings weight spreads among households alike in income, age and tenure
 * (`savingWeight` in counted-money.ts). Short of the down payment for every
 * household the record stands for, it does not buy (Account lead's rulings,
 * Nov 14, 2026, from "one model, two tiers" and "no dice").
 *
 * A purchase: the household joins its owners' group first, taking its share
 * with it, and the down payment is paid from there (the renters it leaves
 * behind pay none of it) to
 * the seller (a builder's finished new house in town, else a seller leaving
 * the town, which the outside market stands for), times the households the
 * record stands for; the town bank lends the rest where its capital has room,
 * else a holder outside the town does, as at the opening; the rent flow ends;
 * a `mortgage:<household>` part joins the place's counted mortgage flow for
 * that holder; the household's home, mortgage and purchase are housing's
 * records like any owner's; and the place's price
 * level counts it as a buyer by its weight.
 */
import housingData from "./data/housing/housing.json" with { type: "json" };
import { buyMarket, monthlyPayment, weighHome } from "./housing-buy";
import { takeNewHome } from "./housing-construction";
import { countedMortgageFlowId, MORTGAGE_PREFIX } from "./housing-mortgages";
import { countBuyer, placePriceLevel } from "./housing-price-level";
import { countedHousingInArrears, countedPayment } from "./counted-money";
import type { CountedHousehold } from "./counted-groups";
import { ageInYears, daysBetweenText, makeIsoDate } from "./kernel/dates";
import {
  departingCash,
  householdIncome,
  regroupHousehold,
  residentsRuntime,
} from "./modules/residents";
import {
  addFlowPart,
  addResidentFlow,
  endResidentFlow,
} from "./residents-economy";
import type { CoreAPI, CoreState, Source } from "./types";

const HOUSING = "housing";
const table = (api: CoreAPI, name: string) =>
  api.moduleState(HOUSING).table(name);
type Runtime = NonNullable<ReturnType<typeof residentsRuntime>>;

/** A counted renter's home row in housing's dwellings table. */
interface DwellingRow {
  tenure?: string;
  since?: string;
  basis?: string;
}

/**
 * The day a counted renter's lease began: the day it moved into its place
 * for a lease from the opening, else the day it rented again.
 */
export function countedLeaseStart(
  api: CoreAPI,
  h: CountedHousehold,
): string | undefined {
  const row = table(api, "dwellings").get(`dwelling:${h.id}`) as
    DwellingRow | undefined;
  if (row?.tenure !== "rent") return undefined;
  if (row.basis !== "opening" && row.since) return row.since;
  return h.since ?? (api.state as CoreState).startedAt;
}

/**
 * The counted renters whose lease began in each month of the year, by
 * "MM", kept for the calendar year it was read in: each month weighs only its
 * own, so no month reads every counted household. A household that began
 * renting since the year's read waits for its first anniversary, which falls
 * in a later year's read.
 */
const anniversaries = new WeakMap<
  CoreState,
  { year: string; byMonth: Map<string, string[]> }
>();

function rentersThisMonth(api: CoreAPI, rt: Runtime): string[] {
  const c = api.state as CoreState;
  const year = c.date.slice(0, "YYYY".length);
  let held = anniversaries.get(c);
  if (held?.year !== year) {
    const byMonth = new Map<string, string[]>();
    for (const h of rt.store.liveHouseholds()) {
      if (h.tenure !== "rent" || h.quarters) continue;
      const start = countedLeaseStart(api, h);
      if (!start) continue;
      const month = start.slice("YYYY-".length, "YYYY-MM".length);
      const ids = byMonth.get(month) ?? [];
      ids.push(h.id);
      byMonth.set(month, ids);
    }
    held = { year, byMonth };
    anniversaries.set(c, held);
  }
  return held.byMonth.get(c.date.slice("YYYY-".length, "YYYY-MM".length)) ?? [];
}

/** Each seller of the record's homes and how many: the town's finished new houses first, then a seller leaving the town. */
function sellersOf(
  api: CoreAPI,
  placeId: string,
  outsideId: string,
  weight: number,
): { id: string; homes: number }[] {
  const sellers = new Map<string, number>();
  let left = weight;
  while (left >= 1) {
    const builder = takeNewHome(
      table(api, "stock"),
      table(api, "projects"),
      placeId,
    );
    if (!builder) break;
    sellers.set(builder, (sellers.get(builder) ?? 0) + 1);
    left -= 1;
  }
  if (left > 0) sellers.set(outsideId, (sellers.get(outsideId) ?? 0) + left);
  return [...sellers].map(([id, homes]) => ({ id, homes }));
}

/**
 * This month's counted renters weigh buying; those that choose to, with the
 * down payment in their own savings and a loan the bank says yes to, buy.
 * The housing engine hands in what it reads from the other families: the
 * home a renter's rent stands for (the same a full renter weighs), the bank's
 * yes and room, the town's outside market and the ledger's transfer.
 */
export interface CountedBuyWorld {
  readonly valueOf: (placeId: string, rentMinor: number) => number | undefined;
  readonly bankYes: (paymentMinor: number, incomeMinor: number) => number;
  readonly mortgageRoom: () =>
    { bankId: string; roomMinor: number } | undefined;
  readonly outsideOf: (placeId: string) => string | undefined;
  readonly transferCash: (
    id: string,
    fromOwnerId: string,
    toOwnerId: string,
    amountMinor: number,
    source: Source,
  ) => number;
}

export function buyCountedHomes(api: CoreAPI, world: CountedBuyWorld): void {
  const c = api.state as CoreState;
  const rt = residentsRuntime(c);
  const market = buyMarket(api);
  if (!rt || !rt.funded || !market || !c.modules.has(HOUSING)) return;
  const p = (key: string) => api.parameter(key);
  const today = makeIsoDate(c.date);
  for (const id of rentersThisMonth(api, rt)) {
    const h = rt.store.liveHousehold(id);
    if (!h || h.tenure !== "rent" || h.group < 0) continue;
    const start = countedLeaseStart(api, h);
    // A lease of less than a year waits for its first anniversary.
    if (
      !start ||
      daysBetweenText(start, c.date) <
        p("daysPerMeanYear") * (1 - 1 / p("macroMonthsPerYear"))
    )
      continue;
    const rent = rt.flows.get(`rent:${h.id}`);
    if (!rent || rent.endedAt || rent.amountMinor <= 0) continue;
    if (countedHousingInArrears(c, h.id)) continue;
    const members = rt.store.countedMembers(h);
    const facts = members.map((m) => rt.store.factsOf(m));
    const head = [...facts].sort(
      (a, b) =>
        a.birthDate.localeCompare(b.birthDate) || a.id.localeCompare(b.id),
    )[0];
    if (!head) continue;
    const income = householdIncome(rt, h) / p("macroMonthsPerYear");
    if (income <= 0) continue;
    const value = world.valueOf(h.placeId, rent.amountMinor);
    const outside = world.outsideOf(h.placeId);
    if (!value || !outside) continue;
    const weight = rt.store.weightOf(h);
    // What it could put down: its own share of its group's account, for one household of the record.
    const share = departingCash(rt, h);
    const weighed = weighHome(api, market, world.bankYes, {
      headId: head.id,
      householdId: h.id,
      valueMinor: value,
      rentMinor: rent.amountMinor,
      incomeMinor: income,
      meansMinor: Math.floor(share / weight),
      children: facts.filter(
        (row) => ageInYears(row.birthDate, today) < p("housingOwnerMinimumAge"),
      ).length,
      headAge: ageInYears(head.birthDate, today),
      leaseYears: daysBetweenText(start, c.date) / p("daysPerMeanYear"),
    });
    if (!weighed.buy) continue;
    const down = Math.round(weighed.downMinor);
    // Its share must cover the down payment for every household the record stands for, so the renters it leaves behind pay none of it.
    if (share < down * weight) continue;
    buy(
      api,
      rt,
      h,
      {
        weight,
        down,
        principal: weighed.principalMinor,
        rate: market.rate,
        term: market.term,
        rentMinor: rent.amountMinor,
        incomeMinor: income,
        shareMinor: Math.floor(share / weight),
        leaseMonths:
          daysBetweenText(start, c.date) /
          (p("daysPerMeanYear") / p("macroMonthsPerYear")),
        reasons: weighed.reasons,
        outsideId: outside,
        market,
      },
      world,
    );
  }
}

function buy(
  api: CoreAPI,
  rt: Runtime,
  h: CountedHousehold,
  deal: {
    weight: number;
    down: number;
    principal: number;
    rate: number;
    term: number;
    rentMinor: number;
    incomeMinor: number;
    /** One household's share of its group's account when it weighed buying. */
    shareMinor: number;
    leaseMonths: number;
    reasons: Record<string, number>;
    outsideId: string;
    market: NonNullable<ReturnType<typeof buyMarket>>;
  },
  world: CountedBuyWorld,
): void {
  const c = api.state as CoreState;
  const { weight } = deal;
  const stamp = `${h.id}:${c.date}`;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: c.date,
    citation: housingData.mortgage.source,
    estimatedFrom: `A counted household (standing for ${weight}) bought a home for ${Math.round((deal.principal + deal.down) / 100)} dollars each with ${Math.round(deal.down / 100)} down at ${(deal.rate * 100).toFixed(2)}%, from ${Math.round(deal.shareMinor / 100)} dollars of its own savings, its share of its group's account, after ${deal.leaseMonths.toFixed(0)} months of its lease.`,
  };
  // It joins the town's owners first, taking its share of the renters' account with it; the down payment then comes out of that money, not the renters' left behind.
  h.tenure = "mortgage";
  regroupHousehold(rt, h, c.date);
  const sellers = sellersOf(api, h.placeId, deal.outsideId, weight);
  // The down payment, from the account its share moved to, to each seller for its homes.
  let downPaid = 0;
  for (const seller of sellers)
    downPaid += countedPayment(api, {
      id: `down-payment:${stamp}:${seller.id}`,
      placeId: h.placeId,
      householdId: h.id,
      otherOwnerId: seller.id,
      amountMinor: Math.round(deal.down * seller.homes),
      whole: true,
      reasonKey: "housing.counted-down-payment",
      source,
    });
  if (downPaid <= 0) {
    // Nothing was paid: it stays a renter, and its share goes back with it.
    h.tenure = "rent";
    regroupHousehold(rt, h, c.date);
    return;
  }
  // The loan never exceeds what the down payment actually paid supports at the lender's loan-to-value rule.
  const share = housingData.mortgage.downPayment.firstTime;
  const loanWanted = Math.min(
    Math.round(deal.principal * weight),
    Math.floor((downPaid * (1 - share)) / share),
  );
  // The town bank holds it where its capital has room; otherwise a holder outside the town, as at the opening.
  const room = world.mortgageRoom();
  const holderId =
    room && loanWanted <= room.roomMinor ? room.bankId : deal.outsideId;
  let lent = 0;
  for (const seller of sellers) {
    const amount = Math.round((loanWanted * seller.homes) / weight);
    // Money between the outside market and itself is not on the books: the loan is made all the same.
    lent +=
      holderId === seller.id
        ? amount
        : world.transferCash(
            `mortgage-loan:${stamp}:${seller.id}`,
            holderId,
            seller.id,
            amount,
            source,
          );
  }
  // One household's share of the record's price, loan and payment.
  const loanEach = Math.floor(lent / weight);
  const downEach = Math.round(downPaid / weight);
  const payment = Math.round(monthlyPayment(deal.market, loanEach));
  // Its rent stops and its mortgage part starts.
  endResidentFlow(c, `rent:${h.id}`, "purchase");
  const mortgageId = `${MORTGAGE_PREFIX}${h.id}`;
  if (loanEach > 0 && payment > 0) {
    const flowId = countedMortgageFlowId(h.placeId, holderId);
    if (!addFlowPart(c, flowId, mortgageId, payment)) {
      const account = rt.input.accounts.find(
        (row) => row.placeId === h.placeId,
      )?.accountId;
      if (account)
        addResidentFlow(c, {
          id: flowId,
          kind: "purchase",
          financeKind: "household.mortgage",
          payerId: account,
          payeeId: holderId,
          residentsId: account,
          placeId: h.placeId,
          amountMinor: payment,
          firstAt: makeIsoDate(c.date),
          cadence: { kind: "months", every: 1, day: 1 },
          salesReceipt: false,
          marketAdjusted: false,
          amountByContract: { [mortgageId]: payment },
          source,
        });
    }
    table(api, "mortgages").put({
      id: mortgageId,
      householdId: h.id,
      holderId,
      boughtYear: Number(c.date.slice(0, "YYYY".length)),
      rate: deal.rate,
      originalMinor: loanEach,
      balanceMinor: loanEach,
      paymentMinor: payment,
      monthsLeft: deal.term,
    } as never);
  }
  const level = placePriceLevel(api, h.placeId);
  table(api, "purchases").put({
    id: `purchase:${stamp}`,
    householdId: h.id,
    buyerId: rt.store.ids[rt.store.countedMembers(h)[0]!]!,
    counted: true,
    weight,
    date: c.date,
    priceMinor: downEach + loanEach,
    downMinor: downEach,
    loanMinor: loanEach,
    holderId,
    sellerIds: sellers.map((row) => row.id),
    rate: deal.rate,
    rentBeforeMinor: deal.rentMinor,
    monthlyIncomeMinor: Math.round(deal.incomeMinor),
    savingsMinor: deal.shareMinor,
    leaseMonths: Math.round(deal.leaseMonths),
    // What decided it: each reason's contribution to the buy option.
    reasons: deal.reasons,
  } as never);
  table(api, "dwellings").put({
    id: `dwelling:${h.id}`,
    householdId: h.id,
    tenure: "own",
    // A first home bought here is a house (the seller's unit kind isn't recorded yet).
    kind: "house",
    valueMinor: downEach + loanEach,
    // The place's price level the price stands at, so the home's value moves with it (the one value rule).
    ...(level ? { priceLevel: level.now } : {}),
    loanHolderId: loanEach > 0 ? holderId : "",
    since: c.date,
    basis: "purchase",
  } as never);
  // It moved into its new home today, and now keeps company with the town's owners.
  h.since = makeIsoDate(c.date);
  if (loanEach <= 0) {
    // Bought outright: it keeps company with the owners who owe nothing.
    h.tenure = "other";
    regroupHousehold(rt, h, c.date);
  }
  countBuyer(api, h.placeId, weight);
}
