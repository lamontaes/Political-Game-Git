import type { EntityId, World } from "../simulation";
import {
  backdropStaging,
  placeBackdropPeople,
  type BackdropOverflowPerson,
  type BackdropPerson,
} from "./backdrop-people";
import type { OpeningStop } from "./opening-stops";
import { middayBackdropUrl } from "./place-backdrops";

/**
 * Where everyone at an opening stop stands or sits in its picture, through
 * the same measured spots every place uses. The opening screen and the
 * loading screen's preload both read this, so the figures warmed during
 * loading are exactly the ones the opening draws.
 *
 * The President giving the State of the Union takes the rostrum's podium,
 * and members of Congress take the members' seats on the floor, the
 * player's own nearest the camera. Everyone
 * faces the room, as people in an everyday moment or a meeting do; nobody is
 * posed to react.
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
  // As many members as the room's picture has members' seats: the rest of
  // Congress is in the room out of frame, not standing in its aisles or in
  // the presiding chair. A place with no members' seats seats them anywhere.
  const seats = (backdropStaging(stop.place)?.spots ?? []).filter(
    (spot) => spot.role === MEMBER_SEAT,
  ).length;
  let members = 0;
  const shown = stop.people.filter(
    (person) =>
      person.role !== "member" ||
      person.plaque ||
      seats === 0 ||
      ++members <= seats - plaqued(stop),
  );
  const ids = new Set(shown.map((person) => person.personId));
  const placed = placeBackdropPeople(
    world,
    personId,
    stop.place,
    world.currentMoment,
    shown.map((person) => ({
      personId: person.personId,
      title: person.title,
      ...(person.role === "member" ? { role: MEMBER_SEAT } : {}),
    })),
    {
      standing: !stop.furniture,
      rosterOnly: true,
      faceRoom: true,
      nearestFirst: true,
      speakerId:
        shown.find((person) => person.role === "speaker")?.personId ?? null,
    },
  );
  return Object.assign(
    placed.filter((person) => ids.has(person.personId)),
    {
      overflow: placed.overflow.filter((person) => ids.has(person.personId)),
    },
  );
}

/** The seat role a chamber's picture marks its members' seats with. */
const MEMBER_SEAT = "member-at-dais" as const;

/** Members of the chamber who carry a plaque at the stop. */
function plaqued(stop: OpeningStop): number {
  return stop.people.filter(
    (person) => person.role === "member" && person.plaque,
  ).length;
}

/** The picture an opening stop stands in, or null when it has none. */
export function openingStopBackdropUrl(stop: OpeningStop): string | null {
  return stop.place ? middayBackdropUrl(stop.place) : null;
}
