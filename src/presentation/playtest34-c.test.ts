import { describe, expect, it } from "vitest";

import { createExplicitGeographyLife } from "./new-game-geography";
import {
  commitLifeConversation,
  projectLifeConversation,
} from "./life-conversation";
import {
  currentOpeningLifeScene,
  openingLifeLocation,
  openNextLifeScene,
} from "./life-scene-flow";
import {
  authorizeCalendarSimulation,
  playCalendarActivity,
  simulateAuthorizedCalendarActivity,
  simulateCalendarDays,
} from "./calendar-time-control";
import { projectPersonContact } from "./person-contact";
import { openConversationWith } from "./person-conversation-entry";
import { createNewGameWorld } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { venueActivities } from "./venue-activity";
import {
  cancelScheduledActivity,
  createCampaignElectionTransitionRegistry,
  recordWorldEvent,
  serializeWorld,
} from "../simulation";

describe("PLAYTEST34 C contracts", () => {
  it("does not charge ordinary talk lines", () => {
    const created = createExplicitGeographyLife({
      placeKey: "lexington-fayette",
      seed: "pt34-c-talk-time",
      startAge: 16,
      household: "shares-a-home",
    });
    let world = created.game.world;
    const playerId = created.game.playerPersonId;
    if (!currentOpeningLifeScene(world, playerId)) {
      world = openNextLifeScene(world, playerId);
    }
    const scene = currentOpeningLifeScene(world, playerId);
    const other = scene?.presentPersonIds.find((id) => id !== playerId);
    expect(other).toBeTruthy();
    const view = projectLifeConversation(world, playerId, other!);
    expect(view).toBeTruthy();
    const greet = view!.intents.find((intent) => intent.key === "greet");
    expect(greet).toBeTruthy();
    const before = world.currentMoment;
    const next = commitLifeConversation(world, {
      playerPersonId: playerId,
      personId: other!,
      intent: "greet",
      revision: view!.revision,
    });
    expect(next.currentMoment).toEqual(before);
    expect(
      next.history.events.some((event) => event.type === "life.conversation"),
    ).toBe(true);
  });

  it("advances a simulated day through the existing time contract", () => {
    const created = createExplicitGeographyLife({
      placeKey: "lexington-fayette",
      seed: "pt34-c-calendar-day",
      startAge: 34,
    });
    const before = created.game.world.currentDate;
    const result = simulateCalendarDays(
      created.game.world,
      created.game.playerPersonId,
      1,
    );
    expect(result.reached.date >= before).toBe(true);
    expect(result.outcome.length).toBeGreaterThan(0);
  });

  it("keeps talk, contact, meet, and travel as separate capabilities", () => {
    const created = createExplicitGeographyLife({
      placeKey: "lexington-fayette",
      seed: "pt34-c-contact",
      startAge: 16,
      household: "shares-a-home",
    });
    let world = created.game.world;
    const playerId = created.game.playerPersonId;
    if (!currentOpeningLifeScene(world, playerId)) {
      world = openNextLifeScene(world, playerId);
    }
    const scene = currentOpeningLifeScene(world, playerId);
    const other =
      scene?.presentPersonIds.find((id) => id !== playerId) ??
      Object.keys(world.people).find((id) => id !== playerId)!;
    const contact = projectPersonContact(world, playerId, other);
    expect(contact.contact.available).toBe(false);
    expect(contact.travel.available).toBe(false);
    expect(contact.talk.kind).toBe("talk");
    expect(contact.contact.kind).toBe("contact");
    expect(contact.meet.kind).toBe("meet");
    expect(contact.travel.kind).toBe("travel");
    expect(contact.talk.reason).not.toEqual(contact.contact.reason);
    const theirPlace = openingLifeLocation(world, other);
    const playerPlace = openingLifeLocation(world, playerId);
    if (theirPlace) {
      expect(contact.travel.reason).toContain(theirPlace.label);
    } else {
      expect(contact.travel.reason).toMatch(/location|pin/i);
    }
    if (playerPlace && theirPlace && playerPlace.label !== theirPlace.label) {
      expect(contact.travel.reason).toContain(playerPlace.label);
      expect(contact.travel.reason).not.toMatch(/both recorded/i);
    }
  });

  it("lets Talk follow openConversationWith outside an opening scene", () => {
    const created = createExplicitGeographyLife({
      placeKey: "lexington-fayette",
      seed: "pt34-c-talk-gate",
      startAge: 16,
      household: "shares-a-home",
    });
    const world = created.game.world;
    const playerId = created.game.playerPersonId;
    expect(currentOpeningLifeScene(world, playerId)).toBeNull();
    const other = Object.keys(world.people).find((id) => id !== playerId)!;
    const entry = openConversationWith(world, playerId, other);
    const contact = projectPersonContact(world, playerId, other);
    expect(contact.talk.available).toBe(entry.kind === "available");
    expect(contact.presentNow).toBe(false);
    expect(contact.contact.available).toBe(false);
    expect(contact.travel.available).toBe(false);
    const playerPlace = openingLifeLocation(world, playerId);
    const theirPlace = openingLifeLocation(world, other);
    if (
      playerPlace &&
      theirPlace &&
      playerPlace.jurisdictionId !== null &&
      playerPlace.jurisdictionId === theirPlace.jurisdictionId &&
      playerPlace.label !== theirPlace.label
    ) {
      expect(contact.travel.reason).not.toMatch(/both recorded/i);
    }
  });

  it("refuses unauthorized calendar simulation without moving time", () => {
    const created = createExplicitGeographyLife({
      placeKey: "lexington-fayette",
      seed: "pt34-c-simulate-gate",
      startAge: 34,
    });
    const world = created.game.world;
    const before = world.currentMoment;
    const result = simulateAuthorizedCalendarActivity(
      world,
      created.game.playerPersonId,
      "not-a-scheduled-activity",
    );
    expect(result.world).toBe(world);
    expect(result.reached).toEqual(before);
    expect(result.outcome).toMatch(/not on the recorded calendar/i);
  });

  it("leaves World and time identical when a supported venue event is not preference-authorized", () => {
    const created = createNewGameWorld({
      placeKey: "kentucky",
      startAge: 34,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "pt34-c-simulate-standing-pref",
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    });
    const initial = openOrdinaryLife(created.world, created.playerPersonId);
    const journey = initial.history.scheduledActivities.find(
      (activity) =>
        activity.location.locationKey === "ordinary-life:to-meeting-room",
    )!;
    const opened = passOrdinaryDays(
      cancelScheduledActivity(initial, journey.id),
    );
    const activity = opened.history.scheduledActivities.find(
      (candidate) =>
        candidate.location.locationKey === "ordinary-life:meeting-room",
    )!;
    const world = recordWorldEvent(opened, {
      stableKey: `pt34-c:${activity.id}:already-there`,
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
      tags: ["pt34-c", "place:ordinary-life:meeting-room"],
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
    const personId = created.playerPersonId;
    const entry = venueActivities(world, personId).find(
      (candidate) => candidate.activity.id === activity.id,
    );
    expect(entry).toBeTruthy();
    expect(entry!.refusal).toBeNull();
    const handlers = createCampaignElectionTransitionRegistry();
    expect(handlers.routine?.isAutoResolvableActivity(world, activity.id)).toBe(
      false,
    );
    const gate = authorizeCalendarSimulation(world, personId, activity.id);
    expect(gate.authorized).toBe(false);
    expect(gate.reason).toMatch(/Standing preferences did not authorize/i);
    const snapshot = serializeWorld(world);
    const before = world.currentMoment;
    const simulated = simulateAuthorizedCalendarActivity(
      world,
      personId,
      activity.id,
    );
    expect(simulated.world).toBe(world);
    expect(simulated.reached).toEqual(before);
    expect(serializeWorld(simulated.world)).toBe(snapshot);
    expect(simulated.outcome).toBe(gate.reason);
    const played = playCalendarActivity(world, personId, activity.id);
    expect(played.world).not.toBe(world);
    expect(played.reached).not.toEqual(before);
  });
});
