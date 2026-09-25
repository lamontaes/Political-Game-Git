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
  chooseTodayCalendarOption,
  todayCalendarOptions,
  letStoryTimePass,
  ordinaryStretchOptions,
  type StoryScene,
} from "./life-story";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { CONTACT_LOCATION_KEY } from "../simulation/people-contact";
import { venueActivities } from "./venue-activity";
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

function renoLife(startAge = 34): { world: World; personId: EntityId } {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge,
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
    readonly startMinute?: number;
    readonly kind?: "tentative" | "confirmed";
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
    kind: input.kind ?? "tentative",
    start: at(input.startMinute ?? 19 * 60),
    end: at((input.startMinute ?? 19 * 60) + 60),
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
    expect(scene.options.some((option) => option.key === "let-it-run")).toBe(
      false,
    );
    expect(
      chooseStoryOption(next, {
        personId,
        scene,
        optionKey: "let-it-run",
      }),
    ).toBe(next);

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

describe("an invitation earlier the same day", () => {
  it("can be turned down so the evening meeting can be attended", () => {
    const { world: opened, personId } = renoLife();
    const meeting = opened.history.scheduledActivities.find(
      (activity) => activity.title === "Posted public meeting",
    )!;
    const morning = letStoryTimePass(opened, personId);
    // A noon invitation on the meeting's own day.
    const lunch = hold(morning, personId, {
      key: "lunch",
      title: "Lunch at a neighbor's",
      daysAhead: 0,
      locationKey: "quiet-stretch-test:neighbor",
      startMinute: 12 * 60,
    });
    const blocked = ordinaryStretchOptions(lunch.world, personId);
    expect(blocked.map((option) => option.label)).not.toContain(
      "Attend: Posted public meeting",
    );
    const turnDown = blocked.find(
      (option) => option.key === `turn-down:${lunch.activityId}`,
    );
    expect(turnDown?.label).toBe("Turn down: Lunch at a neighbor's");

    const freed = chooseStoryOption(lunch.world, {
      personId,
      scene: quietScene(lunch.world, personId),
      optionKey: turnDown!.key,
    });
    expect(scheduledActivityState(freed, lunch.activityId).status).toBe(
      "cancelled",
    );
    expect(
      ordinaryStretchOptions(freed, personId).map((option) => option.label),
    ).toContain("Attend: Posted public meeting");
    expect(scheduledActivityState(freed, meeting.id).status).toBe("scheduled");
  });
});

describe("beside the persistent Day and Week controls", () => {
  it("offers the meeting due today, which time will not step over", () => {
    const { world: opened, personId } = renoLife();
    const meeting = opened.history.scheduledActivities.find(
      (activity) => activity.title === "Posted public meeting",
    )!;
    const morning = letStoryTimePass(opened, personId);
    const options = todayCalendarOptions(morning, personId);
    expect(options.map((option) => option.label)).toContain(
      "Attend: Posted public meeting",
    );
    const went = chooseTodayCalendarOption(morning, {
      personId,
      optionKey: `go-to:${meeting.id}`,
    });
    expect(went && scheduledActivityState(went, meeting.id).status).toBe(
      "completed",
    );
    expect(
      chooseTodayCalendarOption(morning, { personId, optionKey: "let-it-run" }),
    ).toBeNull();
  });
});

/**
 * Four saves froze on one day in the lives run of September 23, 2026: two
 * teenagers (Wellsboro, Pennsylvania and Washington, D.C.) and an eighteen-year-
 * old in Las Cruces, each with a meeting they had arranged starting that
 * minute. Time will not step over a confirmed commitment, and nothing on the
 * moment offered a way to go, so every skip came back unmoved.
 */
describe("a commitment due now", () => {
  it("is offered to a child too, and going lets the year run on", () => {
    const { world: opened, personId } = renoLife(14);
    const { world, activityId } = hold(opened, personId, {
      key: "child-meeting",
      title: "Meeting with a friend",
      daysAhead: 0,
      locationKey: CONTACT_LOCATION_KEY,
      startMinute: opened.currentMoment.minuteOfDay,
      kind: "confirmed",
    });
    expect(letStoryTimePass(world, personId).currentDate).toBe(
      world.currentDate,
    );
    expect(todayCalendarOptions(world, personId).map((o) => o.label)).toEqual([
      "Attend: Meeting with a friend",
    ]);
    const went = chooseTodayCalendarOption(world, {
      personId,
      optionKey: `go-to:${activityId}`,
    })!;
    expect(scheduledActivityState(went, activityId).status).toBe("completed");
    expect(
      letStoryTimePass(went, personId).currentDate > went.currentDate,
    ).toBe(true);
  });

  it("can be let go once its time has passed", () => {
    const { world: opened, personId } = renoLife();
    const { world: booked, activityId } = hold(opened, personId, {
      key: "missed-meeting",
      title: "Meeting with a friend",
      daysAhead: 0,
      locationKey: CONTACT_LOCATION_KEY,
      startMinute: opened.currentMoment.minuteOfDay + 30,
      kind: "confirmed",
    });
    // The clock will not step over a confirmed commitment now, so a missed one
    // exists only in saves an older build carried past it; set the clock the
    // way such a save has it, an hour after the start.
    const world: World = {
      ...booked,
      currentMoment: {
        ...booked.currentMoment,
        minuteOfDay: booked.currentMoment.minuteOfDay + 90,
      },
    };
    const options = todayCalendarOptions(world, personId);
    expect(options.map((o) => o.label)).toEqual([
      "Let it go: Meeting with a friend",
    ]);
    const let_go = chooseTodayCalendarOption(world, {
      personId,
      optionKey: options[0]!.key,
    })!;
    expect(scheduledActivityState(let_go, activityId).status).toBe("cancelled");
    expect(todayCalendarOptions(let_go, personId)).toEqual([]);
  });

  it("gathers several missed commitments into one choice", () => {
    const life = renoLife();
    const personId = life.personId;
    let booked = life.world;
    const opened0 = booked.currentMoment.minuteOfDay;
    const ids: EntityId[] = [];
    for (const [index, key] of ["first", "second"].entries()) {
      const made = hold(booked, personId, {
        key: `missed-${key}`,
        title: `Meeting (${key})`,
        daysAhead: 0,
        locationKey: CONTACT_LOCATION_KEY,
        startMinute: opened0 + 30 + index * 70,
        kind: "confirmed",
      });
      booked = made.world;
      ids.push(made.activityId);
    }
    const world: World = {
      ...booked,
      currentMoment: {
        ...booked.currentMoment,
        minuteOfDay: opened0 + 180,
      },
    };
    const options = todayCalendarOptions(world, personId);
    expect(options.map((o) => o.label)).toEqual([
      "Let go of 2 commitments that can no longer be kept",
    ]);
    const cleared = chooseTodayCalendarOption(world, {
      personId,
      optionKey: options[0]!.key,
    })!;
    for (const id of ids)
      expect(scheduledActivityState(cleared, id).status).toBe("cancelled");
  });

  it("does not push a commitment later today it cannot reach from here", () => {
    const { world: opened, personId } = renoLife();
    const { world, activityId } = hold(opened, personId, {
      key: "unreachable-tomorrow",
      title: "Meeting across town",
      daysAhead: 0,
      startMinute: opened.currentMoment.minuteOfDay + 120,
      locationKey: "quiet-stretch-test:nowhere",
      kind: "confirmed",
    });
    // The Places screen may still offer giving it up; the moment does not.
    expect(
      venueActivities(world, personId).find(
        (entry) => entry.activity.id === activityId,
      )?.abandonable,
    ).toBe(true);
    expect(todayCalendarOptions(world, personId)).toEqual([]);
  });
});
