import { parameter } from "../core2/parameters";
import { makeIsoDate } from "../core2/kernel/dates";
import type { IsoDate } from "../core2/types";

/**
 * The day a person born on `birthDate` comes of voting age, golden-path step
 * one: their birthday that year, a February 29 birthday counting on March 1
 * in a common year.
 */
export function comingOfAgeOn(birthDate: string): IsoDate {
  const year = Number(birthDate.slice(0, 4)) + parameter("votingAge");
  const monthDay = birthDate.slice(5);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return makeIsoDate(
    `${year}-${monthDay === "02-29" && !leap ? "03-01" : monthDay}`,
  );
}
