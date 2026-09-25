import { describe, expect, it } from "vitest";

import {
  compareSimulationMoments,
  scheduledActivityState,
  type EntityId,
  type World,
} from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { projectPartyChapters } from "./party-chapter-surface";

function adultLife(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 34 }),
  ).game!;
}

/** The first chapter meeting an organizer posts for the player, a day at a time. */
function firstPostedMeeting(world: World, personId: EntityId) {
  let current = world;
  for (let day = 0; day < 40; day += 1) {
    current = passOrdinaryDays(current, 1, { stopForTentativeHolds: true });
    for (const chapter of projectPartyChapters(current, personId)) {
      const meeting = chapter.meetings.find((row) =>
        row.actions.includes("accept"),
      );
      if (meeting) return meeting.activityId;
    }
  }
  return null;
}

describe("a meeting posted during a long stretch of days", () => {
  const life = adultLife("alive43-l3-a");
  const player = life.playerPersonId;
  const meetingId = firstPostedMeeting(life.world, player);

  it("is posted after the stretch begins, so no stop read at the start can see it", () => {
    expect(meetingId, "a chapter meeting within 40 days").not.toBeNull();
    expect(
      life.world.history.scheduledActivities.map((a) => a.id),
    ).not.toContain(meetingId);
  });

  it("stops the stretch that asks to be stopped at civic holds, with the meeting still open", () => {
    const stopped = passOrdinaryDays(life.world, 60, {
      stopForCivicHolds: true,
    });
    const state = scheduledActivityState(stopped, meetingId!);
    expect(state.status).toBe("scheduled");
    // Stopped at the meeting or at the journey that leads to it, not past it.
    expect(
      compareSimulationMoments(stopped.currentMoment, state.start),
    ).toBeLessThanOrEqual(0);
    expect(
      compareSimulationMoments(stopped.currentMoment, life.world.currentMoment),
    ).toBeGreaterThan(0);
  });

  it("still lets it lapse in a stretch that did not ask, as before", () => {
    const ran = passOrdinaryDays(life.world, 60);
    expect(scheduledActivityState(ran, meetingId!).status).not.toBe(
      "scheduled",
    );
  });

  it("lets it lapse when pressed again from the stop", () => {
    const stopped = passOrdinaryDays(life.world, 60, {
      stopForCivicHolds: true,
    });
    let again = stopped;
    for (let press = 0; press < 3; press += 1) {
      if (scheduledActivityState(again, meetingId!).status !== "scheduled")
        break;
      again = passOrdinaryDays(again, 60, { stopForCivicHolds: true });
    }
    expect(scheduledActivityState(again, meetingId!).status).not.toBe(
      "scheduled",
    );
  });
});
