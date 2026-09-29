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
import { macroScopeForJurisdiction } from "../macro-economy/readers";
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
    /** PLACEHOLDER: margins when books open, a share of revenue. */
    marginMean: 0.06,
    marginSd: 0.06,
    /** PLACEHOLDER: a line of credit up to this share of a year's revenue. */
    creditLineShareOfRevenue: 0.1,
    /**
     * PLACEHOLDER: how much of a business's revenue follows the number of
     * jobs held in town (the rest comes from outside or does not follow).
     */
    localDemandShare: 0.5,
    /**
     * PLACEHOLDER: the share of a new business's sales that is new spending
     * in town; the rest it takes from the businesses of its kind already
     * there. The same share of a closed business's sales leaves town with
     * it; the rest goes to the ones that stay.
     */
    newDemandShare: 0.5,
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
    /** PLACEHOLDER: the most the town's unemployment scales its losses. */
    localLossFactorMax: 3,
  },
} as const;

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

/** Pay each organization sent between `since` (exclusive) and today. */
function payBetween(
  world: World,
  organizations: ReadonlySet<EntityId>,
  since: IsoDate,
): Map<EntityId, number> {
  const flowOrg = new Map<EntityId, EntityId>();
  for (const flow of world.history.resourceFlows)
    if (
      flow.basisKind === "compensation:work" &&
      flow.source.kind === "organization" &&
      organizations.has(flow.source.organizationId)
    )
      flowOrg.set(flow.id, flow.source.organizationId);
  const pay = new Map<EntityId, number>();
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
    const organizationId = flowOrg.get(outcome.resourceFlowId);
    if (!organizationId) continue;
    pay.set(
      organizationId,
      (pay.get(organizationId) ?? 0) + dollars(outcome.transferredAmount),
    );
  }
  return pay;
}

interface Economy {
  /**
   * Growth over its trend, percent a year: the town's own when it has
   * recorded months, else the nation's. The books run in constant dollars
   * at today's productivity, because game pay follows neither prices nor
   * the trend; what moves sales is the swing around the trend.
   */
  readonly growthGapPct: number;
  readonly trendPct: number;
  readonly inflationPct: number;
  readonly chargeOffPct: number;
  readonly debtRatePct: number;
  readonly lendingGrowthPct: number;
  readonly tightness: number;
  readonly nationalUnemploymentPct: number | null;
}

/** The last three recorded months: national, and the town's own if any. */
function economyOf(world: World, town: EntityId): Economy | null {
  const months = world.macroEconomy?.months ?? [];
  const national = months
    .filter(
      (month) =>
        month.scope === "national" && month.recordedAt <= world.currentDate,
    )
    .slice(-3);
  if (national.length === 0) return null;
  const scope = macroScopeForJurisdiction(town);
  const local = months
    .filter(
      (month) => month.scope === scope && month.recordedAt <= world.currentDate,
    )
    .slice(-3);
  const mean = (values: readonly number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const growth = mean(
    (local.length ? local : national).map((m) => m.growthPct),
  );
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
  };
}

/** The share of the town's labor force out of work, from its residents. */
export type TownUnemploymentReader = (
  world: World,
  town: EntityId,
) => number | null;

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
  const margin = P.marginMean + P.marginSd * standardNormal(rng.fork("margin"));
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
    bankId,
    lineLimit: round2(annualRevenue * P.creditLineShareOfRevenue),
    lastQuarterNet: 0,
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
  }[],
  exempt: ReadonlySet<EntityId>,
  round: string,
  townUnemploymentPct: number | null,
): TownFinanceQuarter {
  const economy = economyOf(world, town);
  if (!economy) return { world, closing: [] };
  const store: TownFinanceStore = world.townFinances ?? {
    version: TOWN_FINANCES_VERSION,
    businesses: {},
    banks: {},
    markets: {},
  };
  const bankIds = townBanks(world, town);
  const all = new Set<EntityId>([
    ...businesses.map((row) => row.organizationId),
    ...bankIds,
  ]);
  // The quarterly review runs every 91 days.
  const since = addDays(world.currentDate, -91);
  const pay = payBetween(world, all, since);
  const townJobs = activeTownJobs(world, town).length;
  const banks: Record<EntityId, TownBankBooks> = { ...store.banks };
  const yearlyTownPay =
    [...pay.values()].reduce((sum, value) => sum + value, 0) * 4;
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
    const bankId = openBanks.length
      ? openBanks[
          new SeededRng(world.seed)
            .fork(`${TOWN_FINANCES_VERSION}:lender:${organizationId}`)
            .integer(0, openBanks.length)
        ]!
      : null;
    books[organizationId] = openBusinessBooks(
      world,
      organizationId,
      kind,
      quarterPay,
      bankId,
      round,
    );
  }

  // Each kind of business shares one market. A newcomer brings some new
  // spending and takes the rest from the others; a closing takes some
  // spending out of town and leaves the rest to the others.
  const members = new Map<string, EntityId[]>();
  for (const { organizationId, kind } of businesses)
    if (books[organizationId])
      members.set(kind, [...(members.get(kind) ?? []), organizationId]);
  const kinds = new Set(members.keys());
  for (const market of Object.values(markets))
    if (market.town === town) kinds.add(market.kind);
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
        lastRound: round,
      };
      continue;
    }
    if (market.lastRound === round) continue;
    const before = new Set(market.members);
    const current = new Set(now);
    const jobsFactor =
      market.townJobs > 0 && townJobs > 0
        ? (townJobs / market.townJobs) ** P.localDemandShare
        : 1;
    let sales = market.annualSales * demandGrowth * jobsFactor;
    for (const id of now)
      if (!before.has(id))
        sales +=
          books[id]!.capacity *
          ((formedAt.get(id) ?? market.openedAt) > market.openedAt
            ? P.newDemandShare
            : 1);
    for (const id of market.members)
      if (!current.has(id))
        sales -= (books[id]?.annualRevenue ?? 0) * P.newDemandShare;
    markets[key] = {
      ...market,
      annualSales: round2(Math.max(0, sales)),
      members: now,
      townJobs,
      lastRound: round,
    };
  }

  for (const { organizationId, kind } of businesses) {
    const existing = books[organizationId];
    if (!existing || existing.lastRound === round) continue;
    const quarterPay = pay.get(organizationId) ?? 0;
    const market = markets[`${town}:${kind}`]!;
    const capacityOfKind = market.members.reduce(
      (sum, id) => sum + books[id]!.capacity,
      0,
    );
    const annualRevenue =
      capacityOfKind > 0
        ? (market.annualSales * existing.capacity) / capacityOfKind
        : 0;
    const annualOtherCosts = existing.annualOtherCosts;
    const interest = (existing.debt * realDebtRatePct) / 400;
    const net =
      annualRevenue / 4 - annualOtherCosts / 4 - quarterPay - interest;
    let cash = existing.cash + net;
    let debt = existing.debt;
    // A business whose bank failed borrows from another open one.
    let bankId = existing.bankId;
    if (bankId && banks[bankId]?.failed && openBanks.length)
      bankId = openBanks[0]!;
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
      closing.push({ organizationId, books: next, why });
      if (bankId && debt > 0)
        pendingDefaults.set(bankId, (pendingDefaults.get(bankId) ?? 0) + debt);
    }
  }

  // The banks' quarter.
  const B = TOWN_FINANCE_POLICY.bank;
  const national = economy.nationalUnemploymentPct;
  const localFactor =
    townUnemploymentPct !== null && national !== null && national > 0
      ? Math.min(
          B.localLossFactorMax,
          Math.max(0.5, townUnemploymentPct / national),
        )
      : 1;
  const failing: {
    bankId: EntityId;
    cause: "insolvent" | "depositors-withdrew";
  }[] = [];
  for (const bankId of bankIds) {
    const bank = banks[bankId];
    if (!bank || bank.failed || bank.lastRound === round) continue;
    const lossRate = ((economy.chargeOffPct / 100) * localFactor) / 4;
    const defaults =
      (pendingDefaults.get(bankId) ?? 0) *
      MACRO_CREDIT_POLICY.chargeOff.lossGivenDefault;
    const losses = bank.loans * lossRate + defaults;
    const earnings = (bank.loans * MACRO_CREDIT_POLICY.bank.earningsRate) / 4;
    let capital = bank.capital + earnings - losses;
    const businessLoans = Object.values(books)
      .filter((row) => row.bankId === bankId && !pendingClosed(closing, row))
      .reduce((sum, row) => sum + row.debt, 0);
    const lending = lends(bank, economy);
    let loans = bank.loans * (1 - lossRate) - defaults;
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
      runAt,
      lastRound: round,
    };
    if (cause) failing.push({ bankId, cause });
  }

  let next: World = {
    ...world,
    townFinances: {
      version: TOWN_FINANCES_VERSION,
      businesses: books,
      banks,
      markets,
    },
  };
  for (const { bankId, cause } of failing)
    next = failTownBank(next, town, bankId, cause, localFactor, economy);
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

function failTownBank(
  world: World,
  town: EntityId,
  bankId: EntityId,
  cause: "insolvent" | "depositors-withdrew",
  localFactor: number,
  economy: Economy,
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
    `It lost ${formatDollars(bank.lastQuarterLosses)} on loans last quarter, while lenders nationwide were writing off ${economy.chargeOffPct.toFixed(1)} percent of loans a year${localFactor > 1.05 ? ` and the town's unemployment ran ${localFactor.toFixed(1)} times the nation's` : ""}.`,
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
      `local-loss-factor:${round6(localFactor)}`,
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
  for (const { organizationId, books, why } of closing) {
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
    const summary = [
      `${name} closed after its cash ran out: it spent ${formatDollars(-books.lastQuarterNet)} more than it took in last quarter.`,
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
        `credit:${why}`,
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
