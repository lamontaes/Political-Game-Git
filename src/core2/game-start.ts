/**
 * The one date every game starts on (owner ruling, Oct 14, 2026): Inauguration
 * Day, January 20, 2025, in every place. The data's vintage calibrates the
 * world; it does not move this date. Every opening, the bench, scripts and
 * tests read it from here instead of writing a date.
 */
import { makeIsoDate } from "./kernel/dates";
import { parameter } from "./parameters";
import type { IsoDate } from "./kernel/brands";

let cached: IsoDate | undefined;

/** The game's start date, from the parameter table's `gameStartDate` (YYYYMMDD). */
export function gameStartDate(): IsoDate {
  if (cached) return cached;
  const digits = String(parameter("gameStartDate"));
  if (!/^\d{8}$/.test(digits))
    throw new Error(`gameStartDate must be YYYYMMDD: ${digits}`);
  cached = makeIsoDate(
    `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`,
  );
  return cached;
}
