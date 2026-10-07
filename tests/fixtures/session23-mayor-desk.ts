import { localGoverningBodiesForJurisdiction } from "../../src/simulation/candidacy";
import { recordOrganizationParticipationState } from "../../src/simulation/life";
import { organizationParticipationStateAt } from "../../src/simulation/life-queries";
import {
  installMunicipalGovernment,
  municipalSeats,
  seatMunicipalMember,
} from "../../src/simulation/municipal-public-work";
import { synchronizeMunicipalGoverningOffices } from "../../src/simulation/governing/state-governing";
import type { World } from "../../src/simulation/types";

/**
 * Controlled downstream desktop preview in the actual generated life. No
 * election result is invented, and no account, payment or appropriation is
 * written. This does not prove that the character may file or win a race.
 */
export function recordedMayorDeskPreview(world: World): World {
  if (world.control.kind !== "person")
    throw new Error("A controlled life is required.");
  const personId = world.control.personId;
  const person = world.people[personId]!;
  const local = localGoverningBodiesForJurisdiction(
    person.homeJurisdictionId,
  ).find(
    (office) =>
      office.seat === "chief-executive" &&
      office.unit.unitType === "municipality",
  );
  if (!local)
    throw new Error("This life has no separately elected municipal executive.");
  const provenance = {
    kind: "authored" as const,
    note: "Controlled downstream mayor desk preview, not candidacy or an election result.",
  };
  let next = installMunicipalGovernment(world, {
    governmentKey: local.unit.id,
    jurisdictionId: person.homeJurisdictionId,
    formedAt: world.currentDate,
  });
  for (const seat of municipalSeats(next, local.unit.id)) {
    if (seat.role !== "mayor") continue;
    const previous = organizationParticipationStateAt(
      next,
      seat.participationId,
    );
    if (!previous)
      throw new Error("The existing mayor has no recorded seat state.");
    next = recordOrganizationParticipationState(next, {
      stableKey: `session23-preview:${world.id}:departing:${seat.participationId}`,
      participationId: seat.participationId,
      effectiveAt: world.currentDate,
      status: "ended",
      roleKind: previous.roleKind,
      context:
        "The controlled preview ends the old mayor seat before seating its test subject.",
      provenance,
      supersedesStateId: previous.id,
    });
  }
  next = seatMunicipalMember(next, {
    governmentKey: local.unit.id,
    personId,
    startedAt: world.currentDate,
    role: "mayor",
    seatLabel: local.officeTitle,
    provenance,
  });
  return synchronizeMunicipalGoverningOffices(next);
}
