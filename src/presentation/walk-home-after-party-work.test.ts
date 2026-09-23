import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_LIFE_CATALOG,
  CAMPAIGN_LIFE_OUTREACH_KEY,
  addDays,
  addSimulationMinutes,
  compareSimulationMoments,
  createScheduledActivity,
  homePartyChapters,
  projectCampaignLifeActivities,
  requestCampaignLifeActivity,
  scheduledActivityState,
} from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { attendPartyWork, requestPartyWork } from "./campaign-life-actions";
import { projectPartyAndCommunityWork } from "./campaign-life-surface";
import { openingLifeLocation } from "./life-scene-flow";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectPlacesWorkspace } from "./player-places";
import { abandonUnperformableCommitment } from "./scheduled-activity-choice";
import { submitTimeCommand, type TimeCommand } from "./time-command";
import { venueActivities } from "./venue-activity";

/*
 * Found by the owner and by mass play in Bisbee, Arizona (2026-09-23): after
 * party work at the community room, "Walk home" answered "Nothing changed",
 * a phone shift "from home" then held up all time, and missed trips to the
 * community room piled up under Places.
 */
const BISBEE = "0406260";
const REGISTRY = createCampaignElectionTransitionRegistry();

interface Life {
  readonly world: World;
  readonly personId: EntityId;
  readonly chapterId: EntityId;
}

function life(seed: string, startAge = 34): Life {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge,
      placeKey: BISBEE,
    }),
  ).game!;
  return {
    world: game.world,
    personId: game.playerPersonId,
    chapterId: homePartyChapters(game.world)[0]!.organizationId,
  };
}

let request = 0;
function press(world: World, personId: EntityId, command: TimeCommand) {
  return submitTimeCommand(world, {
    requestId: `walk-home-${(request += 1)}`,
    personId,
    sourceMoment: world.currentMoment,
    command,
  });
}

function latestWork(world: World, personId: EntityId) {
  return projectCampaignLifeActivities(world, personId).at(-1)!;
}

function clashingJurisdiction(world: World, activityId: EntityId) {
  return world.history.scheduledActivities.find(
    (activity) => activity.id === activityId,
  )!.location.jurisdictionId;
}

function walkHomeOffer(world: World, personId: EntityId) {
  return projectPlacesWorkspace(world, personId)!.offers.find(
    (offer) => offer.id === "walk-home",
  )!;
}

describe("getting home after party work", { timeout: 600_000 }, () => {
  it("a phone shift asked for after a meeting leaves time to walk home, and both can be done", () => {
    const { world, personId, chapterId } = life("walk-home-booking");
    const meetingBooked = requestPartyWork(
      world,
      personId,
      "candidate-guidance",
      chapterId,
    );
    const meeting = latestWork(meetingBooked, personId);
    const bothBooked = requestPartyWork(
      meetingBooked,
      personId,
      "phone-shift",
      chapterId,
    );
    const shift = latestWork(bothBooked, personId);
    expect(shift.form).toBe("phone-shift");
    const walkMinutes = CAMPAIGN_LIFE_CATALOG["candidate-guidance"]
      .journeyMinutes as number;
    // Before the fix the shift began the minute the meeting ended.
    const home = addSimulationMinutes(meeting.end, walkMinutes);
    expect(
      compareSimulationMoments(shift.start, home) >= 0 ||
        compareSimulationMoments(shift.end, meeting.start) <= 0,
    ).toBe(true);

    const attended = attendPartyWork(
      bothBooked,
      personId,
      meeting.lifeActivityId,
      "attended",
      REGISTRY,
    );
    expect(openingLifeLocation(attended, personId)?.label).toBe(
      "Community room",
    );
    expect(walkHomeOffer(attended, personId).unavailable).toBeNull();
    const walked = press(attended, personId, {
      kind: "walk",
      destination: "home",
    });
    expect(walked.receipt.status).toBe("accepted");
    expect(openingLifeLocation(walked.world, personId)?.setting).toBe("home");

    // The shift is worked from home through Places, not refused for want of
    // a route to "Phone shift from home".
    const offer = projectPlacesWorkspace(walked.world, personId)!.offers.find(
      (entry) => entry.activityId === shift.scheduledActivityId,
    )!;
    expect(offer.unavailable).toBeNull();
    const worked = press(walked.world, personId, {
      kind: "attend-activity",
      activityId: shift.scheduledActivityId,
    });
    expect(worked.receipt.status).toBe("accepted");
    expect(
      scheduledActivityState(worked.world, shift.scheduledActivityId).status,
    ).toBe("completed");
  });

  it("a shift already booked across the walk home is named, and giving it up lets the player go home", () => {
    const { world, personId, chapterId } = life("walk-home-clash");
    const booked = requestPartyWork(
      world,
      personId,
      "candidate-guidance",
      chapterId,
    );
    const meeting = latestWork(booked, personId);
    const attended = attendPartyWork(
      booked,
      personId,
      meeting.lifeActivityId,
      "attended",
      REGISTRY,
    );
    // An older save can hold what the booking now refuses: a phone shift that
    // starts before the player could be home.
    const shiftStart = addSimulationMinutes(attended.currentMoment, 5);
    const clashing = createScheduledActivity(attended, {
      stableKey: "walk-home-test:clashing-shift",
      title: "Phone shift with the chapter",
      summary: "A phone shift booked by an older save.",
      kind: "confirmed",
      start: shiftStart,
      end: addSimulationMinutes(shiftStart, 60),
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        locationKey: CAMPAIGN_LIFE_CATALOG["phone-shift"].locationKey,
        label: CAMPAIGN_LIFE_CATALOG["phone-shift"].locationLabel,
        jurisdictionId: clashingJurisdiction(
          attended,
          meeting.scheduledActivityId,
        ),
      },
      sourceEntityIds: [meeting.scheduledActivityId],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
    const shiftId = clashing.history.scheduledActivities.at(-1)!.id;

    // The offer says why instead of answering "Nothing changed".
    expect(walkHomeOffer(clashing, personId).unavailable).toBe(
      "“Phone shift with the chapter” starts at 7:05 PM, before you could get there.",
    );
    const entry = venueActivities(clashing, personId).find(
      (candidate) => candidate.activity.id === shiftId,
    )!;
    expect(entry.refusal).toBe(
      "This is worked from home, and you are at Community room.",
    );
    expect(entry.abandonable).toBe(true);

    const released = abandonUnperformableCommitment(
      clashing,
      personId,
      shiftId,
    );
    expect(walkHomeOffer(released, personId).unavailable).toBeNull();
    const walked = press(released, personId, {
      kind: "walk",
      destination: "home",
    });
    expect(walked.receipt.status).toBe("accepted");
    expect(openingLifeLocation(walked.world, personId)?.setting).toBe("home");
  });

  it("an invitation booked while time was jumping ahead lapses with its trip instead of staying on Places", () => {
    const { world, personId, chapterId } = life("walk-home-stale");
    // The organizer's outreach is written only after a meeting the player
    // attended, and fires days later.
    const booked = requestPartyWork(
      world,
      personId,
      "candidate-guidance",
      chapterId,
    );
    const first = latestWork(booked, personId);
    const attended = attendPartyWork(
      booked,
      personId,
      first.lifeActivityId,
      "attended",
      REGISTRY,
    );
    const home = press(attended, personId, {
      kind: "walk",
      destination: "home",
    }).world;
    const outreach = home.history.futureDueItems.find(
      (item) =>
        item.transitionKey === CAMPAIGN_LIFE_OUTREACH_KEY &&
        item.entityIds.includes(personId),
    );
    expect(outreach).toBeDefined();
    // One long wait for a meeting well after the outreach fires: the wait
    // crosses the days in which the organizer books the next evening.
    const far = requestCampaignLifeActivity(home, personId, {
      form: "organization-meeting",
      hostOrganizationId: chapterId,
      earliestDate: addDays(outreach!.dueAt, 16) as IsoDate,
    });
    const target = latestWork(far, personId);
    const went = attendPartyWork(
      far,
      personId,
      target.lifeActivityId,
      "attended",
      REGISTRY,
    );
    expect(
      compareSimulationMoments(went.currentMoment, far.currentMoment),
    ).toBeGreaterThan(0);

    const missed = went.history.scheduledActivities.filter((activity) => {
      if (!activity.participantPersonIds.includes(personId)) return false;
      const state = scheduledActivityState(went, activity.id);
      return (
        state.status === "scheduled" &&
        (activity.kind === "travel" || activity.kind === "tentative") &&
        compareSimulationMoments(state.start, went.currentMoment) < 0
      );
    });
    expect(missed.map((activity) => activity.title)).toEqual([]);
    const stalePlaces = projectPlacesWorkspace(went, personId)!.offers.filter(
      (offer) =>
        offer.unavailable ===
        "A scheduled activity cannot be started after its interval began.",
    );
    expect(stalePlaces).toEqual([]);
  });

  it("offers no party work to ask for to a player under eighteen", () => {
    const { world, personId } = life("walk-home-sixteen", 16);
    expect(projectPartyAndCommunityWork(world, personId).requestable).toEqual(
      [],
    );
  });
});
