// Lifted unchanged from src/simulation/campaign-opponents.ts; RULES-3, 2026-10-11.
import { addDays } from "./dates";
import type { IsoDate } from "../../simulation/types";

export const EVALUATION_INTERVAL_DAYS = 7;

export function nextEvaluationDate(
  from: IsoDate,
  electionDate: IsoDate,
  current: IsoDate,
): IsoDate | null {
  const weekLater = addDays(from, EVALUATION_INTERVAL_DAYS);
  const eve = addDays(electionDate, -1);
  const dueAt = weekLater < eve ? weekLater : eve;
  return dueAt > current ? dueAt : null;
}
