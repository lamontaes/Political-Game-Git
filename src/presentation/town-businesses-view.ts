import {
  BUSINESS_OWNER_WORK_KIND,
  localBusinessesIn,
} from "../simulation/local-economy";
import {
  organizationProfileAt,
  workStatusAt,
  workRoleAt,
} from "../simulation/life-queries";
import type { EntityId, World } from "../simulation/types";

export interface TownBusinessLine {
  readonly organizationId: EntityId;
  readonly name: string;
  readonly ownerLine: string | null;
  readonly staffLine: string;
}

/**
 * The businesses in a town, by name, with who owns them and how many work
 * there. A read: it writes nothing and spends no time. What a business takes
 * in is not shown; a neighbor does not know another shop's books.
 */
export function projectTownBusinesses(
  world: World,
  jurisdictionId: EntityId,
): readonly TownBusinessLine[] {
  return localBusinessesIn(world, jurisdictionId).map(({ organization }) => {
    const working = world.history.workRelationships.filter(
      (work) =>
        work.organizationId === organization.id &&
        workStatusAt(world, work.id)?.status === "active",
    );
    const owner = working.find(
      (work) => work.kind === BUSINESS_OWNER_WORK_KIND,
    );
    const ownerPerson = owner ? world.people[owner.personId] : undefined;
    const ownerTitle = owner ? workRoleAt(world, owner.id)?.title : undefined;
    const staff = working.length - (owner ? 1 : 0);
    return {
      organizationId: organization.id,
      name: organizationProfileAt(world, organization.id)?.name ?? "A business",
      ownerLine: ownerPerson
        ? `${ownerPerson.givenName} ${ownerPerson.familyName}, ${(ownerTitle ?? "owner").toLowerCase()}`
        : null,
      staffLine:
        staff === 0
          ? "No one else works there."
          : staff === 1
            ? "One other person works there."
            : `${staff} other people work there.`,
    };
  });
}
