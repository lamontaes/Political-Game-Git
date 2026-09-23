import type { EntityId, World } from "../simulation";
import {
  controlHandoffs,
  lifeEnd,
  observerAnchorPersonId,
} from "../simulation/people-continuation";
import {
  projectLifeContinuation,
  type LifeContinuationView,
} from "./people-continuation";
import type { PersonalGoalStatus } from "./people-goals";
import type { ShellSurface } from "./shell-navigation";

/**
 * How the shell reads a played life that has ended, and a world being watched
 * with nobody played (UI mount of CRUNCH46 P5/P6). Pure.
 */

/**
 * Whose eyes the shell reads the world through: the controlled character, or
 * — while observing — the last character played, or, in a world watched from
 * its start, the resident it is watched from. Null when there is nobody.
 */
export function shellViewpointPersonId(world: World): EntityId | null {
  if (world.control.kind === "person") return world.control.personId;
  const last = lastPlayedPersonId(world);
  return last ?? observerAnchorPersonId(world);
}

function lastPlayedPersonId(world: World): EntityId | null {
  const last = controlHandoffs(world).at(-1)?.fromPersonId ?? null;
  return last !== null && world.people[last] ? last : null;
}

/** A world opened with nobody played, rather than one whose life ended. */
export function watchedFromStart(world: World): boolean {
  return (
    world.control.kind === "observer" &&
    lastPlayedPersonId(world) === null &&
    observerAnchorPersonId(world) !== null
  );
}

export function isObserving(world: World): boolean {
  return world.control.kind === "observer";
}

/**
 * Whether the shell may only read: nobody is played, or the played life has
 * ended and the player has not yet chosen what follows.
 */
export function shellReadOnly(world: World): boolean {
  if (world.control.kind !== "person") return true;
  return lifeEnd(world, world.control.personId) !== null;
}

/**
 * What follows the played life, if it has ended. While observing this is the
 * last life played, so the player can still continue as its family.
 */
export function playedLifeContinuation(
  world: World,
): LifeContinuationView | null {
  // Nobody was ever played in a world watched from its start, so there is no
  // life for anybody to continue.
  const personId =
    world.control.kind === "person"
      ? world.control.personId
      : lastPlayedPersonId(world);
  return personId === null ? null : projectLifeContinuation(world, personId);
}

/**
 * The world the read-only shell draws from while observing.
 *
 * Reading surfaces answer "as seen by" a person, so the lens names the last
 * character played. It is never committed, saved or written from: the
 * session keeps the observer World itself, and the shell refuses writes.
 */
export function observerReadingLens(world: World): World {
  if (world.control.kind === "person") return world;
  const personId = shellViewpointPersonId(world);
  return personId === null
    ? world
    : { ...world, control: { kind: "person", personId } };
}

/** Surfaces that only read, and so stay open while nobody is played. */
const READ_ONLY_SURFACES: readonly (ShellSurface | "entity")[] = [
  "scene",
  "people",
  "news",
  "journal",
  "government",
  "government-map",
  "municipal",
  "parties",
  "politics",
  "options",
  "patch-notes",
  "world-record",
  "entity",
];

export function surfaceOpenWhileReadOnly(
  surface: ShellSurface | "entity",
): boolean {
  return READ_ONLY_SURFACES.includes(surface);
}

export const READ_ONLY_REFUSAL =
  "Nobody is being played, so nothing can be done in the world. Choose who to continue as, or keep browsing.";

/** The status changes a private aim offers from where it stands. */
export function personalGoalActions(
  status: PersonalGoalStatus,
): readonly { readonly status: PersonalGoalStatus; readonly label: string }[] {
  switch (status) {
    case "active":
      return [
        { status: "paused", label: "Pause" },
        { status: "achieved", label: "Mark done" },
        { status: "abandoned", label: "Drop" },
      ];
    case "paused":
      return [
        { status: "active", label: "Resume" },
        { status: "abandoned", label: "Drop" },
      ];
    default:
      return [];
  }
}

export const PERSONAL_GOAL_STATUS_LABEL: Readonly<
  Record<PersonalGoalStatus, string>
> = {
  active: "Active",
  paused: "Paused",
  abandoned: "Dropped",
  achieved: "Done",
};
