/**
 * Each place's home price level, kept on its housing `stock` row and stepped
 * once a month by the housing review (the rule is in housing-prices.ts). A
 * home's value anywhere in the game is its value when valued times the
 * place's level now over its level then (`homeValueAt`).
 */
import {
  homeValueAt,
  stepLogLevel,
  type PriceStepInputs,
} from "./housing-prices";
import { pastLogLevel, pastRecent, pricePathTo } from "./housing-price-path";
import type { CoreAPI } from "./types";

const HOUSING = "housing";
const stock = (api: CoreAPI) => api.moduleState(HOUSING).table("stock");

/** What one month's step read, kept on the stock row for Trace. */
export interface PriceRead extends PriceStepInputs {
  readonly month: string;
  /** Households that bought this month (counted ones by their weight). */
  readonly buyers: number;
  /** Homes sold this month plus new homes finished for sale. */
  readonly offered: number;
  /** Homes owned in the place. */
  readonly owned: number;
  /** The town's median monthly pay read this month, before smoothing (0 where it has no jobs). */
  readonly townPayMinor: number;
  /** The macro month the rate came from, if any. */
  readonly rateRecordId: string | null;
  /** The outcome web's factor on home values this month, and its month row. */
  readonly webFactor: number;
  readonly webRecordId: string | null;
}

/** The price fields on a place's stock row. */
export interface PriceLevelFields {
  /** The level, relative, in logs (the rule's state). */
  priceLogLevel: number;
  /** The last 13 months' log levels, oldest first (momentum reads the year's change). */
  priceRecent: number[];
  /** Money per unit of relative level: set once so the level at the ACS value date is the ACS median. */
  priceScaleMinor: number;
  /** The typical home's value today: scale times the level times the web's factor. */
  priceLevelMinor: number;
  /** The level the opening valued its homes at. */
  openingPriceLevelMinor: number;
  /** The town's pay, smoothed over a year, and its value on day one (the pay index's base). */
  pricePaySmoothedMinor: number;
  pricePayAtStartMinor: number;
  /** The economy's pay on day one, for a town without jobs of its own. */
  priceEconomyPayAtStart: number;
  /** This month's buyers and homes offered, so far. */
  priceBuyers: number;
  priceOffered: number;
  priceRead?: PriceRead;
}

type StockWithPrice = Partial<PriceLevelFields> & { id: string };

/**
 * Sets a place's level on day one: the world's path to day one, scaled so the
 * level at the census's value date is the census median there.
 */
export function openPriceLevel(
  api: CoreAPI,
  placeId: string,
  input: {
    /** The census median home value, in cents, and the date it stands at. */
    readonly medianValueMinor: number;
    readonly valueDate: string;
    /** The town's median monthly pay on day one (0 where it has no jobs). */
    readonly townPayMinor: number;
  },
): void {
  const row = stock(api).get(`stock:${placeId}`) as StockWithPrice | undefined;
  if (!row || row.priceScaleMinor !== undefined) return;
  const p = (key: string) => api.parameter(key);
  const path = pricePathTo(
    { startedAt: api.state.date, seed: api.state.seed },
    p,
  );
  const log = pastLogLevel(path, api.state.date);
  const scale =
    input.medianValueMinor / Math.exp(pastLogLevel(path, input.valueDate));
  const level = Math.round(scale * Math.exp(log));
  stock(api).put({
    ...row,
    priceLogLevel: log,
    priceRecent: pastRecent(path, p),
    priceScaleMinor: scale,
    priceLevelMinor: level,
    openingPriceLevelMinor: level,
    pricePaySmoothedMinor: input.townPayMinor,
    pricePayAtStartMinor: input.townPayMinor,
    priceEconomyPayAtStart: path.payAtStart,
    priceBuyers: 0,
    priceOffered: 0,
  } as never);
}

/** A place's level today and at the opening, or undefined where it keeps none. */
export function placePriceLevel(
  api: CoreAPI,
  placeId: string,
): { now: number; opening: number; stockId: string } | undefined {
  if (!api.state.modules.has(HOUSING)) return undefined;
  const row = stock(api).get(`stock:${placeId}`) as StockWithPrice | undefined;
  if (!row?.priceLevelMinor || !row.openingPriceLevelMinor) return undefined;
  return {
    now: row.priceLevelMinor,
    opening: row.openingPriceLevelMinor,
    stockId: row.id,
  };
}

/**
 * A home's value today by the one rule: valued at `valueMinor` when the
 * place's level was `levelThen` (the opening's level when the home has none).
 */
export function homeValueToday(
  api: CoreAPI,
  placeId: string,
  valueMinor: number,
  levelThen: number | undefined,
): number {
  const level = placePriceLevel(api, placeId);
  if (!level) return valueMinor;
  return homeValueAt(valueMinor, levelThen ?? level.opening, level.now);
}

function bump(
  api: CoreAPI,
  placeId: string,
  field: "priceBuyers" | "priceOffered",
  count: number,
): void {
  if (!api.state.modules.has(HOUSING) || count <= 0) return;
  const row = stock(api).get(`stock:${placeId}`) as StockWithPrice | undefined;
  if (!row || row.priceScaleMinor === undefined) return;
  stock(api).put({ ...row, [field]: (row[field] ?? 0) + count } as never);
}

/** A household bought a home here this month (a counted one by its weight). */
export function countBuyer(api: CoreAPI, placeId: string, count = 1): void {
  bump(api, placeId, "priceBuyers", count);
}

/** A home here was offered for sale this month: a sale, or a new home finished for sale. */
export function countOffered(api: CoreAPI, placeId: string, count = 1): void {
  bump(api, placeId, "priceOffered", count);
}

/**
 * One month's step of a place's level, from what buyers earn, the mortgage
 * rate, the month's buyers against homes offered, and the outcome web's
 * factor on home values. The town's own pay is smoothed over a year (buyers
 * and lenders weigh about a year of earnings).
 */
export function stepPriceLevel(
  api: CoreAPI,
  placeId: string,
  input: {
    readonly month: string;
    readonly townPayMinor: number;
    /** The economy's pay this month, for a town without jobs of its own. */
    readonly economyPay: number;
    readonly ratePct: number;
    readonly rateRecordId: string | null;
    readonly owned: number;
    readonly webFactor: number;
    readonly webRecordId: string | null;
  },
): void {
  const row = stock(api).get(`stock:${placeId}`) as StockWithPrice | undefined;
  if (!row || row.priceScaleMinor === undefined) return;
  const p = (key: string) => api.parameter(key);
  const months = p("macroMonthsPerYear");
  const smoothed =
    input.townPayMinor > 0 && row.pricePaySmoothedMinor! > 0
      ? row.pricePaySmoothedMinor! +
        (input.townPayMinor - row.pricePaySmoothedMinor!) / months
      : row.pricePaySmoothedMinor! || input.townPayMinor;
  let payIndex: number;
  if (row.pricePayAtStartMinor! > 0 && smoothed > 0)
    payIndex = smoothed / row.pricePayAtStartMinor!;
  else {
    // A town with no jobs of its own: its buyers' pay moves with the economy's.
    // stopgapId: SG-WORLD-housing-price-town-without-pay
    api.stopgap("SG-WORLD-housing-price-town-without-pay");
    payIndex = input.economyPay / row.priceEconomyPayAtStart!;
  }
  const buyers = row.priceBuyers ?? 0,
    offered = row.priceOffered ?? 0;
  const pressure = input.owned > 0 ? (buyers - offered) / input.owned : 0;
  const inputs = { payIndex, ratePct: input.ratePct, pressure };
  const recent = row.priceRecent ?? [];
  const log = stepLogLevel(row.priceLogLevel!, recent, inputs, p);
  const kept = [...recent, log].slice(-(months + 1));
  stock(api).put({
    ...row,
    priceLogLevel: log,
    priceRecent: kept,
    priceLevelMinor: Math.round(
      row.priceScaleMinor * Math.exp(log) * input.webFactor,
    ),
    pricePaySmoothedMinor: smoothed,
    priceBuyers: 0,
    priceOffered: 0,
    priceRead: {
      month: input.month,
      ...inputs,
      buyers,
      offered,
      owned: input.owned,
      townPayMinor: input.townPayMinor,
      rateRecordId: input.rateRecordId,
      webFactor: input.webFactor,
      webRecordId: input.webRecordId,
    },
  } as never);
}

/** What a place's last step read, for a sale's or a value's Trace line. */
export function priceTrace(api: CoreAPI, placeId: string): string {
  const row = stock(api).get(`stock:${placeId}`) as StockWithPrice | undefined;
  const read = row?.priceRead;
  if (!row || !read)
    return `${row?.id ?? `stock:${placeId}`}: the opening's level, no month stepped yet`;
  return (
    `${row.id} ${read.month}: level ${row.priceLevelMinor} from pay index ${read.payIndex.toFixed(4)} ` +
    `(town pay ${read.townPayMinor}), rate ${read.ratePct.toFixed(2)}% (${read.rateRecordId ?? "no macro month"}), ` +
    `${read.buyers} buyers against ${read.offered} homes offered of ${read.owned} owned, ` +
    `web factor ${read.webFactor.toFixed(3)} (${read.webRecordId ?? "no web month"})`
  );
}
