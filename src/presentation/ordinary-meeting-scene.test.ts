import { describe, expect, it } from "vitest";
import {
  advanceWorldMinutes,
  deserializeWorld,
  serializeWorld,
  scheduledActivityState,
  simulationMinutesBetween,
  performScheduledActivity,
  householdMembershipsAt,
  recordHouseholdLocation,
} from "../simulation";
import { openOrdinaryLifeRecords } from "../simulation/life-opportunities";
import {
  recordOrdinaryMeetingPresence,
  enterOrdinaryMeeting,
} from "../simulation/ordinary-meeting-presence";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { walkOpeningNeighborhood } from "./life-scene-flow";
import { performVenueActivity } from "./venue-activity";
import {
  leaveOrdinaryMeeting,
  ordinaryMeetingLeaveOffer,
} from "./ordinary-meeting-actions";
import { projectOrdinaryMeetingScene } from "./ordinary-meeting-scene";

function start(placeKey: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey,
      seed: `meeting-presence:${placeKey}`,
      startKind: "custom",
      startAge: 34,
      household: "shares-a-home",
    }),
  ).game!;
  const world = openOrdinaryLifeRecords(game.world, game.playerPersonId);
  const activity = world.history.scheduledActivities.find(
    (entry) => entry.location.locationKey === "ordinary-life:meeting-room",
  )!;
  return { world, personId: game.playerPersonId, activity };
}

describe("prospective meeting presence", () => {
  it.each(["2743000", "1150000"])(
    "records a local chair only on successful attendance in %s",
    (placeKey) => {
      const { world, personId, activity } = start(placeKey);
      const saved = serializeWorld(world);
      expect(projectOrdinaryMeetingScene(world, personId)).toBeNull();
      expect(
        recordOrdinaryMeetingPresence(world, world, personId, activity.id),
      ).toBe(world);
      const journey = world.history.scheduledActivities.find(
        (entry) =>
          entry.location.locationKey === "ordinary-life:to-meeting-room",
      )!;
      const arrived = performVenueActivity(world, personId, journey.id);
      const completed = performScheduledActivity(arrived, activity.id);
      expect(scheduledActivityState(completed, activity.id).status).toBe(
        "completed",
      );
      const recorded = recordOrdinaryMeetingPresence(
        world,
        completed,
        personId,
        activity.id,
      );
      const scene = projectOrdinaryMeetingScene(recorded, personId)!;
      expect(scene.phase).toBe("immediate-aftermath");
      expect(scene.caption).toContain("The meeting has ended.");
      expect(scene.actors).toHaveLength(1);
      expect(
        recorded.people[scene.actors[0]!.personId]!.homeJurisdictionId,
      ).toBe(activity.location.jurisdictionId);
      expect(recorded.personOrder.length).toBe(
        completed.personOrder.length + 1,
      );
      expect(
        simulationMinutesBetween(
          completed.currentMoment,
          recorded.currentMoment,
        ),
      ).toBe(0);
      for (const key of Object.keys(
        completed.history,
      ) as (keyof typeof completed.history)[]) {
        if (!["events", "knowledge", "nextSequence"].includes(key))
          expect(recorded.history[key], key).toEqual(completed.history[key]);
      }
      expect(
        recordOrdinaryMeetingPresence(world, recorded, personId, activity.id),
      ).toBe(recorded);
      expect(
        recordOrdinaryMeetingPresence(
          completed,
          completed,
          personId,
          activity.id,
        ),
      ).toBe(completed);
      expect(projectOrdinaryMeetingScene(completed, personId)).toBeNull();
      const loaded = deserializeWorld(serializeWorld(recorded));
      expect(projectOrdinaryMeetingScene(loaded, personId)).toEqual(scene);
      expect(
        projectOrdinaryMeetingScene(advanceWorldMinutes(loaded, 1), personId),
      ).toBeNull();
      const home = walkOpeningNeighborhood(loaded, personId, "home");
      expect(home).not.toBe(loaded);
      expect(projectOrdinaryMeetingScene(home, personId)).toBeNull();
      expect(serializeWorld(world)).toBe(saved);
    },
  );
  it.each(["2743000", "1150000"])(
    "enters explicitly then stays through the remaining meeting exactly once in %s",
    (placeKey) => {
      const { world, personId, activity } = start(placeKey);
      expect(enterOrdinaryMeeting(world, personId, activity.id)).toBe(world);
      const journey = world.history.scheduledActivities.find(
        (entry) =>
          entry.location.locationKey === "ordinary-life:to-meeting-room",
      )!;
      const arrived = performVenueActivity(world, personId, journey.id);
      expect(arrived.currentMoment).toEqual(
        scheduledActivityState(arrived, activity.id).start,
      );
      expect(
        simulationMinutesBetween(
          scheduledActivityState(arrived, journey.id).start,
          scheduledActivityState(arrived, journey.id).end,
        ),
      ).toBe(20);
      expect(projectOrdinaryMeetingScene(arrived, personId)).toBeNull();
      const entered = enterOrdinaryMeeting(arrived, personId, activity.id);
      expect(entered.currentMoment).toEqual(arrived.currentMoment);
      expect(scheduledActivityState(entered, activity.id).status).toBe(
        "scheduled",
      );
      const scene = projectOrdinaryMeetingScene(entered, personId)!;
      expect(scene.phase).toBe("active");
      expect(scene.caption).toContain("chairs the meeting.");
      expect(enterOrdinaryMeeting(entered, personId, activity.id)).toBe(
        entered,
      );
      const loaded = deserializeWorld(serializeWorld(entered));
      expect(projectOrdinaryMeetingScene(loaded, personId)).toEqual(scene);
      const completed = performVenueActivity(loaded, personId, activity.id);
      expect(
        simulationMinutesBetween(loaded.currentMoment, completed.currentMoment),
      ).toBe(75);
      const after = projectOrdinaryMeetingScene(completed, personId)!;
      expect(after.phase).toBe("immediate-aftermath");
      expect(after.actors[0]!.personId).toBe(scene.actors[0]!.personId);
      expect(completed.personOrder).toEqual(entered.personOrder);
      expect(performVenueActivity(completed, personId, activity.id)).toBe(
        completed,
      );
      expect(enterOrdinaryMeeting(completed, personId, activity.id)).toBe(
        completed,
      );
    },
  );
  it("leaves without attendance credit, charges only the recorded return and refuses a changed home endpoint", () => {
    const { world, personId, activity } = start("2309585");
    const journey = world.history.scheduledActivities.find(
      (entry) => entry.location.locationKey === "ordinary-life:to-meeting-room",
    )!;
    const arrived = performVenueActivity(world, personId, journey.id);
    const entered = enterOrdinaryMeeting(arrived, personId, activity.id);
    const unchanged = serializeWorld(entered);
    expect(
      ordinaryMeetingLeaveOffer(entered, personId, activity.id),
    ).toMatchObject({
      kind: "available",
      route: { duration: { minutes: 20 } },
    });
    expect(serializeWorld(entered)).toBe(unchanged);
    const residence = householdMembershipsAt(entered, personId).find(
      (entry) => entry.state.residenceRole === "primary",
    )!;
    const moved = recordHouseholdLocation(entered, {
      stableKey: "fixture:changed-meeting-home",
      householdId: residence.household.id,
      supersedesLocationId: residence.location!.id,
      effectiveAt: entered.currentDate,
      jurisdictionId: residence.location!.jurisdictionId,
      label: "A different home",
      kind: "residence:home",
      provenance: {
        kind: "authored",
        note: "Actual endpoint change blocks the old return route",
      },
    });
    expect(ordinaryMeetingLeaveOffer(moved, personId, activity.id).kind).toBe(
      "unavailable",
    );
    expect(leaveOrdinaryMeeting(moved, personId, activity.id)).toBe(moved);
    const home = leaveOrdinaryMeeting(
      deserializeWorld(serializeWorld(entered)),
      personId,
      activity.id,
    );
    expect(
      simulationMinutesBetween(entered.currentMoment, home.currentMoment),
    ).toBe(20);
    expect(scheduledActivityState(home, activity.id).status).toBe("cancelled");
    expect(
      home.history.events.some(
        (event) => event.type === "civic.meeting-attended",
      ),
    ).toBe(false);
    expect(
      home.history.events.some((event) => event.type === "civic.meeting-left"),
    ).toBe(true);
    expect(home.history.events.at(-1)?.context.location?.setting).toBe("home");
    expect(projectOrdinaryMeetingScene(home, personId)).toBeNull();
    expect(leaveOrdinaryMeeting(home, personId, activity.id)).toBe(home);
  });
  it("does not author presence for another person", () => {
    const { world, personId, activity } = start("2309585");
    const completed = performVenueActivity(world, personId, activity.id);
    const other = world.personOrder.find((id) => id !== personId)!;
    expect(
      recordOrdinaryMeetingPresence(world, completed, other, activity.id),
    ).toBe(completed);
    expect(projectOrdinaryMeetingScene(completed, other)).toBeNull();
  });
});
