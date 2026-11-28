/**
 * Where a person lives, as the moves engine reads it: whether they live outside the played town (cached per world), whether a place is the played town, and whether they live in group quarters. src/core2/modules/moves.ts re-exports them.
 */
import { isDemoted } from "./counted-groups";
import { placeStateKey } from "./place-map";
import { townPlaceOf } from "./residents-reads";
import type { CoreState, PersonState } from "./types";

export const INACTIVE_TIER = "husk";

/**
 * Someone living a life elsewhere at low intensity: alive, of the inactive
 * tier, in a real place outside the played town's full-detail places, and not
 * back in the counts (the counted engines carry those).
 */
export function livesElsewhere(
  core: CoreState,
  person: Readonly<PersonState>,
): boolean {
  return (
    person.alive &&
    person.tier === INACTIVE_TIER &&
    !isDemoted(person) &&
    !playedTown(core, person.placeId) &&
    placeStateKey(person.placeId) !== null
  );
}

const townByCore = new WeakMap<CoreState, { town: string | undefined }>();

/** The played town: its own place (looked up once per world) and any full-detail place. */
export function playedTown(core: CoreState, placeId: string): boolean {
  let held = townByCore.get(core);
  if (!held) {
    held = { town: townPlaceOf(core) };
    townByCore.set(core, held);
  }
  return core.focusPlaceIds.has(placeId) || held.town === placeId;
}

/**
 * Whether a person lives in group quarters (a dormitory, a cell, a barracks
 * or a nursing-home room): an institution admits and discharges them, so no
 * household's pull to leave moves them, full or counted alike.
 */
export function inGroupQuarters(
  core: CoreState,
  person: Readonly<PersonState>,
): boolean {
  return core.households.get(person.householdId)?.quarters !== undefined;
}
