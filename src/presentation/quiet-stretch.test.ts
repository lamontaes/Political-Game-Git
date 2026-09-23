import { describe, expect, it } from "vitest";

import {
  addDays,
  createScheduledActivity,
  scheduledActivityState,
  simulationMomentAtLocalTime,
  type EntityId,
  type World,
} from "../simulation";
import {
  chooseStoryOption,
  letStoryTimePass,
  ordinaryStretchOptions,
  type StoryScene,
} from "./life-story";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import {
  goableToday,
  isCivicHold,
  nextKnownCalendarItem,
} from "./quiet-stretch";

/**
 * "Let the weeks run on" used to run 31 to 124 days without looking at the
 * calendar. A Nevada life measured on September 22, 2026 took it about forty
 * times and walked past the meetings it had been invited to. These walk the
 * same button over a real posted public meeting, a party-style meeting in the
 * community room, and a social invitation, in Reno.
 */

function renoLife(): { world: World; personId: EntityId } {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 34,
    placeKey: "3260600",
    questionnaire: "skipped",
    priors: [],
    seed: "quiet-stretch-stops",
  } as NewGameSetup);
  return {
    world: openOrdinaryLife(created.world, created.playerPersonId),
    personId: created.playerPersonId,
  };
}

function hold(
  world: World,
  personId: EntityId,
  input: {
    readonly key: string;
    readonly title: string;
    readonly daysAhead: number;
    readonly locationKey: string;
  },
): { world: World; activityId: EntityId } {
  const date = addDays(world.currentDate, input.daysAhead);
  const at = (minuteOfDay: number) =>
    simulationMomentAtLocalTime({
      date,
      minuteOfDay,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    });
  const next = createScheduledActivity(world, {
    stableKey: `quiet-stretch-test:${input.key}`,
    title: input.title,
    summary: "Coming is optional.",
    kind: "tentative",
    start: at(19 * 60),
    end: at(20 * 60),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: input.locationKey,
      label: "Community room",
      jurisdictionId: world.people[personId]!.homeJurisdictionId,
    },
    sourceEntityIds: [world.history.events.at(-1)!.id],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [personId] },
  });
  const activityId = next.history.scheduledActivities.at(-1)!.id;
  if (input.locationKey !== "ordinary-life:meeting-room")
    return { world: next, activityId };
  // The journey a party chapter meeting writes with it.
  const withJourney = createScheduledActivity(next, {
    stableKey: `quiet-stretch-test:${input.key}:journey`,
    title: "Journey to the community room",
    summary: "About twenty minutes to get to the community room.",
    kind: "travel",
    start: at(19 * 60 - 20),
    end: at(19 * 60),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: "ordinary-life:to-meeting-room",
      label: "On the way to the community room",
      jurisdictionId: world.people[personId]!.homeJurisdictionId,
    },
    sourceEntityIds: [activityId],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [personId] },
  });
  return { world: withJourney, activityId };
}

const quietScene = (world: World, personId: EntityId): StoryScene => ({
  kind: "ordinary-stretch",
  prose: "",
  options: ordinaryStretchOptions(world, personId),
  withPeople: [],
  presentPeople: [],
});

describe("a quiet stretch stops for civic life", () => {
  it("stops on the morning of the posted public meeting and offers to attend it", () => {
    const { world, personId } = renoLife();
    const meeting = world.history.scheduledActivities.find(
      (activity) => activity.title === "Posted public meeting",
    )!;
    expect(isCivicHold(meeting)).toBe(true);
    const meetingDay = scheduledActivityState(world, meeting.id).start.date;

    const next = letStoryTimePass(world, personId);
    expect(next.currentDate).toBe(meetingDay);
    expect(scheduledActivityState(next, meeting.id).status).toBe("scheduled");

    const scene = quietScene(next, personId);
    const attend = scene.options.find(
      (option) => option.key === `go-to:${meeting.id}`,
    );
    expect(attend?.label).toBe("Attend: Posted public meeting");
    expect(scene.options.at(-1)?.key).toBe("let-it-run");

    const went = chooseStoryOption(next, {
      personId,
      scene,
      optionKey: attend!.key,
    });
    expect(scheduledActivityState(went, meeting.id).status).toBe("completed");
    expect(goableToday(went, personId).map((a) => a.id)).not.toContain(
      meeting.id,
    );
  });

  it("never runs past a community-room meeting, and lets a social invitation lapse", () => {
    const opened = renoLife();
    const personId = opened.personId;
    // Past the opening's own meeting, which the first test covers.
    let world = letStoryTimePass(opened.world, personId);
    const social = hold(world, personId, {
      key: "social",
      title: "Evening at a neighbor's",
      daysAhead: 5,
      locationKey: "quiet-stretch-test:neighbor",
    });
    const civic = hold(social.world, personId, {
      key: "chapter",
      title: "Chapter open meeting",
      daysAhead: 20,
      locationKey: "ordinary-life:meeting-room",
    });
    world = civic.world;
    const meetingDay = scheduledActivityState(world, civic.activityId).start
      .date;

    expect(
      nextKnownCalendarItem(world, personId, { socialHolds: false })?.date,
    ).not.toBe(scheduledActivityState(world, social.activityId).start.date);

    for (let step = 0; step < 40 && world.currentDate < meetingDay; step += 1)
      world = letStoryTimePass(world, personId);

    expect(world.currentDate).toBe(meetingDay);
    expect(scheduledActivityState(world, civic.activityId).status).toBe(
      "scheduled",
    );
    expect(scheduledActivityState(world, social.activityId).status).toBe(
      "cancelled",
    );
    expect(
      ordinaryStretchOptions(world, personId).map((option) => option.label),
    ).toContain("Attend: Chapter open meeting");
  });
});
