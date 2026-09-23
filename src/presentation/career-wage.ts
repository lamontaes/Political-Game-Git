/**
 * A national median wage as a player reads it.
 *
 * The occupation table stores each median as the bare text it was published
 * in: "17.03" an hour, "35410" a year. Printed as is, a Houma walk read "a
 * median of 17.03 an hour, 35410 a year". A value that is not a plain number
 * (the table marks a few as unpublished) reads as unlisted rather than as
 * whatever symbol stood in for it.
 */
const HOURLY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const ANNUAL = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function amount(value: string | null, format: Intl.NumberFormat): string {
  const text = value?.trim() ?? "";
  if (!/^\d+(\.\d+)?$/.test(text)) return "an unlisted amount";
  return format.format(Number(text));
}

export function nationalMedianWageSentence(wage: {
  readonly hourlyMedian: string | null;
  readonly annualMedian: string | null;
}): string {
  return `Nationally, this work pays a median of ${amount(wage.hourlyMedian, HOURLY)} an hour, ${amount(wage.annualMedian, ANNUAL)} a year. What it pays here, and what anyone would offer you, is another question.`;
}
