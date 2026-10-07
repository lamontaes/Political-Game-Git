import { organizationParticipationStateAt } from "../life-queries";
import type { EntityId, Organization, World } from "../types";
import { partyPlatformAt } from "./party-evolution";
import { partyUnits } from "./party-registry";

export interface MovementView {
  readonly organizationId: EntityId | null;
  readonly organization: Organization | null;
  readonly members: readonly EntityId[];
  readonly platform: ReturnType<typeof partyPlatformAt>;
  /** A cause organization keeps its originating law/question in its identity. */
  readonly cause: { readonly lawMeasureId: EntityId } | null;
  readonly following: readonly EntityId[];
}

/**
 * Derive a person's movement from organization and belief history. This is a
 * read only projection: members and followers are never copied into a store.
 */
export function movementOf(
  world: World,
  personId: EntityId,
): MovementView | null {
  const partyIds = new Set(
    partyUnits(world).map((unit) => unit.organizationId),
  );
  const ledOrganizations = new Set(
    world.history.organizationParticipations
      .filter(
        (participation) =>
          participation.personId === personId &&
          participation.startedAt <= world.currentDate &&
          organizationParticipationStateAt(world, participation.id)?.status ===
            "active" &&
          organizationParticipationStateAt(
            world,
            participation.id,
          )?.roleKind?.startsWith("leader:") === true,
      )
      .map((participation) => participation.organizationId),
  );
  const organization = world.history.organizations.find(
    (candidate) =>
      ledOrganizations.has(candidate.id) &&
      (partyIds.has(candidate.id) ||
        world.history.organizationParticipations.some(
          (participation) =>
            participation.organizationId === candidate.id &&
            organizationParticipationStateAt(
              world,
              participation.id,
            )?.roleKind?.startsWith("member:") === true,
        )),
  );

  const views = world.history.privateBeliefs.filter(
    (belief) =>
      belief.formedAt <= world.currentDate &&
      belief.formation.cue?.sourcePersonId === personId,
  );
  const following = new Set(views.map((belief) => belief.personId));

  if (!organization && following.size === 0) return null;

  const members = organization
    ? [
        ...new Set(
          world.history.organizationParticipations
            .filter(
              (participation) =>
                participation.organizationId === organization.id &&
                participation.startedAt <= world.currentDate &&
                organizationParticipationStateAt(
                  world,
                  participation.id,
                )?.roleKind?.startsWith("member:") === true &&
                organizationParticipationStateAt(world, participation.id)
                  ?.status === "active" &&
                world.people[participation.personId] !== undefined,
            )
            .map((participation) => participation.personId),
        ),
      ].sort()
    : [];
  for (const member of members) following.add(member);

  const causeKey = organization?.stableKey.startsWith("law-interest:")
    ? organization.stableKey.split(":").at(-1)
    : null;

  return {
    organizationId: organization?.id ?? null,
    organization: organization ?? null,
    members,
    platform: organization ? partyPlatformAt(world, organization.id) : null,
    cause: causeKey ? { lawMeasureId: causeKey as EntityId } : null,
    following: [...following]
      .filter((id) => world.people[id] !== undefined)
      .sort(),
  };
}
