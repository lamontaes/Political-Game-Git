import type { CoreState } from "./types";

let everyone = false;

/**
 * Keeps everyone's "why" records, not only the circle's: a debug switch for
 * a test that reads the reasons of someone the player never deals with.
 * Off in play and under bookkeeping, so a test's world keeps what play
 * keeps. Returns the previous setting.
 */
export function setKeepEveryonesWhy(on: boolean): boolean {
  const previous = everyone;
  everyone = on;
  return previous;
}

/**
 * Whose "why" record is saved (Keep it simple, owner Oct 11, 2026): the
 * player's and the people they deal with, plus anyone in focus. For anyone
 * else the dollars, the counts and the pulls an engine reads are still
 * recorded; only the row that says why for a person nobody asks about is
 * left out.
 */
export function keepsWhy(core: CoreState, ...personIds: string[]): boolean {
  if (everyone) return true;
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  const household = player
    ? (core.households.get(player.householdId)?.memberIds ?? [])
    : [];
  return personIds.some(
    (id) =>
      core.focusPersonIds.has(id) ||
      (player !== undefined &&
        (id === player.id ||
          player.familyIds.has(id) ||
          player.knownIds.has(id) ||
          household.includes(id))),
  );
}
