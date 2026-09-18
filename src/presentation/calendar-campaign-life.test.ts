import { describe, expect, it } from "vitest";

import { acceptPartyWork, requestPartyWork } from "./campaign-life-actions";
import {
  attendCalendarCampaignLifeActivity,
  calendarCampaignLifeEntry,
} from "./calendar-campaign-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  addDays,
  campaignLifeOutcomeRecords,
  homePartyChapters,
  offerCampaignLifeActivity,
  projectCampaignLifeActivities,
  simulationMomentAtLocalTime,
} from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";

/**
 * The Calendar's bridge to CAMPAIGN's party and campaign work.
 *
 * What these settle: a remote phone shift on the calendar is recognised and
 * needs this route, because the venue route cannot see it; reading it records
 * nothing; working it from the Calendar records the attendance exactly once,
 * and a second press does not record a second outcome.
 */

const REGISTRY = createCampaignElectionTransitionRegistry();

interface Life {
  readonly world: World;
  readonly personId: EntityId;
  readonly chapterId: EntityId;
  readonly organizerId: EntityId;
}

const cache = new Map<string, Life>();

function adultLife(seed: string): Life {
  const cached = cache.get(seed);
  if (cached) return cached;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      placeKey: "kentucky",
    }),
  ).game!;
  const chapter = homePartyChapters(game.world)[0]!;
  const life: Life = {
    world: game.world,
    personId: game.playerPersonId,
    chapterId: chapter.organizationId,
    organizerId: chapter.organizerPersonId!,
  };
  cache.set(seed, life);
  return life;
}

function latest(world: World, personId: EntityId) {
  return projectCampaignLifeActivities(world, personId).at(-1)!;
}

function evening(world: World, daysLater: number, minute = 19 * 60) {
  return simulationMomentAtLocalTime({
    date: addDays(world.currentDate, daysLater) as IsoDate,
    minuteOfDay: minute,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

/** An accepted remote phone shift, and the calendar hold that stands for it. */
function acceptedPhoneShift(seed: string) {
  const life = adultLife(seed);
  const offered = offerCampaignLifeActivity(life.world, {
    form: "phone-shift",
    hostOrganizationId: life.chapterId,
    hostPersonId: life.organizerId,
    subjectPersonId: life.personId,
    campaignId: null,
    origin: "host-outreach",
    start: evening(life.world, 2),
    stableKey: "calendar-bridge-test:phone:1",
  });
  const offeredView = latest(offered, life.personId);
  const world = acceptPartyWork(
    offered,
    life.personId,
    offeredView.lifeActivityId,
  );
  return {
    ...life,
    world,
    lifeActivityId: offeredView.lifeActivityId,
    activityId: latest(world, life.personId).scheduledActivityId,
  };
}

describe(
  "the Calendar's bridge to party and campaign work",
  { timeout: 900_000 },
  () => {
    it("does not claim a calendar entry that is not party or campaign work", () => {
      const life = adultLife("calendar-bridge-a");
      expect(
        calendarCampaignLifeEntry(
          life.world,
          life.personId,
          "nothing",
          REGISTRY,
        ),
      ).toBeNull();
    });

    it("recognises an accepted remote phone shift, and says the venue route cannot play it", () => {
      const shift = acceptedPhoneShift("calendar-bridge-a");
      const entry = calendarCampaignLifeEntry(
        shift.world,
        shift.personId,
        shift.activityId,
        REGISTRY,
      );
      expect(entry).not.toBeNull();
      expect(entry!.lifeActivityId).toBe(shift.lifeActivityId);
      // The phone shift is worked from home; there is no scene venue to travel
      // to, so only the lane's own route can complete it.
      expect(entry!.needsLaneRoute).toBe(true);
      expect(entry!.blockedReason).toBeNull();
      expect(entry!.completed).toBe(false);
      expect(entry!.outcomeLines).toEqual([]);
      expect(entry!.stateLabel.length).toBeGreaterThan(0);
    });

    it("reading it records nothing", () => {
      const shift = acceptedPhoneShift("calendar-bridge-a");
      const before = campaignLifeOutcomeRecords(shift.world).length;
      for (let pass = 0; pass < 3; pass += 1) {
        calendarCampaignLifeEntry(
          shift.world,
          shift.personId,
          shift.activityId,
          REGISTRY,
        );
      }
      expect(campaignLifeOutcomeRecords(shift.world).length).toBe(before);
      expect(latest(shift.world, shift.personId).state).toBe("accepted");
      expect(latest(shift.world, shift.personId).outcome).toBeNull();
    });

    it("works it from the Calendar and records the attendance exactly once", () => {
      const shift = acceptedPhoneShift("calendar-bridge-b");
      const before = campaignLifeOutcomeRecords(shift.world).length;

      const done = attendCalendarCampaignLifeActivity(
        shift.world,
        shift.personId,
        shift.activityId,
        "attended",
        REGISTRY,
      );
      const view = latest(done.world, shift.personId);
      expect(view.state).toBe("completed");
      expect(view.outcome).not.toBeNull();
      expect(campaignLifeOutcomeRecords(done.world).length).toBe(before + 1);
      // The sentence the player reads is the lane's own account of it.
      expect(done.outcome.length).toBeGreaterThan(0);

      // Pressing Attend again does not record a second outcome.
      const again = attendCalendarCampaignLifeActivity(
        done.world,
        shift.personId,
        shift.activityId,
        "attended",
        REGISTRY,
      );
      expect(campaignLifeOutcomeRecords(again.world).length).toBe(before + 1);
      expect(again.outcome.length).toBeGreaterThan(0);
    });

    it("leaves an in-person activity to the venue route", () => {
      const life = adultLife("calendar-bridge-a");
      const requested = requestPartyWork(
        life.world,
        life.personId,
        "candidate-guidance",
        life.chapterId,
      );
      const view = latest(requested, life.personId);
      const entry = calendarCampaignLifeEntry(
        requested,
        life.personId,
        view.scheduledActivityId,
        REGISTRY,
      );
      expect(entry).not.toBeNull();
      expect(entry!.needsLaneRoute).toBe(false);
    });
  },
);
