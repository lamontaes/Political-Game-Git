import {
  homePartyChapters,
  organizationProfileAt,
  type EntityId,
  type World,
} from "../simulation";

/**
 * The player-facing name of an organization a pin points at, or null when
 * this world has no such organization.
 *
 * A home party chapter is named the way W's chapter record names it; any other
 * organization uses its current recorded profile. Nothing is created or
 * guessed for an id the world does not hold.
 */
export function organizationRefLabel(
  world: World,
  organizationId: EntityId,
): string | null {
  const chapter = homePartyChapters(world).find(
    (candidate) => candidate.organizationId === organizationId,
  );
  if (chapter) return chapter.name;
  return organizationProfileAt(world, organizationId)?.name ?? null;
}
