import { describe, expect, it } from "vitest";
import { createNewGameWorld } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { performVenueActivity, venueActivities } from "./venue-activity";
import { completedActivityHere, resolveVenueScene } from "./scene-venues";
import {
  deserializeWorld,
  recordWorldEvent,
  serializeWorld,
  simulationMinutesBetween,
  scheduledActivityState,
  type EntityId,
} from "../simulation";

function life() {
  const created = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "env-normal-action",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  });
  const opened = openOrdinaryLife(created.world, created.playerPersonId);
  const activity = opened.history.scheduledActivities.find(
    (candidate) =>
      candidate.location.locationKey === "ordinary-life:meeting-room",
  )!;
  const world = recordWorldEvent(opened, {
    stableKey: `venue-test:${activity.id}:already-there`,
    type: "life.scene.arrived",
    occurredAt: opened.currentDate,
    recordedAt: opened.currentDate,
    jurisdictionId: activity.location.jurisdictionId,
    involvedEntityIds: [created.playerPersonId, activity.id],
    participants: [
      {
        personId: created.playerPersonId,
        role: "presence:participant",
        detail: "Already at the public meeting room",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["venue-test", "place:ordinary-life:meeting-room"],
    summary: "Already at the public meeting room.",
    context: {
      location: {
        jurisdictionId: activity.location.jurisdictionId,
        label: activity.location.label,
        setting: "public meeting room",
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return {
    world,
    personId: created.playerPersonId,
  };
}

describe("normal venue activity control", () => {
  it("executes the real scheduled duration and persists actual attendance", () => {
    const { world, personId } = life();
    const before = serializeWorld(world);
    const entry = venueActivities(world, personId)[0]!;
    expect(entry.refusal).toBeNull();
    expect(serializeWorld(world)).toBe(before);
    const next = performVenueActivity(world, personId, entry.activity.id);
    expect(
      simulationMinutesBetween(world.currentMoment, next.currentMoment),
    ).toBe(entry.elapsedMinutes);
    expect(scheduledActivityState(next, entry.activity.id).status).toBe(
      "completed",
    );
    expect(completedActivityHere(next, personId)?.id).toBe(entry.activity.id);
    expect(resolveVenueScene(next, personId).sceneId).toBe(
      "civic-community-meeting-room",
    );
    expect(
      resolveVenueScene(deserializeWorld(serializeWorld(next)), personId),
    ).toEqual(resolveVenueScene(next, personId));
    expect(performVenueActivity(next, personId, entry.activity.id)).toBe(next);
    expect(serializeWorld(world)).toBe(before);
  });
  it("refuses another person and unknown activities without writes", () => {
    const { world, personId } = life();
    const entry = venueActivities(world, personId)[0]!;
    const other = Object.keys(world.people).find(
      (id) => id !== personId,
    )! as EntityId;
    expect(performVenueActivity(world, other, entry.activity.id)).toBe(world);
    expect(performVenueActivity(world, personId, "unknown" as EntityId)).toBe(
      world,
    );
  });
});
