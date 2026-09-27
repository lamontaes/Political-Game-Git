import type { EntityId, IsoDate, SimulationMoment, World } from "../simulation";
import { projectToday, type TodayOverview } from "./day-overview";
import type { InterfaceProgress, ShellPreferences } from "./shell-navigation";
import { projectWorldRecap, type WorldRecap } from "./world-recap";

/**
 * The day read uses the same saved facts as Today and While you were away.
 * Its interval is interface progress, not a World event or a second clock.
 */
export interface MorningThought {
  readonly date: IsoDate;
  readonly today: TodayOverview;
}

export interface DaySummary {
  /** Null only for an older save whose moment frontier has not initialized. */
  readonly since: SimulationMoment | null;
  readonly through: SimulationMoment;
  readonly throughSequence: number;
  readonly completedDay: boolean;
  /** Existing news/knowledge/own-result reader; null for a quiet interval. */
  readonly recap: WorldRecap | null;
}

export interface DayRhythm {
  readonly morningThought: MorningThought | null;
  readonly summary: DaySummary | null;
}

/**
 * Read only. A date crossing offers a short end-of-day summary even when no
 * new public or learned item exists; that absence is not a fabricated event.
 * A same-day meaningful change keeps the existing recap reachable. Dismissal
 * must pass both `throughSequence` and `through` from this exact projection.
 */
export function projectDayRhythm(
  world: World,
  personId: EntityId,
  progress: InterfaceProgress,
  preferences: Pick<ShellPreferences, "morningThoughts">,
): DayRhythm {
  const from = progress.recapThroughMoment ?? null;
  const recap =
    progress.recapFrontier === null
      ? null
      : projectWorldRecap(world, personId, progress.recapFrontier);
  const completedDay = from !== null && world.currentDate > from.date;
  const summary =
    recap || completedDay
      ? {
          since: from,
          through: world.currentMoment,
          throughSequence: world.history.nextSequence,
          completedDay,
          recap,
        }
      : null;
  // PLACEHOLDER(wave2): local noon bounds the optional morning thought until
  // the owner approves a more specific daily presentation window.
  const inMorning = world.currentMoment.minuteOfDay < 12 * 60;
  const morningThought =
    preferences.morningThoughts &&
    inMorning &&
    (!progress.morningThoughtSeenOn ||
      progress.morningThoughtSeenOn < world.currentDate)
      ? { date: world.currentDate, today: projectToday(world, personId) }
      : null;
  return { morningThought, summary };
}
