// Lifted unchanged from src/simulation/campaign-life-activities.ts; RULES-3, 2026-10-11.
import { ageOnDate } from "./dates";
import type { EntityId, World } from "../../simulation/types";

export const LIFE = {
  minimumAge: 18,
  requestWindowDays: 14,
  inPersonStartMinute: 18 * 60 + 30,
  phoneStartMinute: 19 * 60,
  memoryDays: 42,
} as const;

export function oldEnoughForCampaignLife(
  world: World,
  personId: EntityId,
): boolean {
  const person = world.people[personId];
  return (
    !!person &&
    ageOnDate(person.birthDate, world.currentDate) >= LIFE.minimumAge
  );
}
