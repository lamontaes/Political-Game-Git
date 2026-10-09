import inputs from "../../data/research/money/historical-world-inputs.json" with { type: "json" };
import { makeIsoDate } from "./dates";
import type { IsoDate } from "./types";

export const HISTORICAL_WORLD_START_DATE = makeIsoDate(inputs.startDate);
export const FIRST_HISTORICAL_PRESIDENTIAL_CYCLE =
  inputs.firstPresidentialCycle;

/** One year reader for opening inputs; saved laws, contracts and decisions win. */
function buildHistoricalWorldInputs(onDate: IsoDate) {
  const year = Number(onDate.slice(0, 4));
  const prices = inputs.priceIndexByYear as Readonly<Record<string, number>>;
  const years = Object.keys(prices)
    .map(Number)
    .sort((a, b) => a - b);
  const selected = years.filter((value) => value <= year).at(-1) ?? years[0]!;
  const last = years.at(-1)!;
  const previous = years.at(-2)!;
  const drift = prices[last]! / prices[previous]!;
  const priceIndex =
    year > last
      ? prices[last]! * drift ** (year - last)
      : year < selected
        ? prices[selected]! / drift ** (selected - year)
        : prices[selected]!;
  return {
    year,
    historical: year < inputs.contemporaryYear,
    priceIndex,
    nominalFactor: priceIndex / prices[inputs.contemporaryYear]!,
    priceSource: inputs.sources.prices,
    priceBasis:
      year === selected
        ? "researched"
        : "ESTIMATED FROM AVERAGE: recorded price-series drift",
    houseSeats:
      year < Number(inputs.apportionmentStartsAt.slice(0, 4)) ||
      onDate < inputs.apportionmentStartsAt
        ? (inputs.previousHouseSeats as Readonly<Record<string, number>>)
        : ({} as Readonly<Record<string, number>>),
    firstPresidentialCycle: inputs.firstPresidentialCycle,
  };
}

const yearInputs = new Map<
  string,
  ReturnType<typeof buildHistoricalWorldInputs>
>();
export function historicalWorldInputs(onDate: IsoDate) {
  const key = `${onDate.slice(0, 4)}:${onDate < inputs.apportionmentStartsAt}`;
  let context = yearInputs.get(key);
  if (!context) {
    context = buildHistoricalWorldInputs(onDate);
    yearInputs.set(key, context);
  }
  return context;
}
