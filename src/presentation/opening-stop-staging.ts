import type { EntityId, World } from "../simulation";
import type { BackdropOverflowPerson, BackdropPerson } from "./backdrop-people";
import type { OpeningStop } from "./opening-stops";
import { openingTourStagedPeople } from "./opening-tour-people";
import { middayBackdropUrl } from "./place-backdrops";

/**
 * Where everyone at an opening stop stands or sits in its picture, through
 * the same measured spots every place uses. The opening screen and the
 * loading screen's preload both read this, so the figures warmed during
 * loading are exactly the ones the opening draws.
 *
 * The country stop's two officials face each other in their office; at
 * every other stop the people face the room, as people in an everyday moment
 * or a meeting do.
 */
export function stageOpeningStop(
  world: World,
  personId: EntityId,
  stop: OpeningStop,
): readonly BackdropPerson[] & {
  readonly overflow: readonly BackdropOverflowPerson[];
} {
  if (!stop.place || stop.people.length === 0)
    return Object.assign([] as BackdropPerson[], { overflow: [] });
  return openingTourStagedPeople(world, personId, stop.place, stop.people, {
    furniture: stop.furniture,
    faceRoom: stop.key !== "country",
  });
}

/** The picture an opening stop stands in, or null when it has none. */
export function openingStopBackdropUrl(stop: OpeningStop): string | null {
  return stop.place ? middayBackdropUrl(stop.place) : null;
}
