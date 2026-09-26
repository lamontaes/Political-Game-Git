import type { EntityId, World } from "../simulation";
import { addDays } from "../simulation/dates";
import { projectWorldRecap, type RecapEntry } from "./world-recap";

/**
 * The matter this person actually knows and could bring up now.
 *
 * Read from the same records the recap uses, so what the player can raise is
 * exactly what they read in the news or actually learned — never a published
 * item they have not opened. "Current" is an authored presentation
 * window, not a claim about how long a matter stays relevant in the world.
 */
export const CURRENT_MATTER_WINDOW_DAYS = 30;

export function currentKnownMatter(
  world: World,
  playerPersonId: EntityId,
): RecapEntry | null {
  const recap = projectWorldRecap(
    world,
    playerPersonId,
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const earliest = addDays(world.currentDate, -CURRENT_MATTER_WINDOW_DAYS);
  const knownEventIds = new Set(
    world.history.knowledge
      .filter(
        (record) =>
          record.personId === playerPersonId &&
          record.learnedAt <= world.currentDate,
      )
      .map((record) => record.eventId),
  );
  for (const event of world.history.events)
    if (
      event.occurredAt <= world.currentDate &&
      event.participants.some((entry) => entry.personId === playerPersonId)
    )
      knownEventIds.add(event.id);
  return (
    recap?.entries.find(
      (entry) => entry.at >= earliest && knownEventIds.has(entry.eventId),
    ) ?? null
  );
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
