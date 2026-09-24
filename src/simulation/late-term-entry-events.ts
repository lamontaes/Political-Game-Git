import type { EntityId, World } from "./types";

/**
 * A winner seated after the first day of the term, because the entry on that
 * day was refused by a defect since fixed: an old governor's-office Qualify
 * step the player never saw, or a term limit that counted the member's own
 * first term as already served. Kept in a module that imports nothing, so the
 * office evidence readers can accept it without an import cycle.
 */
export const LATE_TERM_ENTRY = "election.term-entered-late";

export function lateTermEntryKey(relationshipId: EntityId): string {
  return `late-term-entry:${relationshipId}`;
}

export function lateTermEntryRecorded(
  world: World,
  relationshipId: EntityId,
): boolean {
  const key = lateTermEntryKey(relationshipId);
  return world.history.events.some(
    (event) =>
      event.type === LATE_TERM_ENTRY &&
      event.stableKey === key &&
      event.occurredAt <= world.currentDate,
  );
}
