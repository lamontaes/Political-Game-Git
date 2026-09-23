import { describe, expect, it } from "vitest";

import {
  ACTIVITY_LAPSED_EVENT,
  addDays,
  deserializeWorld,
  homePartyChapters,
  offerCampaignLifeActivity,
  projectCampaignLifeActivities,
  scheduledActivityState,
  serializeWorld,
  simulationMomentAtLocalTime,
} from "../simulation";
import type { IsoDate } from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { calendarCampaignLifeEntry } from "./calendar-campaign-life";
import { advanceCalendarToActivity } from "./calendar-time-control";
import { acceptPartyWork } from "./campaign-life-actions";
import {
  projectPartyAndCommunityWork,
  readableMoment,
} from "./campaign-life-surface";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";

/**
 * A party's request for help needs an answer by the time the person would have
 * to set out. Playtest, Indiana: the clock stopped at that moment (the journey
 * there was the next thing on the calendar), the request still offered Accept,
 * and pressing it answered "It is too late to say yes to that now."
 */

// Bloomington, Indiana (Census place 1805860): not the Kentucky scenario.
const BLOOMINGTON = "1805860";

function offeredCanvass() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "party-answer-deadline",
      startAge: 34,
      placeKey: BLOOMINGTON,
    }),
  ).game!;
  const personId = game.playerPersonId;
  const chapter = homePartyChapters(game.world)[0]!;
  const world = offerCampaignLifeActivity(game.world, {
    form: "door-canvass",
    hostOrganizationId: chapter.organizationId,
    hostPersonId: chapter.organizerPersonId!,
    subjectPersonId: personId,
    campaignId: null,
    origin: "host-outreach",
    start: simulationMomentAtLocalTime({
      date: addDays(game.world.currentDate, 2) as IsoDate,
      minuteOfDay: 18 * 60 + 30,
      timeZone: game.world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: game.world.currentMoment.utcOffsetMinutes,
    }),
    stableKey: "answer-deadline-test:canvass",
  });
  return { world, personId, chapter };
}

describe(
  "a party request past its answer deadline",
  { timeout: 600_000 },
  () => {
    it("stops offering Accept, says it lapsed, records the lapse and survives a reload", () => {
      const { world, personId, chapter } = offeredCanvass();
      expect(chapter.name).toMatch(/^Monroe County /);
      const offer = projectCampaignLifeActivities(world, personId).at(-1)!;
      const row = (w: typeof world) =>
        projectPartyAndCommunityWork(w, personId).rows.find(
          (candidate) => candidate.lifeActivityId === offer.lifeActivityId,
        )!;
      expect(row(world).state).toBe("offered");
      expect(row(world).actions).toContain("accept");
      // The answer is needed when the journey there would leave, before the start.
      const journey = world.history.scheduledActivities.find(
        (activity) =>
          activity.kind === "travel" &&
          activity.sourceEntityIds.includes(offer.scheduledActivityId),
      )!;
      const leave = scheduledActivityState(world, journey.id).start;
      expect(leave.minuteOfDay).toBeLessThan(offer.start.minuteOfDay);

      const lapsedLabel = `${chapter.name} needed an answer by ${readableMoment(leave)}; that has passed.`;

      // Wait until the canvass: the clock stops where the journey would leave.
      const atDeadline = advanceCalendarToActivity(
        world,
        personId,
        offer.scheduledActivityId,
      ).world;
      expect(atDeadline.currentMoment).toEqual(leave);
      const due = row(atDeadline);
      expect(due.actions).not.toContain("accept");
      expect(
        projectCampaignLifeActivities(atDeadline, personId).at(-1)!.answerBy,
      ).toEqual(leave);
      expect(due.state).toBe("expired");
      expect(due.stateLabel).toBe(lapsedLabel);
      expect(due.stateLabel).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      // The Calendar reads the same row.
      expect(
        calendarCampaignLifeEntry(
          atDeadline,
          personId,
          offer.scheduledActivityId,
        )?.stateLabel,
      ).toBe(lapsedLabel);
      // An old Accept still pressed gets the same plain sentence the panel
      // shows, not the writer's bare refusal.
      expect(() =>
        acceptPartyWork(atDeadline, personId, offer.lifeActivityId),
      ).toThrow(lapsedLabel);

      // Time passing over it records a lapse, not a refusal, through the
      // existing writer, and releases the hold instead of leaving it pending.
      const passed = passOrdinaryDays(
        atDeadline,
        1,
        createCampaignElectionTransitionRegistry(),
      );
      expect(
        scheduledActivityState(passed, offer.scheduledActivityId).status,
      ).toBe("cancelled");
      expect(
        passed.history.events.some(
          (event) =>
            event.type === ACTIVITY_LAPSED_EVENT &&
            event.involvedEntityIds.includes(offer.scheduledActivityId),
        ),
      ).toBe(true);
      const after = row(passed);
      expect(after.state).toBe("expired");
      expect(after.actions).toEqual([]);
      expect(after.stateLabel).toBe(lapsedLabel);
      expect(() =>
        acceptPartyWork(passed, personId, offer.lifeActivityId),
      ).toThrow(lapsedLabel);

      // Save and load: the same answer, from the same record.
      const reloaded = deserializeWorld(serializeWorld(passed));
      expect(row(reloaded)).toEqual(after);
      expect(() =>
        acceptPartyWork(reloaded, personId, offer.lifeActivityId),
      ).toThrow(lapsedLabel);
    });
  },
);
