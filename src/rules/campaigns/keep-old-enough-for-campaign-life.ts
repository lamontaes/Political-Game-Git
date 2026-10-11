// Lifted unchanged from src/simulation/campaign-life-activities.ts; RULES-3, 2026-10-11.
import { ageOnDate } from "./dates";
import type { IsoDate } from "../../simulation/types";

export const LIFE = {
  minimumAge: 18,
  requestWindowDays: 14,
  inPersonStartMinute: 18 * 60 + 30,
  phoneStartMinute: 19 * 60,
  memoryDays: 42,
} as const;

export function oldEnoughForCampaignLife(
  birthDate: IsoDate | null,
  today: IsoDate,
): boolean {
  return birthDate !== null && ageOnDate(birthDate, today) >= LIFE.minimumAge;
}
