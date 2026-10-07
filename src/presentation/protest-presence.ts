import { protestHeldToday } from "../simulation/living-world/protests";
import type { EntityId, World } from "../simulation/types";
import type { SceneSlotRole } from "./scene-slot-contract";

/** The location key of the protest held today that this person organized or attended. */
export function protestLocationKey(
  world: World,
  personId: EntityId,
): string | null {
  const held = protestHeldToday(world, personId);
  return held ? `protest-held:${held.protestKey}` : null;
}

/**
 * The people the saved records place at today's protest: its organizer and the
 * residents whose attendance was recorded. The player is the viewer and is
 * never placed. Read-only; no crowd is added to fill the stage.
 */
export function protestPresentPeople(
  world: World,
  personId: EntityId,
): readonly {
  readonly personId: EntityId;
  readonly role: SceneSlotRole;
}[] {
  const held = protestHeldToday(world, personId);
  if (!held) return [];
  return [...new Set([held.organizerPersonId, ...held.attendeeIds])]
    .filter((id) => id !== personId && world.people[id])
    .map((id) => ({ personId: id, role: "general" as const }));
}
