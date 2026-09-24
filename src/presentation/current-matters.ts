import type { EntityId, World } from "../simulation";
import { addDays } from "../simulation/dates";
import { projectWorldRecap, type RecapEntry } from "./world-recap";

/**
 * A matter this person actually knows well enough to bring up now.
 *
 * Read from the same records the recap uses, but a published headline alone
 * does not teach every resident. A speaker must have learned the underlying
 * event or been involved in it. "Current" is an authored presentation window,
 * not a claim about how long a matter stays relevant in the world.
 */
export const CURRENT_MATTER_WINDOW_DAYS = 30;

export function currentKnownMatter(
  world: World,
  playerPersonId: EntityId,
): RecapEntry | null {
  const recent = projectWorldRecap(
    world,
    playerPersonId,
    0,
    world.history.nextSequence,
  );
  const earliest = addDays(world.currentDate, -CURRENT_MATTER_WINDOW_DAYS);
  return (
    recent?.entries.find(
      (candidate) =>
        candidate.at >= earliest &&
        (world.history.events
          .find((event) => event.id === candidate.eventId)
          ?.participants.some((entry) => entry.personId === playerPersonId) ||
          world.history.knowledge.some(
            (record) =>
              record.personId === playerPersonId &&
              record.eventId === candidate.eventId &&
              record.learnedAt <= world.currentDate &&
              (record.accuracy === "accurate" ||
                record.source.kind === "media" ||
                record.source.kind === "public-record"),
          )),
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
