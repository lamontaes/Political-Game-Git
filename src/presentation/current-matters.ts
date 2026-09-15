import type { EntityId, World } from "../simulation";
import { addDays } from "../simulation/dates";
import { projectWorldRecap, type RecapEntry } from "./world-recap";

/**
 * The public or known matter a person could bring up in conversation now.
 *
 * Read from the same records the recap uses, so what the player can raise is
 * exactly what they could have read in the news or actually learned — never a
 * private fact they were not told. "Current" is an authored presentation
 * window, not a claim about how long a matter stays relevant in the world.
 */
export const CURRENT_MATTER_WINDOW_DAYS = 30;

export function currentKnownMatter(
  world: World,
  playerPersonId: EntityId,
): RecapEntry | null {
  const recent = projectWorldRecap(world, playerPersonId, 0, 1);
  const entry = recent?.entries[0] ?? null;
  if (!entry) return null;
  const earliest = addDays(world.currentDate, -CURRENT_MATTER_WINDOW_DAYS);
  return entry.at >= earliest ? entry : null;
}

/** How a counterpart stands to a matter, from their records alone. */
export type MatterAwareness = "involved" | "informed" | "uninformed";

export function matterAwareness(
  world: World,
  personId: EntityId,
  eventId: EntityId,
): MatterAwareness {
  const event = world.history.events.find((entry) => entry.id === eventId);
  if (event?.participants.some((entry) => entry.personId === personId))
    return "involved";
  // Publication is not knowledge: only a record of learning it counts.
  return world.history.knowledge.some(
    (record) =>
      record.personId === personId &&
      record.eventId === eventId &&
      record.learnedAt <= world.currentDate,
  )
    ? "informed"
    : "uninformed";
}
