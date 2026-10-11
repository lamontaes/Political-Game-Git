// STOPGAP RULES3-GOV-122: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/crisis/hazard-producer.ts; RULES-3, 2026-10-11.
import { daysBetween, makeIsoDate } from "./dates";

export interface StormEpisode {
  readonly episodeId: string;
  readonly family: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly month: number;
  readonly eventCount: number;
  readonly affectedAreas: readonly {
    readonly stateFips: string;
    readonly countyFips: string;
  }[];
}

export function recordedDurationDays(episode: StormEpisode): number {
  const days = daysBetween(
    makeIsoDate(episode.startDate),
    makeIsoDate(episode.endDate),
  );
  return Math.max(1, Math.min(14, days + 1));
}
