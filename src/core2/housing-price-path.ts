/**
 * This world's home price level before day one: the housing engine's monthly
 * price step (housing-prices.ts) run from the economy's first month to day
 * one with no buyers or sellers (they are not in the world), from the
 * economy's pay and 30-year rate. The opening's values, the opening's
 * mortgages and the housing history all read this one path.
 */
import history from "./data/macro/history.json" with { type: "json" };
import { worldMortgageRate, worldPublishedMonth } from "./macro-model";
import { stepLogLevel, supportedLog, type P } from "./housing-prices";
import { stopgap } from "./stopgaps";

const CPI = new Map(
  (history.annualCpi as { year: number; index: number }[]).map((row) => [
    row.year,
    row.index,
  ]),
);
const FIRST_MONTH = (history.monthly as { month: string }[])[0]!.month;
const FIRST_PAY_MONTH = (
  history.monthly as { month: string; hourlyEarnings?: number }[]
).find((row) => row.hourlyEarnings !== undefined)!.month;

const nextMonth = (month: string) => {
  const y = Number(month.slice(0, 4)),
    m = Number(month.slice(5, 7));
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

/**
 * The economy's month before day one, as the price level reads it: this
 * world's pay and 30-year rate (the published months moved by the world's
 * offsets, the same figures the economy's pre-start pass records). One
 * accessor, read by the path, the mortgages and play's fallback.
 */
export function economyMonthBefore(
  month: string,
  world: PriceWorld,
  p: P,
): { pay: number; ratePct: number } {
  const row = worldPublishedMonth(month, world.startedAt, world.seed, p);
  let pay = row?.hourlyEarnings;
  if (pay === undefined) {
    // Before the earnings series begins, pay moves with consumer prices.
    // stopgapId: SG-WORLD-housing-price-pay-before-earnings
    stopgap("SG-WORLD-housing-price-pay-before-earnings");
    const first = worldPublishedMonth(
      FIRST_PAY_MONTH,
      world.startedAt,
      world.seed,
      p,
    )!;
    pay =
      first.hourlyEarnings! *
      ((row?.priceIndex ?? first.priceIndex!) / first.priceIndex!);
  }
  return {
    pay,
    ratePct: worldMortgageRate(month, world.startedAt, world.seed, p),
  };
}

/** A world's path of the price level before day one, relative: exp(log level) by month. */
export interface PricePath {
  /** The first month the path runs (the economy's first month). */
  readonly from: string;
  /** Day one's month. */
  readonly through: string;
  /** The log level by month, from `from` through `through`. */
  readonly logByMonth: ReadonlyMap<string, number>;
  /** The economy's pay on day one's month (the pay index's base). */
  readonly payAtStart: number;
}

/** The world a path belongs to: its start and seed (its own past economy). */
export interface PriceWorld {
  readonly startedAt: string;
  readonly seed: string;
}

const paths = new Map<string, PricePath>();

/**
 * The level's path from the economy's first month to day one: the same step
 * as play, with no pressure (the buyers and sellers of those years are not in
 * the world). It starts where pay and rates put it. One path per world start,
 * shared by every place (a place's own past differs by its scale; its own
 * pay before day one is not simulated yet).
 */
export function pricePathTo(world: PriceWorld, p: P): PricePath {
  const through = world.startedAt.slice(0, 7);
  const key = `${world.seed}:${through}`;
  const held = paths.get(key);
  if (held) return held;
  // stopgapId: SG-WORLD-housing-price-past-pressure
  stopgap("SG-WORLD-housing-price-past-pressure");
  const payAtStart = economyMonthBefore(through, world, p).pay;
  const logByMonth = new Map<string, number>();
  const recent: number[] = [];
  let level: number | undefined;
  for (let month = FIRST_MONTH; month <= through; month = nextMonth(month)) {
    const { pay, ratePct } = economyMonthBefore(month, world, p);
    const inputs = { payIndex: pay / payAtStart, ratePct, pressure: 0 };
    level =
      level === undefined
        ? supportedLog(inputs.payIndex, ratePct, p)
        : stepLogLevel(level, recent, inputs, p);
    recent.push(level);
    if (recent.length > p("macroMonthsPerYear") + 1) recent.shift();
    logByMonth.set(month, level);
  }
  const path = { from: FIRST_MONTH, through, logByMonth, payAtStart };
  // A few worlds at once (tests build several); the oldest goes first.
  if (paths.size >= 8) paths.delete(paths.keys().next().value!);
  paths.set(key, path);
  return path;
}

/**
 * The relative level on a date before or at day one. Before the economy's
 * first month, it moves with consumer prices from there.
 */
export function pastLogLevel(path: PricePath, date: string): number {
  const month = date.slice(0, 7);
  const at = month > path.through ? path.through : month;
  const held = path.logByMonth.get(at);
  if (held !== undefined) return held;
  // stopgapId: SG-WORLD-housing-price-before-economy
  stopgap("SG-WORLD-housing-price-before-economy");
  const first = Number(path.from.slice(0, 4)),
    year = Math.max(Number(month.slice(0, 4)), [...CPI.keys()][0]!);
  return (
    path.logByMonth.get(path.from)! +
    Math.log(CPI.get(Math.min(year, first))! / CPI.get(first)!)
  );
}

/** The last 13 months of the path through day one, oldest first: play's momentum starts from them. */
export function pastRecent(path: PricePath, p: P): number[] {
  const out: number[] = [];
  for (const [month, level] of path.logByMonth)
    if (month <= path.through) out.push(level);
  return out.slice(-(p("macroMonthsPerYear") + 1));
}

/**
 * How much a typical home's price moved between two dates before or at day
 * one in this world: the path's ratio. Mortgages and the history read it.
 */
export function pastPriceRatio(
  world: PriceWorld,
  from: string,
  to: string,
  p: P,
): number {
  const path = pricePathTo(world, p);
  return Math.exp(pastLogLevel(path, to) - pastLogLevel(path, from));
}
