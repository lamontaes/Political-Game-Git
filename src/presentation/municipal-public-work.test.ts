import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  createOrganization,
  createOrganizationParticipation,
} from "../simulation/life";
import { addSimulationMinutes } from "../simulation/dates";
import { createScheduledActivity } from "../simulation/time-work";
import { deserializeWorld, serializeWorld } from "../simulation";
import {
  attendMunicipalMeeting,
  municipalAgendaWorkAuthorized,
  municipalGovernmentsForResident,
  prepareMunicipalAgenda,
  type MunicipalGovernmentBinding,
  type MunicipalMeetingNotice,
} from "../simulation/municipal-public-work";

function context(
  form: "council-manager" | "representative-town-meeting" = "council-manager",
) {
  let { world, playerPersonId: personId } = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: `municipal-adapter-${form}`,
    startAge: 30,
    startingLife: "ordinary-life",
  });
  const jurisdictionId = world.people[personId]!.homeJurisdictionId;
  const governmentKey = `fixture:${form}`;
  world = createOrganization(world, {
    stableKey: `municipal-government:${governmentKey}`,
    formedAt: world.currentDate,
    provenance: {
      kind: "authored",
      note: "Municipal adapter test fixture; no real legal claim.",
    },
    initialProfile: {
      name: "Test municipal government",
      classification: "sector:government",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  const binding: MunicipalGovernmentBinding = {
    governmentKey,
    organizationId,
    jurisdictionId,
    residentJurisdictionIds: [jurisdictionId],
    censusPlaceGeoid: null,
    censusGovernmentUnitId: null,
    countyGovernmentKey: null,
    identitySourceUrls: ["https://example.invalid/fixture"],
    structure: {
      form,
      bodyName: form === "council-manager" ? "Council" : "Town Meeting",
      bodySize: form === "council-manager" ? 7 : null,
      mayorIsBodyMember: null,
      professionalManager: form === "council-manager",
      assemblyMethod: form === "council-manager" ? "elected-council" : form,
    },
    agendaWorkRoles: ["custom:municipal-member"],
  };
  const clerk = world.personOrder.find((id) => id !== personId)!;
  world = createScheduledActivity(world, {
    stableKey: "fixture-public-meeting",
    title: "Public meeting",
    summary: "Authored test meeting.",
    kind: "confirmed",
    start: addSimulationMinutes(world.currentMoment, 5),
    end: addSimulationMinutes(world.currentMoment, 35),
    participantPersonIds: [clerk],
    responsiblePersonId: clerk,
    location: {
      locationKey: "fixture:civic-room",
      label: "Civic room",
      jurisdictionId,
    },
    sourceEntityIds: [organizationId],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [clerk] },
  });
  const notice: MunicipalMeetingNotice = {
    governmentKey,
    scheduledActivityId: world.history.scheduledActivities.at(-1)!.id,
    publicAttendance: "SUPPORTED",
    attendanceSourceUrls: ["https://example.invalid/fixture-notice"],
    agendaMeasureIds: [],
  };
  return { world, personId, binding, notice };
}

describe("Municipal public work uses canonical stores", () => {
  it.each(["council-manager", "representative-town-meeting"] as const)(
    "lets a citizen attend %s without gaining a role, and survives reload",
    (form) => {
      const { world, binding, notice } = context(form);
      const result = attendMunicipalMeeting(world, binding, notice);
      expect(result.ok).toBe(true);
      expect(result.world.history.organizationParticipations).toEqual(
        world.history.organizationParticipations,
      );
      expect(municipalAgendaWorkAuthorized(result.world, binding)).toBe(false);
      expect(result.world.currentMoment).not.toEqual(world.currentMoment);
      const loaded = deserializeWorld(serializeWorld(result.world));
      expect(loaded).toEqual(result.world);
      expect(
        municipalGovernmentsForResident(loaded, [binding])[0]?.structure.form,
      ).toBe(form);
      expect(attendMunicipalMeeting(loaded, binding, notice).world).toBe(
        loaded,
      );
    },
  );

  it("refuses unresolved public access without any write", () => {
    const { world, binding, notice } = context();
    const result = attendMunicipalMeeting(world, binding, {
      ...notice,
      publicAttendance: "UNKNOWN",
    });
    expect(result).toEqual({
      ok: false,
      world,
      reason: "public-attendance-unresolved",
    });
    expect(result.world).toBe(world);
  });

  it("requires a current role in this government for office work", () => {
    const { world, personId, binding, notice } = context();
    expect(prepareMunicipalAgenda(world, binding, notice).world).toBe(world);
    const authorized = createOrganizationParticipation(world, {
      stableKey: "fixture-office-role",
      personId,
      organizationId: binding.organizationId,
      startedAt: world.currentDate,
      kind: "leadership:municipal-office",
      roleKind: "custom:municipal-member",
      context: "Authored test office",
      provenance: {
        kind: "authored",
        note: "Test role established independently of attendance.",
      },
    });
    const result = prepareMunicipalAgenda(authorized, binding, notice);
    expect(result.ok).toBe(true);
    expect(result.world.history.workItems.length).toBe(
      authorized.history.workItems.length + 1,
    );
    expect(
      prepareMunicipalAgenda(
        authorized,
        { ...binding, governmentKey: "other" },
        notice,
      ).world,
    ).toBe(authorized);
  });
});
