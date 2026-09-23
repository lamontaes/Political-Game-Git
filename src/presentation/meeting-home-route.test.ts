import { describe, expect, it } from "vitest";
import { buildProductionWorld } from "./production-world";
import { requireLifePlace } from "../simulation/life-places";
import {
  openOrdinaryLifeRecords,
  refreshLifeOpportunities,
} from "../simulation/life-opportunities";
import { recordWorldEvent } from "../simulation/world";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import {
  createScheduledActivity,
  cancelScheduledActivity,
  scheduledActivityState,
} from "../simulation/time-work";
import { recordHouseholdLocation } from "../simulation/life";
import {
  simulationMinutesBetween,
  addSimulationMinutes,
} from "../simulation/dates";
import { meetingHomeRoute } from "./meeting-home-route";
import { submitTimeCommand, previewTimeCommand } from "./time-command";
import {
  openingLifeLocation,
  openingNeighborhoodWalkOffer,
} from "./life-scene-flow";
import { venueActivities } from "./venue-activity";
import { declineVenueActivity } from "./scheduled-activity-choice";
import { passOrdinaryDays } from "./ordinary-life";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { World } from "../simulation/types";

const INVITATION_SEARCH_DAYS = 400;

function start(placeKey: string) {
  const game = buildProductionWorld({
    seed: `w-home-heldout:${placeKey}`,
    place: requireLifePlace(placeKey),
    age: 34,
    givenName: "Alex",
    familyName: "Lane",
    household: "lives-alone",
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    earlierLifeGenerationVersion: "context-v2",
  });
  const player = game.playerPersonId;
  const world = recordWorldEvent(openOrdinaryLifeRecords(game.world, player), {
    stableKey: "test:physical-home",
    type: "life.scene.opened",
    occurredAt: game.world.currentDate,
    recordedAt: game.world.currentDate,
    jurisdictionId: game.player.homeJurisdictionId,
    involvedEntityIds: [player],
    participants: [
      { personId: player, role: "presence:participant", detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["test:physical-home"],
    summary: "At home.",
    context: {
      location: {
        jurisdictionId: game.player.homeJurisdictionId,
        label: "Home",
        setting: "home",
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const meeting = world.history.scheduledActivities.find(
    (activity) =>
      activity.location.locationKey === "ordinary-life:meeting-room",
  )!;
  return { world, player, meeting };
}
function attended(placeKey: string) {
  const { world, player, meeting } = start(placeKey);
  const result = submitTimeCommand(world, {
    requestId: `attend:${placeKey}`,
    personId: player,
    sourceMoment: world.currentMoment,
    command: { kind: "attend-activity", activityId: meeting.id },
  });
  expect(result.receipt.status).toBe("accepted");
  expect(scheduledActivityState(result.world, meeting.id).status).toBe(
    "completed",
  );
  return { world: result.world, player, meeting };
}
describe("recorded local meeting return and activity ownership", () => {
  it.each(["2309585", "2007600", "0477000", "2717000"])(
    "returns from the completed meeting in %s through one clock",
    (placeKey) => {
      const { world, player } = attended(placeKey);
      const before = serializeWorld(world);
      const offer = meetingHomeRoute(world, player);
      expect(offer.kind).toBe("available");
      expect(openingNeighborhoodWalkOffer(world, player, "home")).toMatchObject(
        { unavailable: null, minutes: 20 },
      );
      expect(
        previewTimeCommand(world, player, { kind: "walk", destination: "home" })
          ?.elapsedMinutes,
      ).toBe(20);
      expect(serializeWorld(world)).toBe(before);
      const request = {
        requestId: `home:${placeKey}`,
        personId: player,
        sourceMoment: world.currentMoment,
        command: { kind: "walk", destination: "home" } as const,
      };
      const result = submitTimeCommand(deserializeWorld(before), request);
      expect(result.receipt.status).toBe("accepted");
      expect(
        simulationMinutesBetween(
          world.currentMoment,
          result.world.currentMoment,
        ),
      ).toBe(20);
      expect(openingLifeLocation(result.world, player)?.setting).toBe("home");
      expect(result.world.history.resourceTransferOutcomes).toEqual(
        world.history.resourceTransferOutcomes,
      );
      expect(submitTimeCommand(result.world, request).receipt.status).toBe(
        "stale",
      );
      expect(
        serializeWorld(deserializeWorld(serializeWorld(result.world))),
      ).toBe(serializeWorld(result.world));
    },
  );
  it("does not offer an untraveled route, another actor's route, or a changed home", () => {
    const initial = start("2309585");
    expect(meetingHomeRoute(initial.world, initial.player).kind).toBe(
      "unavailable",
    );
    expect(
      meetingHomeRoute(
        cancelScheduledActivity(initial.world, initial.meeting.id),
        initial.player,
      ).kind,
    ).toBe("unavailable");
    const { world, player } = attended("2309585");
    const other = world.personOrder.find((id) => id !== player)!;
    expect(meetingHomeRoute(world, other).kind).toBe("unavailable");
    const household = world.history.households.find(
      (entry) => entry.stableKey === "production:initial-life:household",
    )!;
    const moved = recordHouseholdLocation(world, {
      stableKey: "test:moved",
      householdId: household.id,
      supersedesLocationId: world.history.householdLocations
        .filter((entry) => entry.householdId === household.id)
        .at(-1)!.id,
      effectiveAt: world.currentDate,
      jurisdictionId: world.people[player]!.homeJurisdictionId,
      label: "A different home",
      kind: "residence:home",
      provenance: { kind: "authored", note: "Changed-home negative fixture" },
    });
    expect(meetingHomeRoute(moved, player).kind).toBe("unavailable");
  });
  it("does not teleport through a blocking commitment", () => {
    const { world, player } = attended("2007600");
    const blocked = createScheduledActivity(world, {
      stableKey: "test:blocking",
      title: "Existing commitment",
      summary: "Time is already committed.",
      kind: "confirmed",
      start: world.currentMoment,
      end: addSimulationMinutes(world.currentMoment, 60),
      participantPersonIds: [player],
      responsiblePersonId: player,
      location: {
        locationKey: "ordinary-life:meeting-room",
        label: "Public meeting room",
        jurisdictionId: world.people[player]!.homeJurisdictionId,
      },
      sourceEntityIds: [world.history.events.at(-1)!.id],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [player] },
    });
    const result = submitTimeCommand(blocked, {
      requestId: "blocked-home",
      personId: player,
      sourceMoment: blocked.currentMoment,
      command: { kind: "walk", destination: "home" },
    });
    expect(openingLifeLocation(result.world, player)?.setting).not.toBe("home");
    expect(result.world.currentMoment).toEqual(blocked.currentMoment);
  });
  it("excludes genuine other-owned tasks and refuses direct decline", () => {
    const { world, player, meeting } = start("2717000");
    const other = world.personOrder.find((id) => id !== player)!;
    const next = createScheduledActivity(world, {
      ...meeting,
      stableKey: "test:other-owned",
      participantPersonIds: [player, other],
      responsiblePersonId: other,
      start: addSimulationMinutes(
        scheduledActivityState(world, meeting.id).end,
        60,
      ),
      end: addSimulationMinutes(
        scheduledActivityState(world, meeting.id).end,
        120,
      ),
      access: { kind: "private", personIds: [player, other] },
    });
    const activity = next.history.scheduledActivities.at(-1)!;
    expect(
      venueActivities(next, player).some(
        (entry) => entry.activity.id === activity.id,
      ),
    ).toBe(false);
    expect(declineVenueActivity(next, player, activity.id)).toBe(next);
  });
  it("new invitations bind their actual recipient, with no change from inspection", () => {
    // An invitation now starts with a reason in the host's own records (a
    // birthday coming up, a move, new work) and the host deciding to ask, so
    // this uses a world known to hold such a host (the same seed the
    // Saturday invitation tests use) and lets ordinary days pass until
    // somebody this life knows asks.
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "saturday-2015900-d",
      startAge: 35,
      placeKey: "2015900",
      startKind: "custom",
      household: "shares-a-home",
    });
    const player = game.playerPersonId;
    const invitationsIn = (current: World) =>
      current.history.scheduledActivities.filter((entry) =>
        entry.location.locationKey?.startsWith("life-opportunity:"),
      );
    let next = refreshLifeOpportunities(
      openOrdinaryLifeRecords(game.world, player),
      player,
    );
    for (
      let day = 0;
      day < INVITATION_SEARCH_DAYS && invitationsIn(next).length === 0;
      day += 1
    ) {
      next = refreshLifeOpportunities(passOrdinaryDays(next, 1), player);
    }
    const invitations = invitationsIn(next);
    expect(invitations.length).toBeGreaterThan(0);
    for (const activity of invitations) {
      expect(activity.responsiblePersonId).toBe(player);
      expect(activity.participantPersonIds).toEqual([player]);
    }
    const before = serializeWorld(next);
    venueActivities(next, player);
    expect(serializeWorld(next)).toBe(before);
  });
});
