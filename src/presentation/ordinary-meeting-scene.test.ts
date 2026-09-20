import { describe, expect, it } from "vitest";
import {
  advanceWorldMinutes,
  deserializeWorld,
  serializeWorld,
  scheduledActivityState,
  simulationMinutesBetween,
} from "../simulation";
import { openOrdinaryLifeRecords } from "../simulation/life-opportunities";
import { recordOrdinaryMeetingPresence } from "../simulation/ordinary-meeting-presence";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { walkOpeningNeighborhood } from "./life-scene-flow";
import { performVenueActivity } from "./venue-activity";
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
      const completed = performVenueActivity(world, personId, activity.id);
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
