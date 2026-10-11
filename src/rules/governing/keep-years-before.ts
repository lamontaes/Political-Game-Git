// Lifted unchanged from src/simulation/civil-personnel-start.ts; RULES-3, 2026-10-11.
import { makeIsoDate } from "./dates";
import type { IsoDate } from "../../simulation/types";

export function yearsBefore(date: IsoDate, years: number): IsoDate {
  return makeIsoDate(
    `${(Number(date.slice(0, 4)) - years).toString().padStart(4, "0")}${date.slice(4)}`,
  );
}
