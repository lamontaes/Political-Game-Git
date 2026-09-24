import type { EntityId, World } from "../simulation/types";

/** The saved relationship change, rather than an invitation's existence, earns a chronicle line. */
export function consequentialSocialEventIds(world: World): ReadonlySet<EntityId> {
  return new Set(
    world.history.relationshipInteractions.flatMap((interaction) =>
      interaction.eventId &&
      (interaction.significance === "meaningful" ||
        interaction.significance === "major")
        ? [interaction.eventId]
        : [],
    ),
  );
}

/** Suppress routine invitation steps only in Journal projections, never in history or Calendar. */
export function isRoutineSocialOccasion(
  consequentialEventIds: ReadonlySet<EntityId>,
  eventId: EntityId,
  type: string,
): boolean {
  if (
    type !== "life.social-occasion-invited" &&
    type !== "life.social-invitation-accepted" &&
    type !== "life.social-invitation-declined" &&
    type !== "life.social-occasion-attended"
  )
    return false;
  return !consequentialEventIds.has(eventId);
}
