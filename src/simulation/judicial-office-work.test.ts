import { describe, it, expect } from "vitest";
import {
  createDemoWorld,
  serializeWorld,
  deserializeWorld,
  addSimulationMinutes,
  createScheduledActivity,
  recordWorkStatus,
  recordWorkRole,
  recordPartnershipState,
  recordHouseholdMembershipState,
  createPartnership,
  createHousehold,
  startHouseholdMembership,
} from "./index";
import { initializeJudicialOfficePractice } from "./judicial-office-start";
import {
  judicialOfficeContexts,
  judicialOfficeCoverage,
  judicialOfficeAssignments,
  receiveJudicialOfficeWork,
  respondToJudicialOfficeWork,
} from "./judicial-office-work";
import { JUDICIAL_OFFICE_CONTENT } from "./judicial-office-content";
import type { World } from "./types";

function fixture(seed = "jud-work2") {
  let world = createDemoWorld(seed);
  world = {
    ...world,
    control: { kind: "person", personId: world.personOrder[0]! },
  };
  const result = initializeJudicialOfficePractice(world, {
    mode: "custom",
    jurisdictionId: world.jurisdictionOrder[0]!,
  });
  if (!result.ok) throw new Error(result.reason);
  world = result.world;
  const office = judicialOfficeContexts(world)[0]!;
  return { world, office };
}
function withSpouse(world: World): World {
  const principalId =
    world.control.kind === "person"
      ? world.control.personId
      : world.personOrder[0]!;
  const spouseId = world.personOrder.at(-1)!;
  const provenance = {
    kind: "authored" as const,
    note: "Explicit married household test premise.",
  };
  world = createPartnership(world, {
    stableKey: "jud-test:marriage",
    personIds: [principalId, spouseId],
    kind: "legal:marriage",
    startedAt: world.currentDate,
    provenance,
  });
  world = createHousehold(world, {
    stableKey: "jud-test:home",
    label: "Shared household",
    formedAt: world.currentDate,
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  for (const personId of [principalId, spouseId])
    world = startHouseholdMembership(world, {
      stableKey: `jud-test:member:${personId}`,
      personId,
      householdId,
      startedAt: world.currentDate,
      residenceRole: "shared",
      kind: "resident:spouse",
      provenance,
    });
  return world;
}
function receive(
  world: World,
  courtId: ReturnType<
    typeof judicialOfficeContexts
  >[number]["courtOrganizationId"],
  id: string,
) {
  const result = receiveJudicialOfficeWork(
    world,
    courtId,
    id as `SEED-${string}`,
    addSimulationMinutes(world.currentMoment, 10),
  );
  if (!result.ok) throw new Error(result.reason);
  return result.world;
}

describe("JUD-WORK2 canonical office consumer", () => {
  it("uses real canonical organizations and dated work roles without source-law promotion", () => {
    const { world, office } = fixture();
    expect(office.principalId).toBe(world.personOrder[0]);
    expect(office.courtOrganizationId).toBeTruthy();
    expect(
      world.history.workRelationships.some(
        (r) => r.id === office.workRelationshipId,
      ),
    ).toBe(true);
    expect(
      initializeJudicialOfficePractice(world, {
        mode: "custom",
        jurisdictionId: office.jurisdictionId,
      }).world,
    ).toBe(world);
    expect(
      world.history.organizations.find(
        (o) => o.id === office.courtOrganizationId,
      )?.provenance.kind,
    ).toBe("authored");
  });
  it.each(
    JUDICIAL_OFFICE_CONTENT.flatMap((c) =>
      c.responses.map((response) => ({ id: c.kernelId, response })),
    ),
  )(
    "records $id/$response.key review, player response, relationship and reload exactly once",
    ({ id, response }) => {
      const f = fixture();
      let world = id === "SEED-49" ? withSpouse(f.world) : f.world;
      const input = world;
      const before = serializeWorld(input);
      world = receive(input, f.office.courtOrganizationId, id);
      expect(serializeWorld(input)).toBe(before);
      const assignment = judicialOfficeAssignments(
        world,
        f.office.courtOrganizationId,
      )[0]!;
      expect(assignment.blocker).toBeNull();
      expect(assignment.evidence.relatedEntityIds).toHaveLength(2);
      expect(
        receiveJudicialOfficeWork(
          world,
          f.office.courtOrganizationId,
          id,
          world.currentMoment,
        ).world,
      ).toBe(world);
      const snapshot = serializeWorld(world);
      judicialOfficeAssignments(world, f.office.courtOrganizationId);
      judicialOfficeCoverage(world, f.office.courtOrganizationId);
      expect(serializeWorld(world)).toBe(snapshot);
      const result = respondToJudicialOfficeWork(
        world,
        f.office.courtOrganizationId,
        assignment.item.id,
        response.key,
      );
      if (!result.ok) throw new Error(result.reason);
      const completed = judicialOfficeAssignments(
        result.world,
        f.office.courtOrganizationId,
      )[0]!;
      expect(completed.state.status).toBe("completed");
      expect(completed.response?.involvedEntityIds).toContain(
        assignment.evidence.id,
      );
      expect(assignment.evidence.relatedEntityIds).toContain(
        assignment.source.id,
      );
      expect(completed.activityState.status).toBe("completed");
      expect(result.world.currentMoment).toEqual(
        addSimulationMinutes(world.currentMoment, 40),
      );
      expect(result.world.history.claims.at(-1)?.eventId).toBe(
        completed.response?.id,
      );
      expect(completed.response?.context.choice).toBe(response.label);
      if (response.recipient === "principal") {
        expect(result.world.history.relationshipInteractions).toHaveLength(
          world.history.relationshipInteractions.length,
        );
      } else {
        expect(
          result.world.history.relationshipInteractions.at(-1)?.eventId,
        ).toBe(completed.response?.id);
      }
      expect(result.world.history.workItems).toHaveLength(
        world.history.workItems.length + (response.followUp ? 1 : 0),
      );
      expect(
        serializeWorld(deserializeWorld(serializeWorld(result.world))),
      ).toBe(serializeWorld(result.world));
      const repeat = respondToJudicialOfficeWork(
        result.world,
        f.office.courtOrganizationId,
        assignment.item.id,
        response.key,
      );
      expect(repeat.ok).toBe(false);
      expect(repeat.world).toBe(result.world);
    },
  );
  it("accounts for all 60 without relabeling case and selection blockers", () => {
    const { world, office } = fixture();
    const rows = judicialOfficeCoverage(
      withSpouse(world),
      office.courtOrganizationId,
    );
    expect(rows).toHaveLength(60);
    expect(
      rows
        .filter((r) => r.consumerStatus === "supported-office-practice")
        .map((r) => r.id),
    ).toEqual(JUDICIAL_OFFICE_CONTENT.map((c) => c.kernelId));
    for (const row of rows.filter((r) => r.consumerStatus === "blocked")) {
      const r = receiveJudicialOfficeWork(
        world,
        office.courtOrganizationId,
        row.id,
        world.currentMoment,
      );
      expect(r.ok).toBe(false);
      expect(r.world).toBe(world);
      expect(row.blockers.length).toBeGreaterThan(0);
    }
  });
  it("refuses an observer or another controlled person without any write", () => {
    const { world, office } = fixture();
    for (const changed of [
      { ...world, control: { kind: "observer" as const } },
      {
        ...world,
        control: { kind: "person" as const, personId: world.personOrder[1]! },
      },
    ]) {
      expect(judicialOfficeContexts(changed)).toEqual([]);
      const r = receiveJudicialOfficeWork(
        changed,
        office.courtOrganizationId,
        "SEED-50",
        changed.currentMoment,
      );
      expect(r.ok).toBe(false);
      expect(r.world).toBe(changed);
    }
  });
  it("rechecks expired principal and insider work at response time", () => {
    const { world: base, office } = fixture();
    const world = receive(base, office.courtOrganizationId, "SEED-41");
    const assignment = judicialOfficeAssignments(
      world,
      office.courtOrganizationId,
    )[0]!;
    for (const relationship of world.history.workRelationships.filter(
      (r) =>
        r.id === office.workRelationshipId ||
        r.stableKey.endsWith(":junior-law-clerk"),
    )) {
      const status = world.history.workStatuses
        .filter((s) => s.workRelationshipId === relationship.id)
        .at(-1)!;
      const ended = recordWorkStatus(world, {
        stableKey: `end:${relationship.id}`,
        workRelationshipId: relationship.id,
        effectiveAt: world.currentDate,
        status: "ended",
        reason: "Departure",
        provenance: { kind: "authored", note: "Departure test" },
        supersedesStatusId: status.id,
      });
      const r = respondToJudicialOfficeWork(
        ended,
        office.courtOrganizationId,
        assignment.item.id,
        "request-account",
      );
      expect(r.ok).toBe(false);
      expect(r.world).toBe(ended);
    }
  });
  it("requires marriage and shared household; a generic household member is insufficient", () => {
    const { world, office } = fixture();
    expect(
      receiveJudicialOfficeWork(
        world,
        office.courtOrganizationId,
        "SEED-49",
        world.currentMoment,
      ).ok,
    ).toBe(false);
    expect(
      receiveJudicialOfficeWork(
        withSpouse(world),
        office.courtOrganizationId,
        "SEED-49",
        world.currentMoment,
      ).ok,
    ).toBe(true);
  });
  it("refuses schedule contention atomically and preserves earlier commitments", () => {
    const { world: base, office } = fixture();
    const world = receive(base, office.courtOrganizationId, "SEED-50");
    const collision = receiveJudicialOfficeWork(
      world,
      office.courtOrganizationId,
      "SEED-43",
      addSimulationMinutes(world.currentMoment, 10),
    );
    expect(collision.ok).toBe(false);
    expect(collision.world).toBe(world);
    const earlier = createScheduledActivity(world, {
      stableKey: "earlier",
      title: "Prior commitment",
      summary: "Existing appointment",
      kind: "confirmed",
      start: world.currentMoment,
      end: addSimulationMinutes(world.currentMoment, 5),
      participantPersonIds: [office.principalId],
      responsiblePersonId: office.principalId,
      location: {
        jurisdictionId: office.jurisdictionId,
        label: office.name,
        locationKey: "office",
      },
      sourceEntityIds: [
        judicialOfficeAssignments(world, office.courtOrganizationId)[0]!.source
          .id,
      ],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [office.principalId] },
    });
    const a = judicialOfficeAssignments(
      earlier,
      office.courtOrganizationId,
    )[0]!;
    const r = respondToJudicialOfficeWork(
      earlier,
      office.courtOrganizationId,
      a.item.id,
      "record-reading",
    );
    expect(r.ok).toBe(false);
    expect(r.world).toBe(earlier);
  });
  it("does not accept a judicial title on an unrelated occupation", () => {
    const { world, office } = fixture();
    const role = world.history.workRoles.find(
      (r) => r.workRelationshipId === office.workRelationshipId,
    )!;
    const renamed = recordWorkRole(world, {
      stableKey: "test:unrelated-role",
      workRelationshipId: role.workRelationshipId,
      effectiveAt: world.currentDate,
      title: "Chief Judge",
      occupationClassification: "service:janitor",
      locationJurisdictionId: role.locationJurisdictionId,
      timeDemand: role.timeDemand,
      provenance: { kind: "authored", note: "Title is not authority." },
      supersedesRoleId: role.id,
    });
    const snapshot = serializeWorld(renamed);
    expect(judicialOfficeContexts(renamed)).toEqual([]);
    const result = receiveJudicialOfficeWork(
      renamed,
      office.courtOrganizationId,
      "SEED-50",
      renamed.currentMoment,
    );
    expect(result.ok).toBe(false);
    expect(result.world).toBe(renamed);
    expect(serializeWorld(renamed)).toBe(snapshot);
  });
  it("rechecks marriage and co-residence after a household review opens", () => {
    const f = fixture();
    const world = receive(
      withSpouse(f.world),
      f.office.courtOrganizationId,
      "SEED-49",
    );
    const assignment = judicialOfficeAssignments(
      world,
      f.office.courtOrganizationId,
    )[0]!;
    const marriage = world.history.partnerships.find(
      (p) => p.stableKey === "jud-test:marriage",
    )!;
    const state = world.history.partnershipStates.find(
      (p) => p.partnershipId === marriage.id,
    )!;
    const separated = recordPartnershipState(world, {
      stableKey: "test:separated",
      partnershipId: marriage.id,
      effectiveAt: world.currentDate,
      status: "ended",
      provenance: { kind: "authored", note: "Test separation" },
      supersedesStateId: state.id,
    });
    const membership = world.history.householdMemberships.find(
      (m) => m.stableKey === `jud-test:member:${world.personOrder.at(-1)}`,
    )!;
    const membershipState = world.history.householdMembershipStates.find(
      (m) => m.membershipId === membership.id,
    )!;
    const moved = recordHouseholdMembershipState(world, {
      stableKey: "test:moved",
      membershipId: membership.id,
      effectiveAt: world.currentDate,
      status: "ended",
      residenceRole: "shared",
      kind: "resident:spouse",
      provenance: { kind: "authored", note: "Test move" },
      supersedesStateId: membershipState.id,
    });
    for (const changed of [separated, moved]) {
      const result = respondToJudicialOfficeWork(
        changed,
        f.office.courtOrganizationId,
        assignment.item.id,
        "seek-guidance",
      );
      expect(result.ok).toBe(false);
      expect(result.world).toBe(changed);
    }
  });
  it("refuses forged responses and missing offices without time or history writes", () => {
    const { world: base, office } = fixture();
    const world = receive(base, office.courtOrganizationId, "SEED-50");
    const assignment = judicialOfficeAssignments(
      world,
      office.courtOrganizationId,
    )[0]!;
    const snapshot = serializeWorld(world);
    const result = respondToJudicialOfficeWork(
      world,
      office.courtOrganizationId,
      assignment.item.id,
      "issue-ruling",
    );
    expect(result.ok).toBe(false);
    expect(result.world).toBe(world);
    expect(serializeWorld(world)).toBe(snapshot);
    expect(judicialOfficeAssignments(world, world.personOrder[0]!)).toEqual([]);
  });
});
