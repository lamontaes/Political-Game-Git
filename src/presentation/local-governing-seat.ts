import {
  activeOrganizationParticipationsAt,
  organizationProfileAt,
} from "../simulation";
import {
  municipalGovernmentByKey,
  primaryReading,
} from "../simulation/municipal-government";
import type { EntityId, IsoDate, World } from "../simulation";

/**
 * The seat this person holds on their town's governing body, if any.
 *
 * Read from the same municipal-office participation every city screen reads,
 * so a seat won at the ballot box and a seat placed any other way are one
 * thing. Reading is free and writes nothing.
 */
export interface LocalGoverningSeat {
  readonly organizationId: EntityId;
  /** "City of Paducah", or the town's own name where its government was read. */
  readonly governmentName: string;
  /**
   * The body's own name where the game has read it, such as "Board of
   * Commissioners"; otherwise "governing body".
   */
  readonly bodyName: string;
  readonly since: IsoDate;
  /** The seat in the words it was recorded with, such as "Elected 2026-02-02". */
  readonly seatContext: string | null;
  /**
   * True when the game has read this town's own government in depth, so its
   * council business opens under the city's own screen.
   */
  readonly hasCityScreen: boolean;
}

export function localGoverningSeatFor(
  world: World,
  personId: EntityId,
): LocalGoverningSeat | null {
  const held = activeOrganizationParticipationsAt(world, personId).find(
    ({ participation, state }) =>
      participation.kind === "leadership:municipal-office" &&
      state.roleKind !== null &&
      state.roleKind !== "leader:municipal-clerk" &&
      state.roleKind !== "leader:municipal-manager",
  );
  if (!held) return null;
  const organization = world.history.organizations.find(
    (candidate) => candidate.id === held.participation.organizationId,
  );
  const compiledKey = organization?.stableKey.startsWith(
    "municipal-government:",
  )
    ? organization.stableKey.slice("municipal-government:".length)
    : null;
  const compiled = compiledKey ? municipalGovernmentByKey(compiledKey) : null;
  const reading = compiled ? primaryReading(compiled) : null;
  return {
    organizationId: held.participation.organizationId,
    governmentName:
      reading?.displayName ??
      organizationProfileAt(world, held.participation.organizationId)?.name ??
      "the town government",
    bodyName: reading?.bodyName ?? "governing body",
    since: held.participation.startedAt as IsoDate,
    seatContext: held.state.context,
    hasCityScreen: compiled !== null,
  };
}
