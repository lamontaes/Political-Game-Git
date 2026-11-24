import { parameter } from "../core2/parameters";
import { dateAtAge, makeIsoDate } from "../core2/kernel/dates";
import type { IsoDate } from "../core2/types";

/**
 * The day a person born on `birthDate` comes of voting age, golden-path step
 * one: the core's own date at that age (`dateAtAge`), the same day
 * `ageOnDate` first counts them of age, so the stop and every age read agree.
 */
export function comingOfAgeOn(birthDate: string): IsoDate {
  return dateAtAge(makeIsoDate(birthDate), parameter("votingAge"));
}
