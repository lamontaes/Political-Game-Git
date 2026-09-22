import { describe, expect, it } from "vitest";
import { serializeWorld, deserializeWorld } from "../simulation";
import { createScenarioWorld } from "../simulation/demo";
import { requireLifePlace } from "../simulation/life-places";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
  municipalSeats,
  municipalOrganizationFor,
} from "../simulation/municipal-public-work";
import {
  createOrganizationParticipation,
  recordOrganizationParticipationState,
} from "../simulation/life";
import { addDays } from "../simulation/dates";
import { municipalOrientationHolders } from "./municipal-orientation-holder";
import { projectWorldOrientation } from "./living-world-orientation";
import { projectOrientationView } from "./world-orientation";

function fixture(placeKey = "5114968") {
  const place = requireLifePlace(placeKey);
  const government = municipalGovernmentForLifePlace(place)!;
  let world = createScenarioWorld(
    "municipal-orientation:" + placeKey,
    place.context,
    { peopleCount: 8 },
  );
  world = installMunicipalGovernment(world, {
    governmentKey: government.key,
    jurisdictionId: place.context.jurisdiction.id,
    formedAt: world.currentDate,
  });
  return { world, government };
}

describe("saved municipal holders in opening", () => {
  it("shows actual members and manager with participation identity, without invented terms or writes", () => {
    const { world: initialWorld, government } = fixture();
    let world = initialWorld;
    for (const [i, role] of (
      ["member", "professional-manager"] as const
    ).entries()) {
      world = seatMunicipalMember(world, {
        governmentKey: government.key,
        personId: world.personOrder[i + 1]!,
        startedAt: world.currentDate,
        role,
        seatLabel: role === "member" ? "Seat 1" : "City Manager",
      });
    }
    const before = serializeWorld(world);
    const holders = municipalOrientationHolders(world, government.key);
    expect(holders).toHaveLength(2);
    for (const holder of holders) {
      expect(
        world.history.organizationParticipations.some(
          (p) =>
            p.id === holder.source.participationId &&
            p.personId === holder.personId &&
            p.organizationId === holder.source.organizationId,
        ),
      ).toBe(true);
      expect(holder).not.toHaveProperty("termId");
      expect(holder.serviceSince).toBeNull();
      expect(holder.endExclusive).toBeNull();
    }
    const orientation = projectWorldOrientation(world, world.personOrder[0]!);
    expect(
      orientation
        .locality!.governments.flatMap((g) => g.holders.map((h) => h.personId))
        .sort(),
    ).toEqual(holders.map((h) => h.personId).sort());
    const represented = orientation.locality!.governments.find(
      (g) => g.holders.length > 0,
    )!;
    expect(represented.organizationId).toBe(holders[0]!.source.organizationId);
    const local = projectOrientationView(
      orientation,
      (code) => code,
    ).steps.find((s) => s.key === "locality")!;
    expect(local.people.map((p) => p.personId).sort()).toEqual(
      holders.map((h) => h.personId).sort(),
    );
    expect(
      municipalOrientationHolders(deserializeWorld(before), government.key),
    ).toEqual(holders);
    expect(serializeWorld(world)).toBe(before);
  });

  it("excludes nonoffice, future and ended participations", () => {
    const { world: initialWorld, government } = fixture();
    let world = initialWorld;
    const org = municipalOrganizationFor(world, government.key)!;
    const provenance = {
      kind: "authored" as const,
      note: "Bounded visibility fixture",
    };
    for (const [i, future] of [false, true].entries()) {
      world = createOrganizationParticipation(world, {
        stableKey: "visibility:" + i,
        personId: world.personOrder[i + 1]!,
        organizationId: org.id,
        startedAt: future ? addDays(world.currentDate, 1) : world.currentDate,
        initialStatus: future ? "expected" : "active",
        kind: "leadership:municipal-office",
        roleKind: future ? "leader:municipal-member" : null,
        context: "Fixture",
        provenance,
      });
    }
    world = seatMunicipalMember(world, {
      governmentKey: government.key,
      personId: world.personOrder[3]!,
      startedAt: world.currentDate,
      role: "member",
      seatLabel: "Seat 3",
    });
    const seat = municipalSeats(world, government.key)[0]!;
    const prior = world.history.organizationParticipationStates.find(
      (s) => s.participationId === seat.participationId,
    )!;
    world = recordOrganizationParticipationState(world, {
      stableKey: "visibility:ended",
      participationId: seat.participationId,
      effectiveAt: world.currentDate,
      status: "ended",
      roleKind: prior.roleKind,
      context: prior.context,
      provenance,
      supersedesStateId: prior.id,
    });
    const before = serializeWorld(world);
    expect(municipalOrientationHolders(world, government.key)).toEqual([]);
    expect(serializeWorld(world)).toBe(before);
  });

  it("shows a saved D.C. mayor and council member by actual roles and leaves an empty institution unfilled", () => {
    const { world: initialWorld, government } = fixture("1150000");
    let world = initialWorld;
    expect(municipalOrientationHolders(world, government.key)).toEqual([]);
    for (const [i, role] of (["mayor", "member"] as const).entries())
      world = seatMunicipalMember(world, {
        governmentKey: government.key,
        personId: world.personOrder[i + 1]!,
        startedAt: world.currentDate,
        role,
        seatLabel: role === "member" ? "Ward 1" : "Mayor",
      });
    const before = serializeWorld(world);
    const view = projectOrientationView(
      projectWorldOrientation(world, world.personOrder[0]!),
      (code) => code,
    );
    expect(
      view.steps
        .find((s) => s.key === "state")!
        .people.map((p) => p.personId)
        .sort(),
    ).toEqual(world.personOrder.slice(1, 3).sort());
    expect(serializeWorld(world)).toBe(before);
  });
});
