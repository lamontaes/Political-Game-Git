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
  /** The businesses whose books shared it last quarter. */
  readonly members: readonly EntityId[];
  /** Town jobs held when it was last read. */
  readonly townJobs: number;
  /**
   * What every employer in town paid, a year, when it was last read: local
   * spending follows it. Absent in books from older saves.
   */
  readonly townPay?: number;
  readonly lastRound: string;
}

export interface TownFinanceStore {
  readonly version: "town-finances-v1";
  readonly businesses: Readonly<Record<EntityId, TownBusinessBooks>>;
  readonly banks: Readonly<Record<EntityId, TownBankBooks>>;
  /** Keyed `<town id>:<kind>`. */
  readonly markets: Readonly<Record<string, TownMarketBooks>>;
}
