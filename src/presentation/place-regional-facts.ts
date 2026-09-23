import type { LifePlace } from "../simulation";
import { regionalMeasuresOn } from "../simulation/regional-issues/regional-measures";
import type { RegionalObservation } from "../simulation/regional-issues/regional-measures";

/**
 * What living in the chosen hometown's state costs and pays, as published
 * figures the player can weigh before they start: housing prices against the
 * nation, what a two-bedroom rents for, what a typical family earns, and how
 * many are out of work.
 *
 * Only figures whose period had ended by the life's start date. A figure that
 * is missing is left out, never shown as zero. Nothing here says whether any of
 * it is a political issue there: that is `regional-issues.ts`, awaiting
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
  if (percent === 0)
    return `Housing in ${name} costs about the national average.`;
  return percent > 0
    ? `Housing in ${name} costs about ${percent}% more than the national average.`
    : `Housing in ${name} costs about ${-percent}% less than the national average.`;
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
      text: rent.national
        ? `A two-bedroom apartment in ${name} rents for about ${dollars(rent.value)} a month, against ${dollars(rent.national)} nationally.`
        : `A two-bedroom apartment in ${name} rents for about ${dollars(rent.value)} a month.`,
    });

  const income = measures.medianFamilyIncome;
  if (income)
    facts.push({
      key: "family-income",
      text: income.national
        ? `A typical family in ${name} earns about ${dollars(income.value)} a year, against ${dollars(income.national)} nationally.`
        : `A typical family in ${name} earns about ${dollars(income.value)} a year.`,
    });

  const jobless = measures.unemploymentRate;
  const month = jobless ? monthName(jobless.period) : null;
  if (jobless && month)
    facts.push({
      key: "unemployment",
      text: `Unemployment in ${name} was ${jobless.value}% in ${month}.`,
    });

  return facts;
}
