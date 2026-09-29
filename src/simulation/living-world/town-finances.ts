/**
 * The town's businesses and banks keep books (Build 19: "businesses close
 * when their cash runs out, not at a flat 11.6% a year"; "real banks in each
 * town can fail one by one, calibrated from FDIC data").
 *
 * A business. Its pay is what the game already records: every paycheck its
 * staff receive is a transfer from it (`town-pay.ts`), and this reads those
 * transfers. Its revenue and its other costs are modeled from its pay when
 * its books open, and then move with the economy: revenue with the town's
 * money income (national growth and prices, the town's own recorded
 * downturns, and how many people in town still have jobs), other costs with
 * prices. A business that spends more than it takes in draws down its cash,
 * then borrows on its line at its bank if the bank will lend, and closes
 * when neither is left. Nothing draws whether it closes.
 *
 * A bank. Each town bank takes the shape of a real FDIC-insured bank under
 * $1 billion in the same state on June 30, 2026: its cushion (cash, free
 * securities and overnight loans) and its other assets, mostly loans, as
 * shares of deposits. Its loans lose what lenders nationwide are writing
 * off, scaled by how the town's unemployment compares with the nation's,
 * plus what a closed business still owed it. It earns on its loans. When
 * its capital falls below the line where depositors take fright, the
 * uninsured pull their money in one quarter; if they want more than its
 * cushion, it cannot pay and fails. When its capital falls to 2 percent of
 * its assets, regulators close it, as the law requires of a critically
 * undercapitalized bank (12 U.S.C. 1831o). A failure is recorded with its
 * cause; the FDIC's failure record is a check on runs of the game, never a
 * chance the game draws.
 *
 * Every closing is recorded as an event naming its cause, so the town's
 * macro layer (`macro-economy/sources.ts`) reads closings and failures as a
 * local downturn: the jobs lost raise local unemployment, which the town's
 * own job turnover reads (`townUnemploymentPressure`). That is the way town
 * closures and unemployment feed upward.
 */

import { addDays } from "../dates";
import { recordOrganizationProfile, recordWorkStatus } from "../life";
import { organizationClosingAt, organizationProfileAt } from "../life-queries";
import { MACRO_CREDIT_POLICY } from "../macro-economy/credit";
import { MACRO_ERA_POLICY } from "../macro-economy/policy";
import { standardNormal } from "../macro-economy/kernel";
import { SeededRng } from "../rng";
import type {
  EntityId,
  IsoDate,
  MoneyAmount,
  WorkStatusRecord,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  FDIC_SMALL_BANK_REPORT_DATE,
  FDIC_SMALL_BANK_SHAPES,
} from "./town-bank-shapes.generated";
import {
  BANK_FAILED_EVENT,
  BUSINESS_CLOSED_EVENT,
  type TownBankBooks,
  type TownBusinessBooks,
  type TownFinanceStore,
  type TownMarketBooks,
} from "./town-finance-types";
import {
  otherCostsAtSales,
  townBusinessKindBooks,
} from "./town-business-books";
import { TOWN_EMPLOYMENT_VERSION } from "./town-employment";
import { activeTownJobs, TOWN_JOB_END_REASONS } from "./town-labor-market";

export const TOWN_FINANCES_VERSION = "town-finances-v1" as const;
export { BANK_FAILED_EVENT, BUSINESS_CLOSED_EVENT };

export const TOWN_FINANCE_CLOSING_REASONS = {
  ranOutOfCash: "business:ran-out-of-cash",
  bankFailed: "bank:failed",
} as const;

export const TOWN_BANK_JOB_END_REASON = "labor:bank-failed";

/**
 * The numbers the books run on. MEASURED values name their source; every
 * PLACEHOLDER is set by hand and filed for research as
 * town-business-and-bank-books.
 */
export const TOWN_FINANCE_POLICY = {
  business: {
    /**
     * MEASURED: the median small business holds 27 days of cash buffer
     * (JPMorgan Chase Institute, "Cash Is King", September 2016).
     */
    medianCashBufferDays: 27,
    /** PLACEHOLDER: the spread of buffers around it (log scale). */
    cashBufferLogSd: 0.8,
    /** PLACEHOLDER: pay as a share of a small business's revenue. */
    payShareOfRevenue: 0.3,
    /** PLACEHOLDER: a line of credit up to this share of a year's revenue. */
    creditLineShareOfRevenue: 0.1,
    /**
     * PLACEHOLDER: how much of a business's revenue follows what the town's
     * employers pay (the rest comes from outside or does not follow).
     */
    localDemandShare: 0.5,
    /**
     * GAME ASSUMPTION: the share of a new business's sales that is new
     * spending in town. Zero: a newcomer takes its sales from the businesses
     * of its kind already there, and the pay of the jobs it adds reaches
     * every business through the town's pay (`localDemandShare`).
     * The same share of a closed business's sales leaves town with it; the
     * rest goes to the ones that stay. A kind the town had none of draws its
     * first business's sales from what residents spent elsewhere.
     */
    newDemandShare: 0,
    /**
     * PLACEHOLDER: how far a quarter's crowding moves a business's prices.
     * A business whose customers want more than its staff can serve raises
     * its prices by this share of the gap, and one with too few customers
     * cuts them the same way, at most `priceStepMax` a quarter.
     */
    crowdingPriceShare: 0.1,
    priceStepMax: 0.05,
    /**
     * PLACEHOLDER: how strongly customers choose among a town's businesses
     * of one kind by price: a business's share of their spending goes with
     * its capacity times its price over the others' to this power, negated.
     */
    rivalPriceElasticity: 3,
  },
  bank: {
    /** PLACEHOLDER: capital as a share of assets when books open. */
    capitalRatio: 0.1,
    /**
     * LAW: a bank whose tangible equity is 2 percent of its assets or less
     * is critically undercapitalized and is closed (12 U.S.C. 1831o(c)(3),
     * 12 CFR 324.403).
     */
    criticalCapitalRatio: 0.02,
    /** PLACEHOLDER: below this capital ratio it makes no new loans. */
    lendingCapitalRatio: 0.07,
    /** PLACEHOLDER: below this capital ratio depositors take fright. */
    frightCapitalRatio: 0.05,
    /** PLACEHOLDER: the share of deposits that leaves when they do. */
    uninsuredShare: 0.3,
    /** PLACEHOLDER: how much of a lost cushion it rebuilds a quarter. */
    cushionRebuildPerQuarter: 0.25,
    /** PLACEHOLDER: deposits a dollar of the town's yearly pay brings. */
    depositsPerDollarOfPay: 1.5,
    /**
     * REGULATION: a closed-end consumer loan is charged off once it is 120
     * days past due (FFIEC Uniform Retail Credit Classification and Account
     * Management Policy, 65 Fed. Reg. 36903, June 12, 2000).
     */
    chargeOffDaysPastDue: 120,
    /**
     * LAW, the most common rule: a laid-off worker draws unemployment
     * benefits for up to 26 weeks in most states (U.S. Department of Labor,
     * Comparison of State Unemployment Insurance Laws). A borrower
     * keeps paying while benefits last, and misses payments after.
     */
    unemploymentBenefitDays: 26 * 7,
  },
} as const;

/**
 * How much less of a kind customers buy when its prices rise against
 * everything else (own-price elasticity of demand). Restaurants: MEASURED,
 * 0.81 for food away from home (Andreyeva, Long and Brownell, "The Impact
 * of Food Prices on Consumption," American Journal of Public Health, 2010).
 * Every other kind: PLACEHOLDER, 0.5.
 */
export const TOWN_KIND_PRICE_ELASTICITY: Readonly<Record<string, number>> = {
  restaurant: 0.81,
};
const DEFAULT_PRICE_ELASTICITY = 0.5;

export interface BankShape {
  readonly state: string | null;
  readonly index: number;
  readonly cushion: number;
  readonly otherAssets: number;
}

function parseShapes(text: string): { cushion: number; otherAssets: number }[] {
  return text.split(";").map((pair) => {
    const [cushion, otherAssets] = pair.split(",").map(Number) as [
      number,
      number,
    ];
    return { cushion, otherAssets };
  });
}

let nationalShapes: { cushion: number; otherAssets: number }[] | null = null;

/**
 * The real bank a town bank takes the shape of: one of its state's small
 * banks, or of the nation's when the state has fewer than five on file.
 * Drawing it sets the stage; the bank's fate is not drawn.
 */
export function drawBankShape(state: string | null, draw: number): BankShape {
  const own = state ? FDIC_SMALL_BANK_SHAPES[state] : undefined;
  const pool = own ? parseShapes(own) : [];
  if (pool.length >= 5) {
    const index = Math.min(pool.length - 1, Math.floor(draw * pool.length));
    return { state, index, ...pool[index]! };
  }
  nationalShapes ??= Object.keys(FDIC_SMALL_BANK_SHAPES)
    .sort()
    .flatMap((key) => parseShapes(FDIC_SMALL_BANK_SHAPES[key]!));
  const index = Math.min(
    nationalShapes.length - 1,
    Math.floor(draw * nationalShapes.length),
  );
  return { state: null, index, ...nationalShapes[index]! };
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

function dollars(amount: MoneyAmount): number {
  return amount.minorUnits / 100;
}

function formatDollars(value: number): string {
  const whole = Math.round(Math.abs(value));
  return `$${whole.toLocaleString("en-US")}`;
}

// ─── What the quarter looked like ───────────────────────────────────────

/** Paychecks a year, by the pay schedule each paycheck flow names. */
const PAYDAYS_A_YEAR: Readonly<Record<string, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

/**
 * A quarter's pay for each organization, from the paychecks it sent
 * between `since` (exclusive) and today. A quarter of 91 days holds six or
 * seven paydays of an employer that pays every two weeks, and two to four
 * of one that pays monthly, so each organization's paychecks are averaged
 * per payday and scaled to a quarter's paydays on its own schedule: a
 * quarter with an extra payday is not a quarter of higher costs.
 */
function payBetween(
  world: World,
  organizations: ReadonlySet<EntityId>,
  since: IsoDate,
): Map<EntityId, number> {
  const flowOrg = new Map<
    EntityId,
    { org: EntityId; perYear: number | null }
  >();
  for (const flow of world.history.resourceFlows)
    if (
      flow.basisKind === "compensation:work" &&
      flow.source.kind === "organization" &&
      organizations.has(flow.source.organizationId)
    )
      flowOrg.set(flow.id, { org: flow.source.organizationId, perYear: null });
  for (const terms of world.history.resourceFlowTerms) {
    const flow = flowOrg.get(terms.resourceFlowId);
    const schedule = flow
      ? /^schedule:town-([a-z]+)/.exec(terms.cadenceKind)?.[1]
      : undefined;
    if (flow && schedule && PAYDAYS_A_YEAR[schedule])
      flow.perYear = PAYDAYS_A_YEAR[schedule]!;
  }
  const total = new Map<EntityId, number>();
  const paydays = new Map<EntityId, Set<IsoDate>>();
  const perYear = new Map<EntityId, number>();
  const outcomes = world.history.resourceTransferOutcomes;
  // Outcomes are written in time order; a paycheck is never recorded more
  // than a pay period late, so reading back past a month before `since`
  // finds none newer.
  for (let index = outcomes.length - 1; index >= 0; index -= 1) {
    const outcome = outcomes[index]!;
    if (outcome.occurredAt <= since) {
      if (outcome.occurredAt < addDays(since, -45)) break;
      continue;
    }
    if (outcome.occurredAt > world.currentDate) continue;
    const flow = flowOrg.get(outcome.resourceFlowId);
    if (!flow) continue;
    total.set(
      flow.org,
      (total.get(flow.org) ?? 0) + dollars(outcome.transferredAmount),
    );
    const days = paydays.get(flow.org) ?? new Set<IsoDate>();
    days.add(outcome.occurredAt);
    paydays.set(flow.org, days);
    if (flow.perYear) perYear.set(flow.org, flow.perYear);
  }
  const pay = new Map<EntityId, number>();
  for (const [org, amount] of total) {
    const seen = paydays.get(org)!.size;
    const yearly = perYear.get(org);
    pay.set(org, yearly && seen > 0 ? (amount / seen) * (yearly / 4) : amount);
  }
  return pay;
}

interface Economy {
  /**
   * The nation's growth over its trend, percent a year. The books run in
   * constant dollars at today's productivity, because game pay follows
   * neither prices nor the trend; what moves sales is the swing around the
   * trend. The town's own downturns reach its businesses through what its
   * employers pay (`localDemandShare`), not a second time here.
   */
  readonly growthGapPct: number;
  readonly trendPct: number;
  readonly inflationPct: number;
  readonly chargeOffPct: number;
  readonly debtRatePct: number;
  readonly lendingGrowthPct: number;
  readonly tightness: number;
  /** The nation's price index, its latest month. */
  readonly priceIndex: number;
  readonly nationalUnemploymentPct: number | null;
}

/** The last three recorded national months. */
function economyOf(world: World): Economy | null {
  const months = world.macroEconomy?.months ?? [];
  const national = months
    .filter(
      (month) =>
        month.scope === "national" && month.recordedAt <= world.currentDate,
    )
    .slice(-3);
  if (national.length === 0) return null;
  const mean = (values: readonly number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const growth = mean(national.map((m) => m.growthPct));
  const inflation = mean(national.map((m) => m.inflationPct));
  const credit = national.map((m) => m.credit).filter((c) => c !== undefined);
  const start = MACRO_CREDIT_POLICY.start;
  const trend =
    national.at(-1)!.drivers?.trendPct ?? MACRO_ERA_POLICY.start.trendGrowthPct;
  return {
    growthGapPct: growth - trend,
    trendPct: trend,
    inflationPct: inflation,
    chargeOffPct: credit.length
      ? mean(credit.map((c) => c.chargeOffPct))
      : start.chargeOffPct,
    debtRatePct: credit.length
      ? mean(credit.map((c) => c.debtRatePct))
      : mean(
          national.map(
            (m) => (m.policyRate.lowerPct + m.policyRate.upperPct) / 2,
          ),
        ) + start.spreadPp,
    lendingGrowthPct: credit.length
      ? mean(credit.map((c) => c.lendingGrowthPct))
      : growth + inflation,
    tightness: mean(national.map((m) => m.creditTightness)),
    nationalUnemploymentPct: national.at(-1)!.unemploymentPct,
    priceIndex: national.at(-1)!.priceIndex,
  };
}

/** The share of the town's labor force out of work, from its residents. */
export type TownUnemploymentReader = (
  world: World,
  town: EntityId,
) => number | null;

/**
 * How many workers' worth of each kind's spending in town its open
 * businesses cannot serve, by kind: the kind's sales less what its members
 * can sell, over what one worker's pay brings in sales at the town's
 * average pay. A kind whose every business has closed leaves all of its
 * spending unserved. Kinds with no market yet are absent.
 */
export function townUnservedJobs(
  world: World,
  town: EntityId,
): Map<string, number> {
  const store = world.townFinances;
  const unserved = new Map<string, number>();
  if (!store) return unserved;
  const P = TOWN_FINANCE_POLICY.business;
  for (const market of Object.values(store.markets)) {
    if (market.town !== town) continue;
    const perJob =
      market.townPay !== undefined && market.townJobs > 0
        ? market.townPay / market.townJobs / P.payShareOfRevenue
        : 0;
    if (perJob <= 0) continue;
    const capacity = market.members
      .filter((id) => !organizationClosingAt(world, id))
      .reduce((sum, id) => sum + (store.businesses[id]?.capacity ?? 0), 0);
    unserved.set(market.kind, (market.annualSales - capacity) / perJob);
  }
  return unserved;
}

/**
 * GAME ASSUMPTION, from how general sales taxes are written: the kinds of
 * business whose sales are retail sales a town's general sales tax reaches
 * (goods, meals, lodging, admissions, repairs and personal services). Sales
 * between businesses (manufacturing, wholesale, trucking) and most
 * professional, medical and school services are outside it.
 */
export const TOWN_TAXABLE_SALES_KINDS: ReadonlySet<string> = new Set([
  "retail",
  "restaurant",
  "inn",
  "recreation",
  "repair",
  "personal-care",
]);

/**
 * How the town's taxable sales have moved since its books began, in
 * today's dollars: the chained index of each taxable kind's spending in
 * town (`TownFinanceStore.taxableSales`), times the nation's prices since.
 * Null while the town keeps no books. A city's sales tax follows it
 * (`public-budgets/month.ts`), so a closing, a recession or a raise reaches
 * the city's revenue.
 */
export function townTaxableSales(world: World, town: EntityId): number | null {
  const store = world.townFinances;
  const economy = economyOf(world);
  const index = store?.taxableSales?.[town];
  if (!store || !economy || index === undefined) return null;
  return (
    index * (economy.priceIndex / (store.basePriceIndex ?? economy.priceIndex))
  );
}

// ─── Opening books ──────────────────────────────────────────────────────

function openBankBooks(
  world: World,
  town: EntityId,
  organizationId: EntityId,
  townYearlyPay: number,
  banksInTown: number,
  round: string,
): TownBankBooks {
  const P = TOWN_FINANCE_POLICY.bank;
  const state = world.jurisdictions[town]?.parentName ?? null;
  const shape = drawBankShape(
    state,
    new SeededRng(world.seed)
      .fork(`${TOWN_FINANCES_VERSION}:bank-shape:${organizationId}`)
      .next(),
  );
  const deposits = round2(
    (townYearlyPay * P.depositsPerDollarOfPay) / Math.max(1, banksInTown),
  );
  const liquid = round2(deposits * shape.cushion);
  const loans = round2(deposits * shape.otherAssets);
  return {
    organizationId,
    openedAt: world.currentDate,
    shape,
    deposits,
    liquid,
    loans,
    capital: round2(P.capitalRatio * (liquid + loans)),
    businessLoans: 0,
    lastQuarterLosses: 0,
    runAt: null,
    failed: null,
    lastRound: round,
  };
}

/**
 * The bank a business borrows from: the town's open bank that holds the
 * most deposits, as a small town's businesses mostly bank with its largest
 * bank. Ties go by record id. GAME ASSUMPTION.
 */
function lenderOf(
  banks: Readonly<Record<EntityId, TownBankBooks>>,
  openBanks: readonly EntityId[],
): EntityId | null {
  let best: EntityId | null = null;
  for (const id of openBanks)
    if (
      best === null ||
      banks[id]!.deposits > banks[best]!.deposits ||
      (banks[id]!.deposits === banks[best]!.deposits && id < best)
    )
      best = id;
  return best;
}

function openBusinessBooks(
  world: World,
  organizationId: EntityId,
  kind: string,
  quarterPay: number,
  bankId: EntityId | null,
  round: string,
): TownBusinessBooks {
  const P = TOWN_FINANCE_POLICY.business;
  const rng = new SeededRng(world.seed).fork(
    `${TOWN_FINANCES_VERSION}:business:${organizationId}`,
  );
  const yearlyPay = quarterPay * 4;
  const annualRevenue = yearlyPay / P.payShareOfRevenue;
  const margin = townBusinessKindBooks(kind).margin;
  const annualOtherCosts = Math.max(
    0,
    annualRevenue * (1 - margin) - yearlyPay,
  );
  const bufferDays =
    P.medianCashBufferDays *
    Math.exp(P.cashBufferLogSd * standardNormal(rng.fork("buffer")));
  return {
    organizationId,
    openedAt: world.currentDate,
    cash: round2(((yearlyPay + annualOtherCosts) * bufferDays) / 365),
    debt: 0,
    annualRevenue: round2(annualRevenue),
    kind,
    capacity: round2(annualRevenue),
    annualOtherCosts: round2(annualOtherCosts),
    margin: round6(margin),
    ownDemandLog: 0,
    openingShare: 1,
    openingMarketSales: round2(annualRevenue),
    bankId,
    lineLimit: round2(annualRevenue * P.creditLineShareOfRevenue),
    lastQuarterNet: 0,
    lastQuarterPay: round2(quarterPay),
    lastRound: round,
  };
}

// ─── The quarter ────────────────────────────────────────────────────────

export interface TownFinanceQuarter {
  readonly world: World;
  /** Businesses whose books say they cannot go on. */
  readonly closing: readonly {
    readonly organizationId: EntityId;
    readonly books: TownBusinessBooks;
    readonly why: "no-line" | "bank-refused" | "bank-failed" | "line-used-up";
    /** Its share of its market's capacity, and the market's sales, now. */
    readonly share: number;
    readonly marketSales: number;
  }[];
}

function townBanks(world: World, town: EntityId): EntityId[] {
  const stem = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:bank:`;
  return world.history.organizations
    .filter(
      (organization) =>
        organization.stableKey.startsWith(stem) &&
        !organizationClosingAt(world, organization.id),
    )
    .map((organization) => organization.id)
    .sort();
}

function capitalRatio(bank: TownBankBooks): number {
  const assets = bank.liquid + bank.loans;
  return assets > 0 ? bank.capital / assets : 0;
}

function lends(bank: TownBankBooks | undefined, economy: Economy): boolean {
  if (!bank || bank.failed) return false;
  return (
    capitalRatio(bank) >= TOWN_FINANCE_POLICY.bank.lendingCapitalRatio &&
    // When lenders nationwide have tightened well past their start, a town
    // bank opens no new credit either.
    economy.tightness < 0.75
  );
}

/**
 * Runs one quarter of the books of the town's open businesses (given) and
 * its banks, on the world's current date. Records nothing but the books;
 * the caller closes the businesses the books say cannot go on
 * (`closeBusinessesOutOfCash`) and the banks that fail here are closed here.
 */
export function stepTownFinances(
  world: World,
  town: EntityId,
  businesses: readonly {
    readonly organizationId: EntityId;
    readonly kind: string;
    /**
     * Opened after the town's own businesses: its sales come out of its
     * kind's market. One of the town's own, first hired into later, brings
     * its whole market with it.
     */
    readonly newcomer: boolean;
  }[],
  exempt: ReadonlySet<EntityId>,
  round: string,
): TownFinanceQuarter {
  const economy = economyOf(world);
  if (!economy) return { world, closing: [] };
  const store: TownFinanceStore = world.townFinances ?? {
    version: TOWN_FINANCES_VERSION,
    businesses: {},
    banks: {},
    markets: {},
  };
  const bankIds = townBanks(world, town);
  // Every employer in town: what they pay is what the town's residents
  // earn, and what they earn is what they spend.
  const employerStem = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:`;
  const all = new Set<EntityId>([
    ...businesses.map((row) => row.organizationId),
    ...bankIds,
    ...world.history.organizations
      .filter((row) => row.stableKey.startsWith(employerStem))
      .map((row) => row.id),
  ]);
  // The quarterly review runs every 91 days.
  const since = addDays(world.currentDate, -91);
  const pay = payBetween(world, all, since);
  // The books run in the dollars of the day they began: pay, set in current
  // dollars, is deflated by the nation's prices since.
  const basePriceIndex = store.basePriceIndex ?? economy.priceIndex;
  const priceLevel = economy.priceIndex / basePriceIndex;
  const townJobs = activeTownJobs(world, town).length;
  const averagePay =
    townJobs > 0
      ? ([...pay.values()].reduce((sum, value) => sum + value, 0) * 4) /
        townJobs
      : 0;
  for (const [id, value] of pay) pay.set(id, value / priceLevel);
  const townPay = round2(
    [...pay.values()].reduce((sum, value) => sum + value, 0) * 4,
  );
  const banks: Record<EntityId, TownBankBooks> = { ...store.banks };
  const yearlyTownPay =
    [...businesses.map((row) => row.organizationId), ...bankIds].reduce(
      (sum, id) => sum + (pay.get(id) ?? 0),
      0,
    ) * 4;
  for (const bankId of bankIds)
    if (!banks[bankId] && yearlyTownPay > 0)
      banks[bankId] = openBankBooks(
        world,
        town,
        bankId,
        yearlyTownPay,
        bankIds.length,
        round,
      );

  const P = TOWN_FINANCE_POLICY.business;
  const demandGrowth = Math.exp(economy.growthGapPct / 400);
  // Constant dollars: interest at its real rate, never below zero.
  const realDebtRatePct = Math.max(
    0,
    economy.debtRatePct - economy.inflationPct,
  );
  const books: Record<EntityId, TownBusinessBooks> = { ...store.businesses };
  const markets: Record<string, TownMarketBooks> = { ...store.markets };
  const pendingDefaults = new Map<EntityId, number>();
  const closing: TownFinanceQuarter["closing"][number][] = [];
  const openBanks = bankIds.filter((id) => banks[id] && !banks[id]!.failed);
  const formedAt = new Map(
    world.history.organizations.map((row) => [row.id, row.formedAt]),
  );

  // Books open once a business has been open a full quarter, so its pay
  // over the quarter is a whole quarter's.
  for (const { organizationId, kind } of businesses) {
    if (books[organizationId]) continue;
    const quarterPay = pay.get(organizationId) ?? 0;
    if (quarterPay <= 0 || (formedAt.get(organizationId) ?? since) > since)
      continue;
    const bankId = lenderOf(banks, openBanks);
    books[organizationId] = {
      ...openBusinessBooks(
        world,
        organizationId,
        kind,
        quarterPay,
        bankId,
        round,
      ),
      price: round6(priceLevel),
    };
  }

  // Each business sets its prices from its costs and its customers: its
  // costs follow what a job in town pays and the nation's prices, weighted
  // by its own pay and other costs; a crowded business raises its prices,
  // an idle one cuts them.
  const prices = new Map<EntityId, number>();
  for (const { organizationId, kind } of businesses) {
    const existing = books[organizationId];
    if (!existing) continue;
    const price = existing.price ?? priceLevel;
    if (
      existing.lastRound === round ||
      existing.openedAt === world.currentDate
    ) {
      prices.set(organizationId, price);
      continue;
    }
    const market = markets[`${town}:${kind}`];
    const wageGrowth =
      market?.averagePay && averagePay > 0 ? averagePay / market.averagePay : 1;
    const inflation = market?.priceIndexSeen
      ? economy.priceIndex / market.priceIndexSeen
      : 1;
    const yearlyPay = (existing.lastQuarterPay ?? 0) * 4;
    const otherCosts = otherCostsAtSales(existing);
    const payShare =
      yearlyPay + otherCosts > 0 ? yearlyPay / (yearlyPay + otherCosts) : 0;
    const costGrowth = payShare * wageGrowth + (1 - payShare) * inflation;
    const crowding =
      existing.capacity > 0
        ? existing.annualRevenue / existing.capacity - 1
        : 0;
    const step = Math.max(
      -P.priceStepMax,
      Math.min(P.priceStepMax, P.crowdingPriceShare * crowding),
    );
    prices.set(organizationId, round6(price * costGrowth * Math.exp(step)));
  }
  // What a kind's prices are against everything else, weighted by capacity.
  const realPriceOf = (
    ids: readonly EntityId[],
    price: (id: EntityId) => number,
  ) => {
    const capacity = ids.reduce((sum, id) => sum + books[id]!.capacity, 0);
    return capacity > 0
      ? ids.reduce((sum, id) => sum + books[id]!.capacity * price(id), 0) /
          capacity /
          priceLevel
      : 1;
  };

  // Each kind of business shares one market. A newcomer brings some new
  // spending and takes the rest from the others; a closing takes some
  // spending out of town and leaves the rest to the others.
  const newcomers = new Set(
    businesses.filter((row) => row.newcomer).map((row) => row.organizationId),
  );
  const members = new Map<string, EntityId[]>();
  for (const { organizationId, kind } of businesses)
    if (books[organizationId])
      members.set(kind, [...(members.get(kind) ?? []), organizationId]);
  const kinds = new Set(members.keys());
  for (const market of Object.values(markets))
    if (market.town === town) kinds.add(market.kind);
  // The town's taxable sales last quarter, over the markets it had then.
  const taxableBefore = new Map<string, number>();
  for (const [key, market] of Object.entries(markets))
    if (
      market.town === town &&
      market.lastRound !== round &&
      TOWN_TAXABLE_SALES_KINDS.has(market.kind)
    )
      taxableBefore.set(key, market.annualSales);
  const coverage = new Map<string, number>();
  for (const kind of [...kinds].sort()) {
    const key = `${town}:${kind}`;
    const now = members.get(kind) ?? [];
    const market = markets[key];
    if (!market) {
      markets[key] = {
        town,
        kind,
        openedAt: world.currentDate,
        annualSales: round2(
          now.reduce((sum, id) => sum + books[id]!.capacity, 0),
        ),
        members: now,
        townJobs,
        townPay,
        averagePay: round2(averagePay),
        priceIndexSeen: economy.priceIndex,
        lastRound: round,
      };
      continue;
    }
    if (market.lastRound === round) continue;
    const before = new Set(market.members);
    const current = new Set(now);
    // Residents spend from what they earn: the town's local share of
    // spending follows its pay (books opened before pay was read follow
    // its jobs until then).
    const incomeFactor =
      market.townPay !== undefined && market.townPay > 0 && townPay > 0
        ? (townPay / market.townPay) ** P.localDemandShare
        : market.townJobs > 0 && townJobs > 0
          ? (townJobs / market.townJobs) ** P.localDemandShare
          : 1;
    // Customers buy less of a kind whose prices rose against everything
    // else, and spend more or less on it by the elasticity.
    const stayed = now.filter((id) => before.has(id));
    // Last quarter's prices, carried to today's price level.
    const sinceSeen = market.priceIndexSeen
      ? economy.priceIndex / market.priceIndexSeen
      : 1;
    const lastRealPrice = realPriceOf(stayed, (id) =>
      books[id]!.price !== undefined
        ? books[id]!.price! * sinceSeen
        : priceLevel,
    );
    const elasticity =
      TOWN_KIND_PRICE_ELASTICITY[kind] ?? DEFAULT_PRICE_ELASTICITY;
    const nowRealPrice = realPriceOf(
      stayed,
      (id) => prices.get(id) ?? priceLevel,
    );
    const priceFactor =
      stayed.length > 0 && lastRealPrice > 0
        ? (nowRealPrice / lastRealPrice) ** (1 - elasticity)
        : 1;
    let sales = market.annualSales * demandGrowth * incomeFactor * priceFactor;
    for (const id of now)
      if (!before.has(id)) {
        sales +=
          books[id]!.capacity * (newcomers.has(id) ? P.newDemandShare : 1);
        // One of the town's own, first hired into, brings spending the
        // books were not counting: coverage, not new sales.
        if (!newcomers.has(id))
          coverage.set(key, (coverage.get(key) ?? 0) + books[id]!.capacity);
      }
    for (const id of market.members)
      if (!current.has(id))
        sales -= (books[id]?.annualRevenue ?? 0) * P.newDemandShare;
    markets[key] = {
      ...market,
      annualSales: round2(Math.max(0, sales)),
      members: now,
      townJobs,
      townPay,
      averagePay: round2(averagePay),
      priceIndexSeen: economy.priceIndex,
      lastRound: round,
    };
  }

  // A business whose books opened this round records where it started.
  for (const { organizationId, kind } of businesses) {
    const opening = books[organizationId];
    if (!opening || opening.openedAt !== world.currentDate) continue;
    const market = markets[`${town}:${kind}`]!;
    const capacityOfKind = market.members.reduce(
      (sum, id) => sum + books[id]!.capacity,
      0,
    );
    books[organizationId] = {
      ...opening,
      openingShare: round6(
        capacityOfKind > 0 ? opening.capacity / capacityOfKind : 1,
      ),
      openingMarketSales: market.annualSales,
    };
  }

  for (const { organizationId, kind } of businesses) {
    const existing = books[organizationId];
    if (!existing || existing.lastRound === round) continue;
    const quarterPay = pay.get(organizationId) ?? 0;
    const market = markets[`${town}:${kind}`]!;
    // Its sales are its share of what the town spends on its kind: its
    // capacity, weighed by its prices against its rivals'. Nothing is
    // drawn: its sales move with the town's pay, the nation's economy, its
    // prices and its rivals.
    const weightOf = (id: EntityId) =>
      books[id]!.capacity *
      ((prices.get(id) ?? priceLevel) / priceLevel) ** -P.rivalPriceElasticity;
    const weightOfKind = market.members.reduce(
      (sum, id) => sum + weightOf(id),
      0,
    );
    const share =
      weightOfKind > 0 ? weightOf(organizationId) / weightOfKind : 0;
    const annualRevenue = market.annualSales * share;
    // Goods it sells and supplies it uses rise and fall with its sales; the
    // rest (rent, insurance, upkeep) does not (`TOWN_BUSINESS_KIND_BOOKS`).
    const annualOtherCosts = otherCostsAtSales({ ...existing, annualRevenue });
    const interest = (existing.debt * realDebtRatePct) / 400;
    const net =
      annualRevenue / 4 - annualOtherCosts / 4 - quarterPay - interest;
    let cash = existing.cash + net;
    let debt = existing.debt;
    // A business whose bank failed, or that opened before the town's bank
    // kept books, borrows from the town's largest open bank.
    let bankId = existing.bankId;
    if (!bankId || banks[bankId]?.failed)
      bankId = lenderOf(banks, openBanks) ?? bankId;
    const bank = bankId ? banks[bankId] : undefined;
    if (cash < 0) {
      const room = Math.max(0, existing.lineLimit - debt);
      if (lends(bank, economy) && room >= -cash) {
        debt += -cash;
        cash = 0;
      }
    } else if (debt > 0 && cash > 0) {
      const repay = Math.min(debt, cash / 2);
      debt -= repay;
      cash -= repay;
    }
    const next: TownBusinessBooks = {
      ...existing,
      cash: round2(cash),
      debt: round2(debt),
      annualRevenue: round2(annualRevenue),
      ownDemandLog: 0,
      lastQuarterPay: round2(quarterPay),
      price: prices.get(organizationId) ?? round6(priceLevel),
      bankId,
      lastQuarterNet: round2(net),
      lastRound: round,
    };
    books[organizationId] = next;
    if (cash < 0 && !exempt.has(organizationId)) {
      const why = !bank
        ? "no-line"
        : bank.failed
          ? "bank-failed"
          : !lends(bank, economy)
            ? "bank-refused"
            : "line-used-up";
      closing.push({
        organizationId,
        books: next,
        why,
        share,
        marketSales: market.annualSales,
      });
      if (bankId && debt > 0)
        pendingDefaults.set(bankId, (pendingDefaults.get(bankId) ?? 0) + debt);
    }
  }

  // The banks' quarter. A bank loses on its own borrowers: the town's
  // businesses that closed owing it, and the town's households whose
  // earners lost their jobs and have been out of work past the day a loan
  // is charged off. Nothing is drawn, and no national rate is scaled.
  const B = TOWN_FINANCE_POLICY.bank;
  const householdDefaults = townHouseholdDefaults(
    world,
    town,
    bankIds,
    books,
    banks,
  );
  const failing: {
    bankId: EntityId;
    cause: "insolvent" | "depositors-withdrew";
  }[] = [];
  for (const bankId of bankIds) {
    const bank = banks[bankId];
    if (!bank || bank.failed || bank.lastRound === round) continue;
    const businessDefaults = pendingDefaults.get(bankId) ?? 0;
    const households = householdDefaults.get(bankId) ?? {
      personIds: [],
      owed: 0,
    };
    const defaulted = businessDefaults + households.owed;
    const losses = defaulted * MACRO_CREDIT_POLICY.chargeOff.lossGivenDefault;
    const earnings = (bank.loans * MACRO_CREDIT_POLICY.bank.earningsRate) / 4;
    let capital = bank.capital + earnings - losses;
    const businessLoans = Object.values(books)
      .filter((row) => row.bankId === bankId && !pendingClosed(closing, row))
      .reduce((sum, row) => sum + row.debt, 0);
    const lending = lends(bank, economy);
    let loans = bank.loans - defaulted;
    if (lending)
      loans *= Math.exp(
        (economy.lendingGrowthPct - economy.inflationPct - economy.trendPct) /
          400,
      );
    loans = Math.max(0, loans);
    let deposits = bank.deposits * demandGrowth;
    let liquid =
      bank.liquid +
      (deposits - bank.deposits) +
      (bank.shape.cushion * deposits - bank.liquid) *
        B.cushionRebuildPerQuarter;
    let runAt = bank.runAt;
    let cause: "insolvent" | "depositors-withdrew" | null = null;
    const assets = Math.max(0, liquid) + loans;
    const ratio = assets > 0 ? capital / assets : 0;
    if (ratio < B.frightCapitalRatio && runAt === null) {
      // Its losses show in its public report; the uninsured leave at once.
      const withdrawals = deposits * B.uninsuredShare;
      runAt = world.currentDate;
      if (withdrawals > liquid) cause = "depositors-withdrew";
      deposits -= withdrawals;
      liquid -= withdrawals;
    }
    if (cause === null && ratio <= B.criticalCapitalRatio) cause = "insolvent";
    capital = round2(capital);
    banks[bankId] = {
      ...bank,
      deposits: round2(Math.max(0, deposits)),
      liquid: round2(liquid),
      loans: round2(loans),
      capital,
      businessLoans: round2(businessLoans),
      lastQuarterLosses: round2(losses),
      lastQuarterDefaults: {
        businesses: round2(businessDefaults),
        households: households.personIds.length,
        householdsOwed: round2(households.owed),
      },
      chargedOff: [...(bank.chargedOff ?? []), ...households.personIds],
      runAt,
      lastRound: round,
    };
    if (cause) failing.push({ bankId, cause });
  }

  const taxableSales = { ...(store.taxableSales ?? {}) };
  const salesThen = [...taxableBefore.values()].reduce((a, b) => a + b, 0);
  const salesNow = [...taxableBefore.keys()].reduce(
    (sum, key) =>
      sum + (markets[key]?.annualSales ?? 0) - (coverage.get(key) ?? 0),
    0,
  );
  if (taxableSales[town] === undefined) {
    if (Object.values(markets).some((market) => market.town === town))
      taxableSales[town] = 1;
  } else if (salesThen > 0)
    taxableSales[town] = round6((taxableSales[town]! * salesNow) / salesThen);

  let next: World = {
    ...world,
    townFinances: {
      version: TOWN_FINANCES_VERSION,
      businesses: books,
      banks,
      markets,
      basePriceIndex,
      taxableSales,
    },
  };
  for (const { bankId, cause } of failing)
    next = failTownBank(next, town, bankId, cause);
  return { world: next, closing };
}

function pendingClosed(
  closing: TownFinanceQuarter["closing"],
  row: TownBusinessBooks,
): boolean {
  return closing.some((entry) => entry.organizationId === row.organizationId);
}

const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

function activeJobsAt(
  world: World,
  organizationId: EntityId,
): { relationshipId: EntityId; status: WorkStatusRecord }[] {
  const ours = new Set(
    world.history.workRelationships
      .filter((row) => row.organizationId === organizationId)
      .map((row) => row.id),
  );
  const latest = new Map<EntityId, WorkStatusRecord>();
  for (const status of world.history.workStatuses)
    if (
      ours.has(status.workRelationshipId) &&
      status.effectiveAt <= world.currentDate
    )
      latest.set(status.workRelationshipId, status);
  return [...latest]
    .filter(([, status]) => status.status === "active")
    .map(([relationshipId, status]) => ({ relationshipId, status }));
}

function closeOrganization(
  world: World,
  organizationId: EntityId,
  stableKey: string,
  reason: string,
  jobReason: string,
): { world: World; jobsLost: number } {
  const provenance = {
    kind: "generated" as const,
    generatorKey: TOWN_FINANCES_VERSION,
  };
  const profile = organizationProfileAt(world, organizationId)!;
  let next = recordOrganizationProfile(world, {
    stableKey: `${stableKey}:closed`,
    organizationId,
    effectiveAt: world.currentDate,
    name: profile.name,
    classification: profile.classification,
    locationJurisdictionId: profile.locationJurisdictionId,
    provenance,
    supersedesProfileId: profile.id,
    closed: { reason },
  });
  const jobs = activeJobsAt(next, organizationId);
  for (const job of jobs)
    next = recordWorkStatus(next, {
      stableKey: `${stableKey}:job-ended:${job.relationshipId}`,
      workRelationshipId: job.relationshipId,
      effectiveAt: next.currentDate,
      status: "ended",
      reason: jobReason,
      supersedesStatusId: job.status.id,
      provenance,
    });
  return { world: next, jobsLost: jobs.length };
}

/**
 * Closes a business nobody works at any more: whoever ran it retired, died
 * or left, and nobody took their place. Its closing names who left last and
 * why, and records `ownerRetired` when they retired or died.
 */
export function closeBusinessWithNobodyLeft(
  world: World,
  town: EntityId,
  organizationId: EntityId,
  prefix: string,
  closingReasons: {
    readonly ownerRetired: string;
    readonly nobodyLeft: string;
  },
): World {
  const latest = new Map<EntityId, WorkStatusRecord>();
  for (const status of world.history.workStatuses)
    if (status.effectiveAt <= world.currentDate)
      latest.set(status.workRelationshipId, status);
  const [last] = world.history.workRelationships
    .filter((row) => row.organizationId === organizationId)
    .map((row) => ({ row, status: latest.get(row.id) }))
    .filter(({ status }) => status?.status === "ended")
    .sort(
      (a, b) =>
        b.status!.effectiveAt.localeCompare(a.status!.effectiveAt) ||
        a.row.id.localeCompare(b.row.id),
    );
  const why = last?.status?.reason ?? null;
  const retired =
    why === TOWN_JOB_END_REASONS.retired || why === TOWN_JOB_END_REASONS.died;
  const stableKey = `${prefix}close:${organizationId}`;
  const name =
    organizationProfileAt(world, organizationId)?.name ?? "A business";
  const closed = closeOrganization(
    world,
    organizationId,
    stableKey,
    retired ? closingReasons.ownerRetired : closingReasons.nobodyLeft,
    TOWN_JOB_END_REASONS.businessClosed,
  );
  const person = last ? world.people[last.row.personId] : undefined;
  const who = person ? `${person.givenName} ${person.familyName}` : null;
  const left =
    why === TOWN_JOB_END_REASONS.retired
      ? "retired"
      : why === TOWN_JOB_END_REASONS.died
        ? "died"
        : why === "labor:moved-away"
          ? "moved away"
          : "left";
  return recordWorldEvent(closed.world, {
    stableKey: `${stableKey}:event`,
    type: BUSINESS_CLOSED_EVENT,
    occurredAt: closed.world.currentDate,
    recordedAt: closed.world.currentDate,
    jurisdictionId: town,
    involvedEntityIds: [organizationId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      TOWN_FINANCES_VERSION,
      `cause:${retired ? "owner-retired" : "nobody-left"}`,
      `organization:${organizationId}`,
      ...(why ? [`last-left:${why}`] : []),
    ],
    summary: who
      ? `${name} closed: nobody was left to run it after ${who} ${left}.`
      : `${name} closed: nobody was left to run it.`,
    context: CONTEXT,
  });
}

/**
 * What each bank's household borrowers owe that is charged off this
 * quarter. GAME ASSUMPTION: the part of a bank's loans that is not to the
 * town's businesses is lent to the town's households, an equal part to each
 * worker; a worker banks where their last employer banks, else at the
 * town's first bank. A borrower whose last town job ended in a layoff or a
 * closing, and who has held no job since, pays while unemployment benefits
 * last; once they run out and the loan is past the charge-off day, the
 * borrower defaults on their part, once.
 */
function townHouseholdDefaults(
  world: World,
  town: EntityId,
  bankIds: readonly EntityId[],
  books: Readonly<Record<EntityId, TownBusinessBooks>>,
  banks: Readonly<Record<EntityId, TownBankBooks>>,
): Map<EntityId, { personIds: EntityId[]; owed: number }> {
  const result = new Map<EntityId, { personIds: EntityId[]; owed: number }>();
  const open = bankIds.filter((id) => banks[id] && !banks[id]!.failed);
  if (open.length === 0) return result;
  const today = world.currentDate;
  const dueBy = addDays(
    today,
    -(
      TOWN_FINANCE_POLICY.bank.unemploymentBenefitDays +
      TOWN_FINANCE_POLICY.bank.chargeOffDaysPastDue
    ),
  );
  const stem = `${TOWN_EMPLOYMENT_VERSION}:${town}:job:`;
  const latest = new Map<EntityId, WorkStatusRecord>();
  for (const row of world.history.workStatuses)
    if (row.effectiveAt <= today) latest.set(row.workRelationshipId, row);
  const working = new Set<EntityId>();
  const lastLost = new Map<
    EntityId,
    { at: IsoDate; organizationId: EntityId | null }
  >();
  for (const row of world.history.workRelationships) {
    const status = latest.get(row.id);
    if (!status) continue;
    if (status.status === "active") {
      working.add(row.personId);
      continue;
    }
    if (
      !row.stableKey.startsWith(stem) ||
      (status.reason !== TOWN_JOB_END_REASONS.laidOff &&
        status.reason !== TOWN_JOB_END_REASONS.businessClosed)
    )
      continue;
    const before = lastLost.get(row.personId);
    if (!before || before.at < status.effectiveAt)
      lastLost.set(row.personId, {
        at: status.effectiveAt,
        organizationId: row.organizationId,
      });
  }
  const charged = new Set(open.flatMap((id) => banks[id]!.chargedOff ?? []));
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  const borrowers = activeTownJobs(world, town).length;
  const defaulting = [...lastLost]
    .filter(
      ([personId, lost]) =>
        !working.has(personId) &&
        !charged.has(personId) &&
        !dead.has(personId) &&
        world.people[personId]?.homeJurisdictionId === town &&
        lost.at <= dueBy,
    )
    .sort(([a], [b]) => a.localeCompare(b));
  const everyone = borrowers + defaulting.length;
  if (everyone === 0) return result;
  for (const [personId, lost] of defaulting) {
    const lender =
      (lost.organizationId && books[lost.organizationId]?.bankId) || open[0]!;
    const bankId = open.includes(lender) ? lender : open[0]!;
    const bank = banks[bankId]!;
    const householdLoans = Math.max(0, bank.loans - bank.businessLoans);
    const entry = result.get(bankId) ?? { personIds: [], owed: 0 };
    entry.personIds.push(personId);
    entry.owed += householdLoans / everyone;
    result.set(bankId, entry);
  }
  return result;
}

function lossesSentence(bank: TownBankBooks): string {
  const d = bank.lastQuarterDefaults;
  const parts: string[] = [];
  if (d && d.households > 0)
    parts.push(
      `${d.households} ${d.households === 1 ? "household" : "households"} whose earners had been out of work past their unemployment benefits owed it ${formatDollars(d.householdsOwed)}`,
    );
  if (d && d.businesses > 0)
    parts.push(`businesses that closed owed it ${formatDollars(d.businesses)}`);
  return parts.length > 0
    ? `It lost ${formatDollars(bank.lastQuarterLosses)} on loans last quarter: ${parts.join(", and ")}.`
    : `It lost ${formatDollars(bank.lastQuarterLosses)} on loans last quarter.`;
}

function failTownBank(
  world: World,
  town: EntityId,
  bankId: EntityId,
  cause: "insolvent" | "depositors-withdrew",
): World {
  const bank = world.townFinances!.banks[bankId]!;
  const townJobs = activeTownJobs(world, town).length;
  const name = organizationProfileAt(world, bankId)?.name ?? "The town's bank";
  const stableKey = `${TOWN_FINANCES_VERSION}:${town}:bank-failed:${bankId}`;
  const closed = closeOrganization(
    world,
    bankId,
    stableKey,
    TOWN_FINANCE_CLOSING_REASONS.bankFailed,
    TOWN_BANK_JOB_END_REASON,
  );
  const ratio = capitalRatio(bank);
  const why =
    cause === "depositors-withdrew"
      ? `Its losses left capital of ${(ratio * 100).toFixed(1)} percent of its assets, depositors without insurance asked for more than the ${formatDollars(Math.max(0, bank.liquid + bank.deposits * TOWN_FINANCE_POLICY.bank.uninsuredShare))} it could pay out, and it could not pay them.`
      : `Its losses left capital of ${(ratio * 100).toFixed(1)} percent of its assets, and regulators closed it as the law requires below 2 percent.`;
  const summary = [
    `${name} failed.`,
    why,
    lossesSentence(bank),
    closed.jobsLost
      ? `${closed.jobsLost} people who worked there lost their jobs.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  let next = recordWorldEvent(closed.world, {
    stableKey,
    type: BANK_FAILED_EVENT,
    occurredAt: closed.world.currentDate,
    recordedAt: closed.world.currentDate,
    jurisdictionId: town,
    involvedEntityIds: [bankId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      TOWN_FINANCES_VERSION,
      `cause:${cause}`,
      `organization:${bankId}`,
      `capital-ratio:${round6(ratio)}`,
      `losses:${bank.lastQuarterLosses}`,
      `household-defaults:${bank.lastQuarterDefaults?.households ?? 0}`,
      `business-defaults:${bank.lastQuarterDefaults?.businesses ?? 0}`,
      `jobs:${closed.jobsLost}`,
      `town-jobs:${townJobs}`,
      `shape:${bank.shape.state ?? "national"}:${bank.shape.index}:${FDIC_SMALL_BANK_REPORT_DATE}`,
    ],
    summary,
    context: CONTEXT,
  });
  const eventId = next.history.events.at(-1)!.id;
  const store = next.townFinances!;
  next = {
    ...next,
    townFinances: {
      ...store,
      banks: {
        ...store.banks,
        [bankId]: {
          ...store.banks[bankId]!,
          failed: { at: next.currentDate, eventId, cause },
        },
      },
    },
  };
  return next;
}

const percent = (share: number) => `${Math.round(share * 100)}%`;

/** What the town calls businesses of one kind, for a closing's record. */
const KIND_NAMES: Readonly<Record<string, string>> = {
  farm: "farms",
  quarry: "quarries",
  construction: "builders",
  manufacturing: "factories",
  wholesale: "wholesalers",
  retail: "stores",
  trucking: "trucking firms",
  information: "media and tech firms",
  insurance: "insurance agencies",
  realty: "real estate offices",
  professional: "professional offices",
  "building-services": "building services firms",
  "private-school": "private schools",
  clinic: "clinics",
  "care-home": "care homes",
  recreation: "recreation businesses",
  restaurant: "restaurants",
  inn: "inns",
  repair: "repair shops",
  "personal-care": "salons and barbershops",
};

function kindPlural(kind: string): string {
  return KIND_NAMES[kind] ?? "businesses like it";
}

/**
 * Closes the businesses whose books say they cannot go on, each with an
 * event naming why, and ends their staff's jobs.
 */
export function closeBusinessesOutOfCash(
  world: World,
  town: EntityId,
  closing: TownFinanceQuarter["closing"],
  prefix: string,
): World {
  let next = world;
  const townJobs = activeTownJobs(world, town).length;
  for (const { organizationId, books, why, share, marketSales } of closing) {
    const name =
      organizationProfileAt(next, organizationId)?.name ?? "A business";
    const stableKey = `${prefix}close:${organizationId}`;
    const closed = closeOrganization(
      next,
      organizationId,
      stableKey,
      TOWN_FINANCE_CLOSING_REASONS.ranOutOfCash,
      TOWN_JOB_END_REASONS.businessClosed,
    );
    const bankName = books.bankId
      ? (organizationProfileAt(next, books.bankId)?.name ?? "its bank")
      : null;
    const credit =
      why === "no-line"
        ? "It had no bank to borrow from."
        : why === "bank-failed"
          ? `${bankName} had failed.`
          : why === "bank-refused"
            ? `${bankName} was making no new loans.`
            : `It had used up its ${formatDollars(books.lineLimit)} line of credit at ${bankName}.`;
    // What moved its sales since it opened, largest first.
    const spending = marketSales / Math.max(1, books.openingMarketSales) - 1;
    // Pay when its books opened: capacity less its margin less its other
    // costs.
    const openingQuarterPay =
      (books.capacity * (1 - books.margin) - books.annualOtherCosts) / 4;
    const payRose =
      books.lastQuarterPay !== undefined && openingQuarterPay > 0
        ? books.lastQuarterPay / openingQuarterPay - 1
        : 0;
    const causes = [
      {
        tag: "competition",
        size: share / Math.max(1e-9, books.openingShare) - 1,
        text: `Other ${kindPlural(books.kind)} in town took its customers: its share of the town's spending on them fell from ${percent(books.openingShare)} to ${percent(share)}.`,
      },
      {
        tag: "town-spending",
        size: spending,
        text: `The town spent ${percent(-spending)} less on ${kindPlural(books.kind)} than when it opened.`,
      },
      {
        tag: "pay-rose",
        size: -payRose,
        text: `Its pay bill had risen ${percent(payRose)} since it opened.`,
      },
    ]
      .filter((cause) => cause.size < -0.03)
      .sort((a, b) => a.size - b.size);
    const summary = [
      `${name} closed after its cash ran out: it spent ${formatDollars(-books.lastQuarterNet)} more than it took in last quarter.`,
      ...causes.map((cause) => cause.text),
      causes.length > 0
        ? ""
        : books.margin <= 0
          ? "It never took in enough to cover its costs."
          : "Its pay and other costs had come to outrun its sales.",
      credit,
      closed.jobsLost
        ? `${closed.jobsLost} ${closed.jobsLost === 1 ? "person" : "people"} lost ${closed.jobsLost === 1 ? "a job" : "their jobs"}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    next = recordWorldEvent(closed.world, {
      stableKey: `${stableKey}:event`,
      type: BUSINESS_CLOSED_EVENT,
      occurredAt: closed.world.currentDate,
      recordedAt: closed.world.currentDate,
      jurisdictionId: town,
      involvedEntityIds: [organizationId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        TOWN_FINANCES_VERSION,
        "cause:ran-out-of-cash",
        ...causes.map((cause) => `sales-fell:${cause.tag}`),
        `credit:${why}`,
        `kind:${books.kind}`,
        `organization:${organizationId}`,
        `jobs:${closed.jobsLost}`,
        `town-jobs:${townJobs}`,
        `debt:${books.debt}`,
        ...(books.bankId ? [`bank:${books.bankId}`] : []),
      ],
      summary,
      context: CONTEXT,
    });
  }
  return next;
}

/** The books name only recorded organizations and events, with finite values. */
export function assertTownFinanceIntegrity(world: World): void {
  const store = world.townFinances;
  if (!store) return;
  if (store.version !== TOWN_FINANCES_VERSION)
    throw new Error("Unknown town finances version.");
  const organizations = new Set<string>(
    world.history.organizations.map((row) => row.id),
  );
  const finite = (...values: number[]) => {
    if (values.some((value) => !Number.isFinite(value)))
      throw new Error("Town books must hold finite numbers.");
  };
  for (const [id, books] of Object.entries(store.businesses)) {
    if (id !== books.organizationId || !organizations.has(id))
      throw new Error(`Town books name an unknown business: ${id}`);
    if (books.bankId && !organizations.has(books.bankId))
      throw new Error(`Town books name an unknown bank: ${books.bankId}`);
    finite(books.cash, books.debt, books.annualRevenue, books.capacity);
    if (books.debt < 0 || books.capacity < 0)
      throw new Error(`Town books hold a negative debt or capacity: ${id}`);
  }
  for (const [id, bank] of Object.entries(store.banks)) {
    if (id !== bank.organizationId || !organizations.has(id))
      throw new Error(`Town books name an unknown bank: ${id}`);
    finite(bank.deposits, bank.liquid, bank.loans, bank.capital);
    if (
      bank.failed &&
      !world.history.events.some((event) => event.id === bank.failed!.eventId)
    )
      throw new Error(`A failed town bank cites no recorded failure: ${id}`);
  }
  for (const [key, market] of Object.entries(store.markets)) {
    if (key !== `${market.town}:${market.kind}`)
      throw new Error(`A town market is filed under the wrong key: ${key}`);
    finite(market.annualSales);
    for (const id of market.members)
      if (store.businesses[id]?.kind !== market.kind)
        throw new Error(
          `A town market names a business of another kind: ${id}`,
        );
  }
}
