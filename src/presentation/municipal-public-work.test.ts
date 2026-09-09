import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../simulation/demo";
import { requireLifePlace } from "../simulation/life-places";
import {
  addSimulationMinutes,
  simulationMinutesBetween,
} from "../simulation/dates";
import {
  scheduledActivityState,
  workItemState,
  createScheduledActivity,
} from "../simulation/time-work";
import { recordOrganizationParticipationState } from "../simulation/life";
import { deserializeWorld, serializeWorld } from "../simulation";
import {
  attendMunicipalPublicMeeting,
  installMunicipalGovernment,
  municipalMeetings,
  scheduleMunicipalMeeting,
  seatMunicipalMember,
  performMunicipalMeetingNotes,
} from "../simulation/municipal-public-work";
import { municipalVenueForActivity } from "./municipal-venue";
import bindings from "./municipal-venue-bindings.json";
import { prepareMunicipalMeetingNotes } from "./municipal-workspace";

function context(governmentKey: string, placeKey: string, seriesKey: string) {
  const place = requireLifePlace(placeKey);
  let world = createScenarioWorld(`public-${governmentKey}`, place.context, {
    peopleCount: 12,
  });
  const personId = world.personOrder[0]!;
  world = { ...world, control: { kind: "person", personId } };
  world = installMunicipalGovernment(world, {
    governmentKey,
    jurisdictionId: place.context.jurisdiction.id,
    formedAt: world.currentDate,
  });
  world = scheduleMunicipalMeeting(world, {
    governmentKey,
    seriesKey,
    start: addSimulationMinutes(world.currentMoment, 5),
    end: addSimulationMinutes(world.currentMoment, 35),
    participantPersonIds: [world.personOrder[1]!],
    responsiblePersonId: world.personOrder[1]!,
    jurisdictionId: place.context.jurisdiction.id,
  });
  return {
    world,
    personId,
    governmentKey,
    meeting: municipalMeetings(world, governmentKey)[0]!,
  };
}

describe("explicit municipal venue candidates", () => {
  it.each(bindings)(
    "preserves exact source venue for $governmentKey / $seriesKey",
    (binding) => {
      const input = context(
        binding.governmentKey,
        "3209700",
        binding.seriesKey,
      );
      const venue = municipalVenueForActivity(input.world, input.meeting.id);
      expect(venue?.sceneId).toBe(binding.sceneId);
      expect(venue?.reason).toContain(binding.venue);
      expect(venue?.reason).toContain(binding.representation);
      const unanchored = {
        ...input.world,
        history: {
          ...input.world.history,
          scheduledActivities: input.world.history.scheduledActivities.map(
            (row) =>
              row.id === input.meeting.id
                ? { ...row, sourceEntityIds: [] }
                : row,
          ),
        },
      };
      expect(
        municipalVenueForActivity(unanchored, input.meeting.id),
      ).toBeNull();
      const privateWork = {
        ...input.world,
        history: {
          ...input.world.history,
          scheduledActivities: input.world.history.scheduledActivities.map(
            (row) =>
              row.id === input.meeting.id
                ? {
                    ...row,
                    location: {
                      ...row.location,
                      locationKey: `municipal-notes:${binding.governmentKey}:${input.personId}`,
                    },
                  }
                : row,
          ),
        },
      };
      expect(
        municipalVenueForActivity(privateWork, input.meeting.id),
      ).toBeNull();
    },
  );
});

describe("municipal public work shares saved canonical state", () => {
  it("completes authorized personal work once through canonical time and saved Work", () => {
    const input = context("us-nv-carson-city", "3209700", "regular");
    expect(
      performMunicipalMeetingNotes(
        input.world,
        input.governmentKey,
        input.meeting.id,
      ).world,
    ).toBe(input.world);
    const member = seatMunicipalMember(input.world, {
      governmentKey: input.governmentKey,
      personId: input.personId,
      startedAt: input.world.currentDate,
      role: "member",
      seatLabel: "Explicit test seat",
    });
    const ready = prepareMunicipalMeetingNotes(
      member,
      input.governmentKey,
      input.meeting.id,
    ).world;
    const item = ready.history.workItems.at(-1)!;
    expect(workItemState(ready, item.id).status).toBe("active");
    const result = performMunicipalMeetingNotes(
      ready,
      input.governmentKey,
      input.meeting.id,
    );
    expect(result.ok).toBe(true);
    expect(
      simulationMinutesBetween(ready.currentMoment, result.world.currentMoment),
    ).toBe(20);
    const finished = workItemState(result.world, item.id);
    expect(finished.status).toBe("completed");
    expect(finished.completedEffortMinutes).toBe(20);
    expect(
      result.world.history.events.some(
        (event) => event.id === finished.outcomeEventId,
      ),
    ).toBe(true);
    const restored = deserializeWorld(serializeWorld(result.world));
    expect(restored).toEqual(result.world);
    expect(
      performMunicipalMeetingNotes(
        restored,
        input.governmentKey,
        input.meeting.id,
      ).world,
    ).toBe(restored);
    expect(restored.history.organizationParticipations).toEqual(
      member.history.organizationParticipations,
    );

    const state = ready.history.organizationParticipationStates.at(-1)!;
    const departed = recordOrganizationParticipationState(ready, {
      ...state,
      stableKey: "test:municipal-departure",
      status: "ended",
      effectiveAt: ready.currentDate,
      supersedesStateId: state.id,
    });
    expect(
      performMunicipalMeetingNotes(
        departed,
        input.governmentKey,
        input.meeting.id,
      ).world,
    ).toBe(departed);

    const conflict = createScheduledActivity(ready, {
      stableKey: "test:municipal-conflict",
      title: "Existing personal commitment",
      summary: "Explicit test conflict",
      kind: "confirmed",
      start: addSimulationMinutes(ready.currentMoment, 5),
      end: addSimulationMinutes(ready.currentMoment, 30),
      participantPersonIds: [input.personId],
      responsiblePersonId: input.personId,
      location: input.meeting.location,
      sourceEntityIds: [input.meeting.id],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [input.personId] },
    });
    expect(
      performMunicipalMeetingNotes(
        conflict,
        input.governmentKey,
        input.meeting.id,
      ).world,
    ).toBe(conflict);
  });
  it.each([
    ["us-va-charlottesville", "5114968", "stated-meeting"],
    ["us-nv-carson-city", "3209700", "regular"],
  ])(
    "lets an ordinary citizen attend %s without acquiring a role",
    (key, place, series) => {
      const { world, governmentKey, meeting } = context(key!, place!, series!);
      expect(
        prepareMunicipalMeetingNotes(world, governmentKey, meeting.id).world,
      ).toBe(world);
      const result = attendMunicipalPublicMeeting(
        world,
        governmentKey,
        meeting.id,
      );
      expect(result.ok).toBe(true);
      expect(result.world.history.organizationParticipations).toEqual(
        world.history.organizationParticipations,
      );
      expect(result.world.currentMoment).not.toEqual(world.currentMoment);
      const loaded = deserializeWorld(serializeWorld(result.world));
      expect(loaded).toEqual(result.world);
      expect(
        attendMunicipalPublicMeeting(loaded, governmentKey, meeting.id).world,
      ).toBe(loaded);
      expect(
        prepareMunicipalMeetingNotes(loaded, governmentKey, meeting.id).world,
      ).toBe(loaded);
    },
  );
  it("refuses a closed session without any write", () => {
    const { world, governmentKey, meeting } = context(
      "us-nd-fargo",
      "3825700",
      "executive-session",
    );
    const result = attendMunicipalPublicMeeting(
      world,
      governmentKey,
      meeting.id,
    );
    expect(result.ok).toBe(false);
    expect(result.world).toBe(world);
  });
  it("requires a current role in this government for meeting notes", () => {
    const { world, personId, governmentKey, meeting } = context(
      "us-va-charlottesville",
      "5114968",
      "stated-meeting",
    );
    const authorized = seatMunicipalMember(world, {
      governmentKey,
      personId,
      startedAt: world.currentDate,
      role: "member",
      seatLabel: "Authored test office",
    });
    const result = prepareMunicipalMeetingNotes(
      authorized,
      governmentKey,
      meeting.id,
    );
    expect(result.ok).toBe(true);
    expect(deserializeWorld(serializeWorld(result.world))).toEqual(
      result.world,
    );
    expect(result.world.history.workItems.length).toBe(
      authorized.history.workItems.length + 1,
    );
    expect(
      prepareMunicipalMeetingNotes(authorized, "us-va-richmond", meeting.id)
        .world,
    ).toBe(authorized);
    expect(
      prepareMunicipalMeetingNotes(result.world, governmentKey, meeting.id)
        .world,
    ).toBe(result.world);
  });
});

describe("normal saved home context", () => {
  it.each(["5114968", "3209700"])(
    "initializes one authored public session for %s without acquiring office",
    async (placeKey) => {
      const { municipalWorkspaceFor, createAuthoredMunicipalPublicSession } =
        await import("./municipal-workspace");
      const place = requireLifePlace(placeKey);
      const generated = createScenarioWorld(
        `normal-${placeKey}`,
        place.context,
        { peopleCount: 12 },
      );
      const world = {
        ...generated,
        control: {
          kind: "person" as const,
          personId: generated.personOrder[0]!,
        },
      };
      const view = municipalWorkspaceFor(world)!;
      expect(view.isHomeGovernment).toBe(true);
      const initialized = createAuthoredMunicipalPublicSession(world);
      expect(initialized.history.organizationParticipations).toEqual(
        world.history.organizationParticipations,
      );
      const meetings = municipalMeetings(initialized, view.government.key);
      expect(meetings).toHaveLength(1);
      expect(meetings[0]!.summary).toContain(
        "timing and duration are authored",
      );
      expect(createAuthoredMunicipalPublicSession(initialized)).toBe(
        initialized,
      );
      const attended = attendMunicipalPublicMeeting(
        initialized,
        view.government.key,
        meetings[0]!.id,
      );
      expect(attended.ok).toBe(true);
      const next = createAuthoredMunicipalPublicSession(attended.world);
      const subsequent = municipalMeetings(next, view.government.key);
      expect(subsequent).toHaveLength(2);
      expect(
        scheduledActivityState(next, subsequent[1]!.id).start.date,
      ).not.toBe(scheduledActivityState(next, subsequent[0]!.id).start.date);
      expect(
        createAuthoredMunicipalPublicSession(
          deserializeWorld(serializeWorld(next)),
        ),
      ).toEqual(next);
      expect(
        municipalWorkspaceFor(initialized, "us-nh-new-london")
          ?.isHomeGovernment,
      ).toBe(false);
      expect(world.people[world.control.personId]!.homeJurisdictionId).toBe(
        place.context.jurisdiction.id,
      );
    },
  );
});
