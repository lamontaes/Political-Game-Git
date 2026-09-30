import type { EntityId, IsoDate } from "../types";

/** Recorded when a town business closes because its cash ran out. */
export const BUSINESS_CLOSED_EVENT = "economy.business-closed";
/** Recorded when a town bank fails. */
export const BANK_FAILED_EVENT = "economy.bank-failed";

/** One business's books, in dollars (Build 19, `town-finances.ts`). */
export interface TownBusinessBooks {
  readonly organizationId: EntityId;
  readonly openedAt: IsoDate;
  /** Cash on hand; below zero with no credit left, the business closes. */
  readonly cash: number;
  /** Drawn on its line at its bank. */
  readonly debt: number;
  /** What it takes in a year, in constant dollars: its share of its market. */
  readonly annualRevenue: number;
  /** The kind of business, which names the market it sells in. */
  readonly kind: string;
  /**
   * What it could sell with its staff, set from its pay when its books
   * opened. Its share of its market is its capacity over the capacity of
   * every open business of its kind in town.
   */
  readonly capacity: number;
  /**
   * Rent, supplies and everything but pay, a year, at its capacity. The
   * share of it that follows sales for its kind shrinks and grows with its
   * sales each quarter.
   */
  readonly annualOtherCosts: number;
  /** Its own margin when its books were opened, a share of revenue. */
  readonly margin: number;
  /**
   * Retired: its customers once drifted by a draw each quarter. Kept so
   * older saves load; always zero once a quarter runs.
   */
  readonly ownDemandLog: number;
  /** Its share of its market's capacity, and the market's sales, when it opened. */
  readonly openingShare: number;
  readonly openingMarketSales: number;
  readonly bankId: EntityId | null;
  readonly lineLimit: number;
  /** Cash in less cash out over its last quarter. */
  readonly lastQuarterNet: number;
  /** Its pay over its last quarter; absent in books from older saves. */
  readonly lastQuarterPay?: number;
  /**
   * Its prices, in current dollars, as an index: the nation's price level
   * since the books began when it opened, then moved each quarter by its
   * costs and its customers. Absent in books from older saves.
   */
  readonly price?: number;
  readonly lastRound: string;
}

/** One town bank's books, in dollars. */
export interface TownBankBooks {
  readonly organizationId: EntityId;
  readonly openedAt: IsoDate;
  /** The real bank whose shape it took, from the FDIC June 2026 reports. */
  readonly shape: {
    readonly state: string | null;
    readonly index: number;
    readonly cushion: number;
    readonly otherAssets: number;
  };
  readonly deposits: number;
  /** Cash, free securities and overnight loans: what it can pay out. */
  readonly liquid: number;
  readonly loans: number;
  readonly capital: number;
  /** Owed to it by the town's businesses, part of `loans`. */
  readonly businessLoans: number;
  /** Losses booked last quarter. */
  readonly lastQuarterLosses: number;
  /**
   * What defaulted last quarter: owed by businesses that closed, and the
   * number of households charged off and what they owed. Absent in older
   * saves.
   */
  readonly lastQuarterDefaults?: {
    readonly businesses: number;
    readonly households: number;
    readonly householdsOwed: number;
  };
  /** Household borrowers already charged off, once each. */
  readonly chargedOff?: readonly EntityId[];
  /** Set once depositors have pulled out after bad news. */
  readonly runAt: IsoDate | null;
  readonly failed: {
    readonly at: IsoDate;
    readonly eventId: EntityId;
    readonly cause: "insolvent" | "depositors-withdrew";
  } | null;
  readonly lastRound: string;
}

/**
 * What the town spends in a year on one kind of business, in constant
 * dollars, shared among the open businesses of that kind.
 */
export interface TownMarketBooks {
  readonly town: EntityId;
  readonly kind: string;
  readonly openedAt: IsoDate;
  readonly annualSales: number;
  /** Annual guest spending already included from the public-land law; removed before chaining resident demand. */
  readonly publicLandVisitorSales?: number;
  /** The businesses whose books shared it last quarter. */
  readonly members: readonly EntityId[];
  /** Town jobs held when it was last read. */
  readonly townJobs: number;
  /**
   * What every employer in town paid, a year, when it was last read: local
   * spending follows it. Absent in books from older saves.
   */
  readonly townPay?: number;
  /** What a job in town paid a year on average, in current dollars. */
  readonly averagePay?: number;
  /** The nation's price index when it was last read. */
  readonly priceIndexSeen?: number;
  readonly lastRound: string;
}

export interface TownFinanceStore {
  readonly version: "town-finances-v1";
  readonly businesses: Readonly<Record<EntityId, TownBusinessBooks>>;
  readonly banks: Readonly<Record<EntityId, TownBankBooks>>;
  /** Keyed `<town id>:<kind>`. */
  readonly markets: Readonly<Record<string, TownMarketBooks>>;
  /**
   * The nation's price index when the books began: the books run in its
   * dollars. Absent in older saves until their next quarter.
   */
  readonly basePriceIndex?: number;
  /**
   * Each town's taxable sales, chained quarter to quarter over the markets
   * it already had, in the books' dollars (1 when first read): a kind whose
   * first business opens its books adds coverage, not sales, so it joins
   * the chain the quarter after. Absent in older saves.
   */
  readonly taxableSales?: Readonly<Record<EntityId, number>>;
}
