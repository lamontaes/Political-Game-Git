import { activeOrganizationParticipationsAt } from "../life-queries";
import type { EntityId, World } from "../types";
import { COUNTY_BOARD_MEMBER } from "./local-government-roles";

/**
 * A seat on a town council or county board, as an office the person holds.
 *
 * A state or federal seat is a work relationship. A council seat is an
 * organization participation in the town's government, the same record a
 * campaign winner and every seated resident gets, so the office a standing
 * voting preference binds to is that participation. Reading it writes nothing.
 */

/**
 * The roles that cast a ballot on the council's floor. A mayor is not one.
 * Read on first use, not at load: local-government-seats imports back into
 * this module, and a set built at load reads the county role before it exists.
 */
function councilSeatRoles(): ReadonlySet<string> {
  return new Set([
    "leader:municipal-member",
    "leader:municipal-presiding-member",
    COUNTY_BOARD_MEMBER,
  ]);
}

export interface CouncilSeatOffice {
  readonly participationId: EntityId;
  readonly organizationId: EntityId;
  readonly personId: EntityId;
}

/** The person's current council seats, in the order their records began. */
export function councilSeatsHeldBy(
  world: World,
  personId: EntityId,
): readonly CouncilSeatOffice[] {
  return activeOrganizationParticipationsAt(world, personId).flatMap(
    ({ participation, state }) =>
      participation.kind === "leadership:municipal-office" &&
      state.roleKind !== null &&
      councilSeatRoles().has(state.roleKind)
        ? [
            {
              participationId: participation.id,
              organizationId: participation.organizationId,
              personId,
            },
          ]
        : [],
  );
}

/** This id, if it is a council seat the person holds today. */
export function councilSeatOffice(
  world: World,
  personId: EntityId,
  participationId: EntityId,
): CouncilSeatOffice | null {
  return (
    councilSeatsHeldBy(world, personId).find(
      (seat) => seat.participationId === participationId,
    ) ?? null
  );
}
