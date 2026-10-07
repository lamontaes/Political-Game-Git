import type { EntityId, SimulationMoment, World } from "../simulation";
import type { InterfaceProgress } from "./shell-navigation";
import { projectWorldRecap, type WorldRecap } from "./world-recap";

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
  return { summary };
}
