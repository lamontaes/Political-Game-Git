import type { IsoDate } from "../core2/kernel/dates";
import type { PersonId } from "../core2/types";
import type { Director } from "../director/ledger";

/**
 * Opens the first scene that waits for the player and one of `otherIds` to be
 * in one place: a `next-together` scene on the director's waiting list whose
 * date has come and whose open days have not run out. The bench's talk route
 * asks it with the person the player walks up to, the visit with everyone at
 * the place. Returns the scene's moment, or undefined when none waits.
 */
export function openWaitingSceneWith(
  director: Director,
  playerId: PersonId,
  at: { date: IsoDate; minuteOfDay: number },
  otherIds: readonly string[],
): string | undefined {
  const row = director
    .waitingScenes(playerId, at.date)
    .find(
      (item) =>
        item.nextTogether &&
        item.date <= at.date &&
        item.openUntil >= at.date &&
        item.withIds.some((id) => otherIds.includes(id)),
    );
  return row && director.openWaiting(playerId, row.momentId, at)
    ? row.momentId
    : undefined;
}
