import type { EntityId, PublicHolderView, World } from "../simulation";
import { publicPartyAffiliation, personName } from "../simulation";
import {
  municipalGovernmentByKey,
  primaryReading,
} from "../simulation/municipal-government";
import {
  municipalOrganizationFor,
  municipalSeats,
  type MunicipalRole,
} from "../simulation/municipal-public-work";

export type OrientationHolderDisplay = Pick<
  PublicHolderView,
  | "personId"
  | "personName"
  | "title"
  | "partyOrganizationId"
  | "serviceSince"
  | "endExclusive"
  | "residenceLabel"
>;

/** An actual saved participation, not an inferred elected term. */
export interface MunicipalOrientationHolder extends OrientationHolderDisplay {
  readonly source: {
    readonly kind: "municipal-participation";
    readonly participationId: EntityId;
    readonly organizationId: EntityId;
    readonly role: MunicipalRole;
  };
}

export function municipalOrientationHolders(
  world: World,
  governmentKey: string,
): readonly MunicipalOrientationHolder[] {
  const government = municipalGovernmentByKey(governmentKey);
  const organization = municipalOrganizationFor(world, governmentKey);
  if (!government || !organization) return [];
  const reading = primaryReading(government);
  return municipalSeats(world, governmentKey).flatMap((seat) => {
    const person = world.people[seat.personId];
    if (!person) return [];
    const title =
      seat.role === "mayor"
        ? (reading.mayor?.title ?? "Mayor")
        : seat.role === "professional-manager"
          ? (reading.manager?.title ?? "Municipal manager")
          : seat.role === "presiding-member"
            ? (reading.presidingOffice ?? seat.seatLabel ?? "Presiding member")
            : seat.role === "member"
              ? [reading.bodyName, seat.seatLabel ?? "Member"]
                  .filter(Boolean)
                  .join(" — ")
              : (seat.seatLabel ?? "Clerk");
    return [
      {
        source: {
          kind: "municipal-participation" as const,
          participationId: seat.participationId,
          organizationId: organization.id,
          role: seat.role,
        },
        personId: person.id,
        personName: personName(person),
        title,
        partyOrganizationId: publicPartyAffiliation(world, person.id),
        serviceSince: null,
        endExclusive: null,
        residenceLabel:
          world.jurisdictions[person.homeJurisdictionId]?.name ?? null,
      },
    ];
  });
}
