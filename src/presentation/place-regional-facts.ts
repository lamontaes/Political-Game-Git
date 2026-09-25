import type { LifePlace } from "../simulation";
import { regionalMeasuresOn } from "../simulation/regional-issues/regional-measures";
import type { RegionalObservation } from "../simulation/regional-issues/regional-measures";

/**
 * Published figures about the chosen hometown's state that the player can
 * weigh before they start: how its housing prices compare with the nation,
 * the federal fair market rent benchmark for a two-bedroom unit, area median
 * family income, and the unemployment rate.
 *
 * Each line names its measure, the area it covers and the year it describes,
 * because these are area benchmarks and statistics, not an apartment on offer
 * or anyone's pay. Only figures public by the life's start date appear, and a
 * missing figure is left out, never shown as zero. Nothing here says whether
 * any of it is a political issue there: that is `regional-issues.ts`, awaiting
 * research.
 */
export interface PlaceRegionalFact {
  readonly key: "housing-price" | "rent" | "family-income" | "unemployment";
  readonly text: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dollars = (value: number) =>
  `$${new Intl.NumberFormat("en-US").format(Math.round(value))}`;

function monthName(period: string): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  return match && month ? `${month} ${match[1]}` : null;
}

function housingPriceText(
  name: string,
  index: RegionalObservation,
): string | null {
  if (!index.national) return null;
  const percent = Math.round((index.value / index.national - 1) * 100);
  const lead = `In ${index.period}, housing prices across ${name} ran`;
  if (percent === 0) return `${lead} about even with the national level.`;
  return percent > 0
    ? `${lead} about ${percent}% above the national level.`
    : `${lead} about ${-percent}% below the national level.`;
}

function yearLabel(period: string): string {
  const fiscal = /^FY(\d{4})$/.exec(period);
  return fiscal ? `fiscal year ${fiscal[1]}` : period;
}

function nationally(national: number | null): string {
  return national ? ` (${dollars(national)} nationally)` : "";
}

export function placeRegionalFacts(
  place: LifePlace,
): readonly PlaceRegionalFact[] {
  const jurisdictionKey = place.stateJurisdictionKey;
  if (!jurisdictionKey) return [];
  const measures = regionalMeasuresOn(
    jurisdictionKey,
    place.context.initialMoment.date,
  );
  if (!measures) return [];
  const { name } = measures;
  const facts: PlaceRegionalFact[] = [];

  const housing = measures.housingPriceIndex
    ? housingPriceText(name, measures.housingPriceIndex)
    : null;
  if (housing) facts.push({ key: "housing-price", text: housing });

  const rent = measures.twoBedroomFairMarketRent;
  if (rent)
    facts.push({
      key: "rent",
      text: `The federal fair market rent for a two-bedroom unit, averaged across ${name}, is ${dollars(rent.value)} a month for ${yearLabel(rent.period)}${nationally(rent.national)}. It is a benchmark, not an apartment's asking rent.`,
    });

  const income = measures.medianFamilyIncome;
  if (income)
    facts.push({
      key: "family-income",
      text: `Area median family income, averaged across ${name}, is ${dollars(income.value)} for ${yearLabel(income.period)}${nationally(income.national)}.`,
    });

  const jobless = measures.unemploymentRate;
  const month = jobless ? monthName(jobless.period) : null;
  if (jobless && month)
    facts.push({
      key: "unemployment",
      text: `${name}'s seasonally adjusted unemployment rate was ${jobless.value}% in ${month}.`,
    });

  return facts;
}
