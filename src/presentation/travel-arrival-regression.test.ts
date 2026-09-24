import { describe, expect, it } from "vitest";
import {
  deserializeWorld,
  scheduledActivityState,
  serializeWorld,
  simulationMinutesBetween,
  advanceWorldMinutes,
  performScheduledActivity,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  openNextLifeScene,
  openingLifeLocation,
  walkOpeningNeighborhood,
} from "./life-scene-flow";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";
import { completedActivityHere } from "./scene-venues";
import { playCalendarActivity } from "./calendar-time-control";
import { venueActivities } from "./venue-activity";

function game() {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 19,
    seed: "playtest65-travel-arrival",
    questionnaire: "skipped",
  });
}

describe("recorded arrival after travel", () => {
  it("restores the same home after the nearby walk, including after reload", () => {
    const { world, playerPersonId: personId } = game();
    const home = openNextLifeScene(world, personId);
    const before = resolveOpeningPlaySceneContext(home, personId);
    expect(before.sceneId).not.toBeNull();
    const outside = walkOpeningNeighborhood(home, personId, "neighborhood");
    const returned = walkOpeningNeighborhood(outside, personId, "home");
    expect(
      simulationMinutesBetween(home.currentMoment, returned.currentMoment),
    ).toBe(10);
    expect(openingLifeLocation(returned, personId)?.setting).toBe("home");
    const saved = serializeWorld(returned);
    for (const current of [returned, deserializeWorld(saved)]) {
      expect(completedActivityHere(current, personId)).toBeNull();
      expect(resolveOpeningPlaySceneContext(current, personId)).toMatchObject({
        purpose: "home",
        sceneId: before.sceneId,
      });
    }
    expect(serializeWorld(returned)).toBe(saved);
  });

  it("a Calendar journey records arrival without also attending the meeting", () => {
    const { world, playerPersonId: personId } = game();
    const morning = passOrdinaryDays(openOrdinaryLife(world, personId));
    const journey = morning.history.scheduledActivities.find(
      (item) => item.location.locationKey === "ordinary-life:to-meeting-room",
    )!;
    const meeting = morning.history.scheduledActivities.find(
      (item) => item.location.locationKey === "ordinary-life:meeting-room",
    )!;
    const travelled = playCalendarActivity(morning, personId, journey.id).world;
    expect(scheduledActivityState(travelled, journey.id).status).toBe(
      "completed",
    );
    expect(scheduledActivityState(travelled, meeting.id).status).toBe(
      "scheduled",
    );
    expect(openingLifeLocation(travelled, personId)?.label).toBe(
      "Public meeting room",
    );
    const loaded = deserializeWorld(serializeWorld(travelled));
    expect(
      venueActivities(loaded, personId).find(
        (item) => item.activity.id === meeting.id,
      )?.refusal,
    ).toBeNull();
    expect(playCalendarActivity(loaded, personId, journey.id).world).toBe(
      loaded,
    );
    const attended = playCalendarActivity(loaded, personId, meeting.id).world;
    expect(
      simulationMinutesBetween(loaded.currentMoment, attended.currentMoment),
    ).toBe(75);
    expect(scheduledActivityState(attended, meeting.id).status).toBe(
      "completed",
    );
    expect(completedActivityHere(attended, personId)?.id).toBe(meeting.id);
  });

  it("lets a saved completed journey enter its linked meeting without traveling twice", () => {
    const { world, playerPersonId: personId } = game();
    const morning = passOrdinaryDays(openOrdinaryLife(world, personId));
    const journey = morning.history.scheduledActivities.find(
      (item) => item.location.locationKey === "ordinary-life:to-meeting-room",
    )!;
    const meeting = morning.history.scheduledActivities.find(
      (item) => item.location.locationKey === "ordinary-life:meeting-room",
    )!;
    const departing = advanceWorldMinutes(
      morning,
      simulationMinutesBetween(
        morning.currentMoment,
        scheduledActivityState(morning, journey.id).start,
      ),
    );
    // Reproduce the previous Calendar writer: completion with no arrival event.
    const legacy = deserializeWorld(
      serializeWorld(performScheduledActivity(departing, journey.id)),
    );
    const before = serializeWorld(legacy);
    expect(
      venueActivities(legacy, personId).find(
        (item) => item.activity.id === meeting.id,
      )?.journey,
    ).toMatchObject({
      alreadyCompleted: true,
      journeyMinutes: 0,
      waitMinutes: 0,
    });
    expect(serializeWorld(legacy)).toBe(before);
    const attended = playCalendarActivity(legacy, personId, meeting.id).world;
    expect(
      simulationMinutesBetween(legacy.currentMoment, attended.currentMoment),
    ).toBe(75);
    expect(scheduledActivityState(attended, meeting.id).status).toBe(
      "completed",
    );
    expect(openingLifeLocation(attended, personId)?.label).toBe(
      "Public meeting room",
    );
  });
});
