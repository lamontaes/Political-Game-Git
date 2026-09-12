import { describe, expect, it } from "vitest";

import {
  createScheduledActivity,
  performScheduledActivity,
  advanceWorldMinutes,
  serializeWorld,
  deserializeWorld,
  scheduledActivitiesVisibleTo,
  type EntityId,
  type World,
} from "../simulation";
import { openOrdinaryLife } from "./ordinary-life";
import { performVenueActivity, venueActivities } from "./venue-activity";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import { resolveLifeScene } from "./life-scene";
import { PUBLIC_MEETING_ROOM_SCENE_ID, SCENE_REGISTRY } from "./scene-registry";
import {
  resolveVenueScene,
  SCENE_VENUES,
  sceneVenueForLocationKey,
  scenesNoVenueReaches,
  venuesWithoutRooms,
  VENUE_REACHABLE_SCENE_IDS,
  VENUE_WITH_PRODUCTION_ACTIVITY,
} from "./scene-venues";

/**
 * THE ROOM FOLLOWS THE RECORD, AND ONLY THE RECORD.
 *
 * These are the assertions ENV-ALL1 is accountable for. Each one names a
 * specific way a backdrop can lie: by showing where somebody is going, by
 * showing a room they may not be in, by moving them when they only looked, or
 * by borrowing a picture from the nearest room that has one.
 */

interface Life {
  readonly world: World;
  readonly personId: EntityId;
}

function anOrdinaryLife(seed: string): Life {
  const setup: NewGameSetup = {
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  };
  const created = createNewGameWorld(setup);
  return {
    world: openOrdinaryLife(created.world, created.playerPersonId),
    personId: created.playerPersonId,
  };
}

/** Moves the clock onto an activity without performing it. */
function atMomentOf(world: World, activityId: EntityId): World {
  const state = world.history.scheduledActivityStates
    .filter((entry) => entry.activityId === activityId)
    .at(-1);
  if (!state) throw new Error("The activity has no state.");
  return {
    ...world,
    currentDate: state.start.date,
    currentMoment: { ...state.start },
  };
}

describe("the venue table", () => {
  it("gives every declared canonical location a reason, room or not", () => {
    for (const venue of SCENE_VENUES) {
      expect(venue.reason.length, venue.locationKey).toBeGreaterThan(20);
      if (venue.sceneId !== null) {
        expect(
          SCENE_REGISTRY.scenes.has(venue.sceneId),
          venue.locationKey,
        ).toBe(true);
      }
    }
  });

  it("holds no duplicate location keys", () => {
    const keys = SCENE_VENUES.map((venue) => venue.locationKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  /**
   * The gap in the other direction. A campaign office, an executive study and
   * a canvassed street are all real canonical activities with no picture, and
   * this asserts they stay visible as gaps rather than being quietly given the
   * nearest room that happens to be released.
   */
  it("reports the canonical places that have no room, rather than substituting one", () => {
    const roomless = venuesWithoutRooms().map((venue) => venue.locationKey);
    expect(roomless).toContain("campaign-office");
    expect(roomless).toContain("executive-office");
    expect(roomless).toContain("campaign-doors");
    // The one that must NOT be borrowed for the campaign office.
    expect(sceneVenueForLocationKey("campaign-office")?.sceneId).toBeNull();
  });

  it("names the production rooms no canonical location reaches", () => {
    const unreached = scenesNoVenueReaches();
    expect(unreached).toContain("courtroom-empty-production");
    expect(unreached).toContain("civic-hearing-room-production");
    expect(unreached).toContain("legislative-chamber-production");
  });

  /**
   * MAPPED IS NOT REACHED. The workroom is mapped and proven and is still not
   * somewhere an ordinary life goes, because only a development fixture writes
   * its location key. Collapsing these two lists back into one is how a room
   * starts claiming to be in the game again.
   */
  it("distinguishes supported bindings from bindings with production activity producers", () => {
    expect(VENUE_WITH_PRODUCTION_ACTIVITY.length).toBeLessThan(
      VENUE_REACHABLE_SCENE_IDS.length,
    );
    for (const sceneId of VENUE_WITH_PRODUCTION_ACTIVITY) {
      expect(VENUE_REACHABLE_SCENE_IDS).toContain(sceneId);
    }
    expect(VENUE_WITH_PRODUCTION_ACTIVITY).toContain(
      PUBLIC_MEETING_ROOM_SCENE_ID,
    );
  });

  it("resolves nothing for a location key nobody declared", () => {
    expect(sceneVenueForLocationKey("not-a-place-anyone-authored")).toBeNull();
  });
});

describe("where a life actually is", () => {
  /**
   * The positive control, and the whole point of the lane: an ordinary life
   * with a posted public meeting is IN the meeting hall while the meeting is
   * on. Before ENV-ALL1 this life saw its living room or a page of text.
   */
  it("shows the meeting aftermath only after actual activity performance", () => {
    const life = anOrdinaryLife("venue-positive");
    const meeting = scheduledActivitiesVisibleTo(
      life.world,
      life.personId,
    ).find(
      (activity) =>
        activity.location.locationKey === "ordinary-life:meeting-room",
    );
    expect(
      meeting,
      "the ordinary life should post a public meeting",
    ).toBeTruthy();

    const during = performVenueActivity(life.world, life.personId, meeting!.id);
    const resolved = resolveVenueScene(during, life.personId);
    expect(resolved.sceneId).toBe(PUBLIC_MEETING_ROOM_SCENE_ID);
    expect(resolved.activityId).toBe(meeting!.id);

    // And it reaches the surface the player actually looks at.
    expect(resolveLifeScene(during, life.personId).sceneId).toBe(
      PUBLIC_MEETING_ROOM_SCENE_ID,
    );
    expect(
      resolveVenueScene(advanceWorldMinutes(during, 1), life.personId).sceneId,
    ).toBeNull();
    expect(() => performScheduledActivity(during, meeting!.id)).toThrow();
  });

  it("does not equate a scheduled interval with attendance", () => {
    const life = anOrdinaryLife("venue-invitation");
    const meeting = scheduledActivitiesVisibleTo(
      life.world,
      life.personId,
    ).find((a) => a.title === "Posted public meeting")!;
    expect(
      resolveVenueScene(atMomentOf(life.world, meeting.id), life.personId)
        .sceneId,
    ).toBeNull();
    // This household's earlier commitment is not the controlled person's to
    // perform. The refusal must not counterfeit either travel or attendance.
    expect(
      venueActivities(life.world, life.personId).find(
        (e) => e.activity.id === meeting.id,
      )!.refusal,
    ).toBe("An earlier commitment must be resolved first.");
    const done = performVenueActivity(life.world, life.personId, meeting.id);
    expect(done).toBe(life.world);
    expect(resolveVenueScene(done, life.personId).sceneId).toBeNull();
    expect(
      resolveVenueScene(advanceWorldMinutes(done, 1), life.personId).sceneId,
    ).toBeNull();
  });

  /**
   * The negative control. The same life, the same meeting, at a moment the
   * meeting is not on: the room must go back to the household, not stay in the
   * hall and not stick to the last room it painted.
   */
  it("does not put them in the hall before the meeting starts", () => {
    const life = anOrdinaryLife("venue-negative");
    const resolved = resolveVenueScene(life.world, life.personId);
    expect(resolved.sceneId).toBeNull();
    expect(resolved.reason).toContain("completed attendance");

    const home = resolveLifeScene(life.world, life.personId).sceneId;
    expect(home).not.toBe(PUBLIC_MEETING_ROOM_SCENE_ID);
  });

  /**
   * CHANGING A BACKDROP IS NOT TRAVEL. Somebody in transit is in neither end
   * of the journey, and the destination is not painted early.
   */
  it("refuses to paint a destination while somebody is travelling to it", () => {
    const life = anOrdinaryLife("venue-travel");
    // A journey has to hang off the same canonical record the meeting does;
    // `createScheduledActivity` refuses one with no provenance, which is the
    // right refusal and not something this test works around.
    const meeting = scheduledActivitiesVisibleTo(
      life.world,
      life.personId,
    ).find(
      (activity) =>
        activity.location.locationKey === "ordinary-life:meeting-room",
    )!;
    const withJourney = createScheduledActivity(life.world, {
      stableKey: "test:journey-to-the-meeting",
      title: "On the way",
      summary: "Getting to the meeting room.",
      kind: "travel",
      start: { ...life.world.currentMoment },
      end: {
        ...life.world.currentMoment,
        minuteOfDay: life.world.currentMoment.minuteOfDay + 30,
      },
      participantPersonIds: [life.personId],
      responsiblePersonId: life.personId,
      // Deliberately the DESTINATION's own key: even naming a room that has a
      // picture must not put a traveller inside it.
      location: {
        locationKey: "ordinary-life:meeting-room",
        label: "On the way to the meeting room",
        jurisdictionId: null,
      },
      sourceEntityIds: [...meeting.sourceEntityIds],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [life.personId] },
    });

    const resolved = resolveVenueScene(withJourney, life.personId);
    expect(resolved.sceneId).toBeNull();
    expect(
      resolveLifeScene(
        performScheduledActivity(
          withJourney,
          withJourney.history.scheduledActivities.at(-1)!.id,
        ),
        life.personId,
      ).sceneId,
    ).toBeNull();
  });

  /**
   * ACCESS IS CANONICAL. Knowing a location key is not standing in the room.
   */
  it("refuses a room to somebody the activity does not admit", () => {
    const life = anOrdinaryLife("venue-access");
    const other = Object.keys(life.world.people).find(
      (id) => id !== life.personId,
    );
    expect(other, "the world should hold somebody else").toBeTruthy();

    const meeting = scheduledActivitiesVisibleTo(
      life.world,
      life.personId,
    ).find(
      (activity) =>
        activity.location.locationKey === "ordinary-life:meeting-room",
    )!;
    const during = performScheduledActivity(life.world, meeting.id);

    // The other person is neither a participant nor admitted by its access.
    const resolved = resolveVenueScene(during, other as EntityId);
    expect(resolved.sceneId).toBeNull();
  });

  /**
   * READING DOES NOT MOVE ANYBODY. Resolving a room is a pure read: it writes
   * no record, completes no activity and does not advance the clock. This is
   * the assertion that stops a backdrop from becoming a way to skip time.
   */
  it("advances no clock and writes no record", () => {
    const life = anOrdinaryLife("venue-pure");
    const meeting = scheduledActivitiesVisibleTo(
      life.world,
      life.personId,
    ).find(
      (activity) =>
        activity.location.locationKey === "ordinary-life:meeting-room",
    )!;
    const during = performScheduledActivity(life.world, meeting.id);
    const before = JSON.stringify({
      moment: during.currentMoment,
      date: during.currentDate,
      events: during.history.events.length,
      states: during.history.scheduledActivityStates.length,
    });

    resolveVenueScene(during, life.personId);
    resolveVenueScene(during, life.personId);
    resolveLifeScene(during, life.personId);

    expect(
      JSON.stringify({
        moment: during.currentMoment,
        date: during.currentDate,
        events: during.history.events.length,
        states: during.history.scheduledActivityStates.length,
      }),
    ).toBe(before);
  });

  /** The same world resolves the same room every time it is asked. */
  it("is stable across repeated resolution and across a serialization round trip", () => {
    const life = anOrdinaryLife("venue-stable");
    const meeting = scheduledActivitiesVisibleTo(
      life.world,
      life.personId,
    ).find(
      (activity) =>
        activity.location.locationKey === "ordinary-life:meeting-room",
    )!;
    const during = performScheduledActivity(life.world, meeting.id);

    const once = resolveLifeScene(during, life.personId).sceneId;
    const twice = resolveLifeScene(during, life.personId).sceneId;
    expect(twice).toBe(once);

    const reloaded = deserializeWorld(serializeWorld(during));
    expect(resolveLifeScene(reloaded, life.personId).sceneId).toBe(once);
  });
});
