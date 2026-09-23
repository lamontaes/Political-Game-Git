import { describe, expect, it } from "vitest";

import {
  addDays,
  campaignLifeRefusal,
  createScheduledActivity,
  homePartyChapters,
  offerCampaignLifeActivity,
  projectCampaignLifeActivities,
  recordPersonDeath,
  simulationMomentAtLocalTime,
} from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import { advanceCalendarToActivity } from "./calendar-time-control";
import {
  acceptPartyWork,
  partyWorkBlockedReason,
  requestPartyWork,
} from "./campaign-life-actions";
import { projectPartyAndCommunityWork } from "./campaign-life-surface";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

/**
 * One preflight (`campaignLifeRefusal`) answers for the panel, the Calendar and
 * the writers, so a party request whose answer would be refused is shown
 * unavailable with the writer's reason instead of offered.
 *
 * Two of 180 test lives (Georgia and Colorado) were offered a phone shift to
 * ask for, and pressing it answered that no shared free evening existed. The
 * surface now asks the writer's own planning first and shows it unavailable,
 * with that reason, instead of offering a press that can only be refused.
 */

// A Georgia place (Census 1321240): not the Kentucky scenario.
const GEORGIA_PLACE = "1321240";

function georgiaLife() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "party-request-no-evening",
      startAge: 34,
      placeKey: GEORGIA_PLACE,
    }),
  ).game!;
  return {
    game,
    personId: game.playerPersonId,
    chapter: homePartyChapters(game.world)[0]!,
  };
}

function killOrganizer(world: World, organizerId: EntityId): World {
  return recordPersonDeath(world, {
    stableKey: "preflight-test:organizer-death",
    personId: organizerId,
    diedAt: world.currentDate,
    causeKey: "cause:preflight-fixture",
    sourceEntityIds: [world.id],
    summary: "Died; the cause is not recorded.",
    provenance: { kind: "authored", note: "Party preflight fixture." },
  });
}

describe("party work the simulation would refuse", { timeout: 600_000 }, () => {
  it("no shared free evening: the phone shift is shown unavailable with the writer's reason", () => {
    const { game, personId, chapter } = georgiaLife();
    const option = (world: typeof game.world) =>
      projectPartyAndCommunityWork(world, personId).requestable.find(
        (candidate) =>
          candidate.form === "phone-shift" &&
          candidate.hostOrganizationId === chapter.organizationId,
      )!;
    expect(option(game.world).unavailableReason).toBeNull();

    // The organizer is booked every evening for the whole request window.
    const at = (days: number, minute: number) =>
      simulationMomentAtLocalTime({
        date: addDays(game.world.currentDate, days) as IsoDate,
        minuteOfDay: minute,
        timeZone: game.world.currentMoment.timeZone,
        preferredUtcOffsetMinutes: game.world.currentMoment.utcOffsetMinutes,
      });
    const booked = createScheduledActivity(game.world, {
      stableKey: "request-evening-test:organizer-away",
      title: "Out of town",
      summary: "The organizer is away.",
      kind: "confirmed",
      start: at(0, 23 * 60),
      end: at(20, 23 * 60),
      participantPersonIds: [chapter.organizerPersonId!],
      responsiblePersonId: chapter.organizerPersonId!,
      location: {
        locationKey: "request-evening-test:away",
        label: "Out of town",
        jurisdictionId: null,
      },
      sourceEntityIds: [game.world.history.events[0]!.id],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [chapter.organizerPersonId!] },
    });

    const reason = option(booked).unavailableReason;
    expect(reason).toMatch(/shared free evening in the next two weeks/);
    expect(reason).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    // The writer still refuses with the same sentence if reached anyway.
    expect(() =>
      requestPartyWork(booked, personId, "phone-shift", chapter.organizationId),
    ).toThrow(reason!);
  });

  it("no host available: a request and an offer both say so instead of offering a yes", () => {
    const { game, personId, chapter } = georgiaLife();
    const organizerId = chapter.organizerPersonId!;
    const offered = offerCampaignLifeActivity(game.world, {
      form: "phone-shift",
      hostOrganizationId: chapter.organizationId,
      hostPersonId: organizerId,
      subjectPersonId: personId,
      campaignId: null,
      origin: "host-outreach",
      start: simulationMomentAtLocalTime({
        date: addDays(game.world.currentDate, 3) as IsoDate,
        minuteOfDay: 19 * 60,
        timeZone: game.world.currentMoment.timeZone,
        preferredUtcOffsetMinutes: game.world.currentMoment.utcOffsetMinutes,
      }),
      stableKey: "preflight-test:phone",
    });
    const offer = projectCampaignLifeActivities(offered, personId).at(-1)!;
    const row = (world: World) =>
      projectPartyAndCommunityWork(world, personId).rows.find(
        (candidate) => candidate.lifeActivityId === offer.lifeActivityId,
      )!;
    expect(row(offered).actions).toEqual(["accept", "decline"]);

    const hostless = killOrganizer(offered, organizerId);
    const unavailable = "Nobody is available to host that.";
    // Saying yes to the offer.
    expect(
      campaignLifeRefusal(hostless, personId, {
        kind: "accept",
        lifeActivityId: offer.lifeActivityId,
      }),
    ).toBe(unavailable);
    expect(row(hostless).state).toBe("offered");
    expect(row(hostless).actions).toEqual(["decline"]);
    expect(row(hostless).attendNote).toBe(unavailable);
    expect(
      partyWorkBlockedReason(hostless, personId, offer.lifeActivityId),
    ).toBe(unavailable);
    expect(() =>
      acceptPartyWork(hostless, personId, offer.lifeActivityId),
    ).toThrow(unavailable);
    // Asking for something new from the same chapter.
    const options = projectPartyAndCommunityWork(
      hostless,
      personId,
    ).requestable.filter(
      (option) => option.hostOrganizationId === chapter.organizationId,
    );
    expect(options.length).toBeGreaterThan(0);
    for (const option of options)
      expect(option.unavailableReason).toBe(unavailable);
    expect(() =>
      requestPartyWork(
        hostless,
        personId,
        "door-canvass",
        chapter.organizationId,
      ),
    ).toThrow(unavailable);
  });

  it("past the answer deadline: the same preflight refuses the yes", () => {
    const { game, personId, chapter } = georgiaLife();
    const offered = offerCampaignLifeActivity(game.world, {
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
      stableKey: "preflight-test:canvass",
    });
    const offer = projectCampaignLifeActivities(offered, personId).at(-1)!;
    const question = {
      kind: "accept",
      lifeActivityId: offer.lifeActivityId,
    } as const;
    expect(campaignLifeRefusal(offered, personId, question)).toBeNull();
    const due = advanceCalendarToActivity(
      offered,
      personId,
      offer.scheduledActivityId,
    ).world;
    expect(campaignLifeRefusal(due, personId, question)).not.toBeNull();
    const row = projectPartyAndCommunityWork(due, personId).rows.find(
      (candidate) => candidate.lifeActivityId === offer.lifeActivityId,
    )!;
    expect(row.actions).not.toContain("accept");
    expect(row.stateLabel).toMatch(
      /needed an answer by .*; that has passed\.$/,
    );
  });
});
