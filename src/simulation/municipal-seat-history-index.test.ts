import { describe, expect, it } from "vitest";

import { createScenarioWorld } from "./demo";
import { recordOrganizationParticipationState } from "./life";
import { requireLifePlace } from "./life-places";
import { municipalGovernmentForLifePlace } from "./municipal-government";
import {
  installMunicipalGovernment,
  municipalSeats,
  seatMunicipalMember,
} from "./municipal-public-work";
import { deserializeWorld, serializeWorld } from "./serialization";

describe("municipal seat history lookups", () => {
  it("updates a warmed roster after resignation without changing the earlier snapshot", () => {
    const place = requireLifePlace("3209700");
    const government = municipalGovernmentForLifePlace(place)!;
    let world = createScenarioWorld(
      "municipal-index-resignation",
      place.context,
      {
        peopleCount: 8,
      },
    );
    world = installMunicipalGovernment(world, {
      governmentKey: government.key,
      jurisdictionId: place.context.jurisdiction.id,
      formedAt: world.currentDate,
    });
    expect(municipalSeats(world, government.key)).toEqual([]);
    world = seatMunicipalMember(world, {
      governmentKey: government.key,
      personId: world.personOrder[1]!,
      startedAt: world.currentDate,
      role: "member",
      seatLabel: "Seat 1",
    });
    const seats = municipalSeats(world, government.key);
    expect(seats).toHaveLength(1);
    const prior = world.history.organizationParticipationStates.find(
      (state) => state.participationId === seats[0]!.participationId,
    )!;
    const resigned = recordOrganizationParticipationState(world, {
      stableKey: "municipal-index-resignation:ended",
      participationId: prior.participationId,
      effectiveAt: world.currentDate,
      status: "ended",
      roleKind: prior.roleKind,
      context: prior.context,
      provenance: prior.provenance,
      supersedesStateId: prior.id,
    });
    expect(municipalSeats(resigned, government.key)).toEqual([]);
    expect(municipalSeats(world, government.key)).toEqual(seats);
    expect(
      municipalSeats(
        deserializeWorld(serializeWorld(resigned)),
        government.key,
      ),
    ).toEqual([]);
  });
});
