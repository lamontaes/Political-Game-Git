/**
 * Home prices are this world's own (owner, Nov 13, 2026: "it's simulated...
 * things need to be simulated in order to make your modern day make sense").
 * Each place keeps one price level, a typical home's value, that the housing
 * engine steps once a month from causes:
 *
 *   ln L' = ln L + momentum * (last year's change) / 12
 *                + reversion * (ln F - ln L)
 *                + pressureResponse * tanh(pressure / pressureScale)
 *   ln F  = ln pay + rateResponse * ln A(rate)
 *
 * - pay: what buyers earn, indexed to day one (the town's own pay in play,
 *   smoothed over a year; the economy's pay before day one).
 * - A(rate): the loan a fixed monthly payment carries at the 30-year rate.
 * - momentum: buyers expect last year's change to go on (Capozza et al.).
 * - reversion: the market closes the gap to what pay and rates support.
 * - pressure: the month's buyers against the homes offered, over the homes
 *   owned (zero before day one).
 *
 * Published data calibrates the three responses (the fit in
 * scripts/research/home-price-fit.ts against FHFA's state indexes) and the
 * level's scale once (the ACS median at its value date); it never sets the
 * level. Every home's value is the one rule `homeValueAt`.
 */
import housingParameters from "./data/housing/parameters.json" with { type: "json" };
import { worldOffsetUnit } from "./world-draw";

const HOUSING_ROWS = housingParameters as unknown as Record<
  string,
  { value: number }
>;
const pv = (key: string) => HOUSING_ROWS[key]!.value;

/**
 * A signed offset between the floor share of the named housing spread row and
 * the whole spread, fixed by the world's seed and the key: generation of the
 * starting world, never an actor's outcome (owner, Oct 27: realistic, not
 * real). The one world draw (world-draw.ts), times this table's spread row.
 */
export function housingWorldOffset(
  seed: string,
  key: string,
  spread: string,
): number {
  return (
    worldOffsetUnit(seed, `housing-world:${key}`) * HOUSING_ROWS[spread]!.value
  );
}

/** A price level by date (the economy's simulated consumer prices), when the caller has one. */
export type PriceLevel = (date: string) => number | undefined;

/** ACS 2020-2024 five-year values are dated at the window's middle. */
export const ACS_VALUE_DATE = "2022-07-01";

export type P = (key: string) => number;

/** The loan one dollar a month carries for 30 years at a yearly percentage rate. */
export function loanPerPayment(ratePct: number, p: P): number {
  const months = p("macroMonthsPerYear");
  const term = p("housingMortgageTermYears") * months;
  const r = ratePct / p("macroHundred") / months;
  return r > 0 ? (1 - (1 + r) ** -term) / r : term;
}

/** What pay and the mortgage rate support, in logs (the level's anchor before its scale). */
export function supportedLog(payIndex: number, ratePct: number, p: P): number {
  return (
    Math.log(payIndex) +
    pv("housingPriceRateResponse") * Math.log(loanPerPayment(ratePct, p))
  );
}

/** The inputs one month's step reads, kept so Trace can show them. */
export interface PriceStepInputs {
  /** Buyers' pay, indexed to day one. */
  readonly payIndex: number;
  /** The 30-year mortgage rate, percent. */
  readonly ratePct: number;
  /** Buyers less homes offered, over the homes owned (zero before day one). */
  readonly pressure: number;
}

/**
 * One month's step of a place's log level. `recent` is the log level of the
 * last 13 months, oldest first (the momentum reads the year's change).
 */
export function stepLogLevel(
  logLevel: number,
  recent: readonly number[],
  inputs: PriceStepInputs,
  p: P,
): number {
  const months = p("macroMonthsPerYear");
  const yearChange =
    recent.length > months ? recent.at(-1)! - recent.at(-1 - months)! : 0;
  return (
    logLevel +
    (pv("housingPriceMomentum") * yearChange) / months +
    (pv("housingPriceReversionPerYear") / months) *
      (supportedLog(inputs.payIndex, inputs.ratePct, p) - logLevel) +
    pv("housingPricePressureResponse") *
      Math.tanh(inputs.pressure / pv("housingPricePressureScale"))
  );
}

/**
 * The one value rule: a home valued at `valueMinor` when its place's level was
 * `levelThen` is worth that times the level now over the level then.
 */
export function homeValueAt(
  valueMinor: number,
  levelThen: number,
  levelNow: number,
): number {
  return levelThen > 0
    ? Math.round((valueMinor * levelNow) / levelThen)
    : valueMinor;
}
