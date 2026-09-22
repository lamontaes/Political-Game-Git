import { describe, expect, it } from "vitest";

import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  CAMPAIGN_LIFE_OUTREACH_KEY,
  acceptChapterInvitation,
  activeCampaignForCandidate,
  addDays,
  campaignLifeOutcomeRecords,
  campaignTreasuryPosition,
  createScheduledActivity,
  homePartyChapters,
  offerCampaignLifeActivity,
  projectCampaignLifeActivities,
  projectCampaignWeek,
  projectPartyEncounters,
  scheduledActivityState,
  simulationMomentAtLocalTime,
} from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { recordDomainAttendance } from "./activity-attendance";
import {
  acceptPartyWork,
  attendPartyWork,
  commitWeek,
  declinePartyWork,
  doWeekSession,
  letWeekSessionGo,
  partyWorkBlockedReason,
  partyWorkBlockingActivityId,
  requestPartyWork,
  runWeekCondensed,
} from "./campaign-life-actions";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { attendChapterMeeting } from "./party-chapter-actions";
import { performVenueActivity } from "./venue-activity";

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
  const life = {
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

function evening(world: World, daysLater: number, minute = 18 * 60 + 30) {
  return simulationMomentAtLocalTime({
    date: addDays(world.currentDate, daysLater) as IsoDate,
    minuteOfDay: minute,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

describe(
  "CRUNCH46 party and campaign work actions",
  { timeout: 900_000 },
  () => {
    it("the attendance hook is the same World for anything that is not finished party work", () => {
      const life = adultLife("life-actions-a");
      const requested = requestPartyWork(
        life.world,
        life.personId,
        "candidate-guidance",
        life.chapterId,
      );
      const hold = latest(requested, life.personId).scheduledActivityId;
      // Not completed yet.
      expect(recordDomainAttendance(requested, life.personId, hold)).toBe(
        requested,
      );
      expect(recordDomainAttendance(requested, life.personId, "nothing")).toBe(
        requested,
      );
      const went = attendPartyWork(
        requested,
        life.personId,
        latest(requested, life.personId).lifeActivityId,
        "attended",
        REGISTRY,
      );
      // A completed calendar entry that is not party work: the journey there.
      const journey = went.history.scheduledActivities.find(
        (activity) =>
          activity.kind === "travel" &&
          scheduledActivityState(went, activity.id).status === "completed" &&
          (!requested.history.scheduledActivities.some(
            (before) => before.id === activity.id,
          ) ||
            scheduledActivityState(requested, activity.id).status !==
              "completed"),
      );
      expect(journey).toBeDefined();
      expect(recordDomainAttendance(went, life.personId, journey!.id)).toBe(
        went,
      );
      // Completed party work whose outcome is already recorded.
      expect(scheduledActivityState(went, hold).status).toBe("completed");
      expect(recordDomainAttendance(went, life.personId, hold)).toBe(went);
      // Somebody else's view of the same entry.
      expect(recordDomainAttendance(went, life.organizerId, hold)).toBe(went);
    });

    it("a requested talk about running is gone to briefly, with the same outcome as going", () => {
      const life = adultLife("life-actions-a");
      const requested = requestPartyWork(
        life.world,
        life.personId,
        "candidate-guidance",
        life.chapterId,
      );
      const view = latest(requested, life.personId);
      expect(view.state).toBe("accepted");
      expect(
        partyWorkBlockedReason(requested, life.personId, view.lifeActivityId),
      ).toBeNull();
      const brief = attendPartyWork(
        requested,
        life.personId,
        view.lifeActivityId,
        "condensed",
        REGISTRY,
      );
      const full = attendPartyWork(
        requested,
        life.personId,
        view.lifeActivityId,
        "attended",
        REGISTRY,
      );
      for (const [world, attendance] of [
        [brief, "condensed"],
        [full, "attended"],
      ] as const) {
        expect(
          scheduledActivityState(world, view.scheduledActivityId).status,
        ).toBe("completed");
        const outcome = campaignLifeOutcomeRecords(world).at(-1)!;
        expect(outcome.attendance).toBe(attendance);
        expect(outcome.guidanceKnowledgeId).not.toBeNull();
      }
      const briefOutcome = campaignLifeOutcomeRecords(brief).at(-1)!;
      const fullOutcome = campaignLifeOutcomeRecords(full).at(-1)!;
      expect({ ...briefOutcome, attendance: null }).toEqual({
        ...fullOutcome,
        attendance: null,
      });
      // Recording twice is refused in words, never a second outcome.
      expect(() =>
        attendPartyWork(brief, life.personId, view.lifeActivityId, "attended"),
      ).toThrow(/already/);
    });

    it("the calendar's own venue action records the outcome through the hook", () => {
      const life = adultLife("life-actions-a");
      const requested = requestPartyWork(
        life.world,
        life.personId,
        "organization-meeting",
        life.chapterId,
      );
      const view = latest(requested, life.personId);
      const played = performVenueActivity(
        requested,
        life.personId,
        view.scheduledActivityId,
      );
      expect(latest(played, life.personId).outcome?.attendance).toBe(
        "attended",
      );
    });

    it("an offer can be declined or said yes to, and a phone shift is worked from home", () => {
      const life = adultLife("life-actions-a");
      const offered = offerCampaignLifeActivity(life.world, {
        form: "phone-shift",
        hostOrganizationId: life.chapterId,
        hostPersonId: life.organizerId,
        subjectPersonId: life.personId,
        campaignId: null,
        origin: "host-outreach",
        start: evening(life.world, 2, 19 * 60),
        stableKey: "actions-test:phone:1",
      });
      const view = latest(offered, life.personId);
      expect(view.state).toBe("offered");
      expect(() =>
        attendPartyWork(
          offered,
          life.personId,
          view.lifeActivityId,
          "attended",
        ),
      ).toThrow("Say you will do it first.");

      const declined = declinePartyWork(
        offered,
        life.personId,
        view.lifeActivityId,
      );
      expect(latest(declined, life.personId).state).toBe("declined");
      expect(declined.currentMoment).toEqual(offered.currentMoment);
      expect(() =>
        declinePartyWork(declined, life.personId, view.lifeActivityId),
      ).toThrow();

      const accepted = acceptPartyWork(
        offered,
        life.personId,
        view.lifeActivityId,
      );
      expect(latest(accepted, life.personId).state).toBe("accepted");
      const worked = attendPartyWork(
        accepted,
        life.personId,
        view.lifeActivityId,
        "attended",
        REGISTRY,
      );
      const done = latest(worked, life.personId);
      expect(done.state).toBe("completed");
      expect(done.outcome?.contactPersonIds.length).toBe(1);
    });

    it.each(["town-hall", "phone-shift"] as const)(
      "an earlier commitment comes before %s without losing the reason",
      (form) => {
        const life = adultLife("life-actions-a");
        const requested = requestPartyWork(
          life.world,
          life.personId,
          form,
          life.chapterId,
        );
        const view = latest(requested, life.personId);
        // A confirmed errand for the person, well before the town hall's journey.
        const start = simulationMomentAtLocalTime({
          date: view.start.date,
          minuteOfDay: view.start.minuteOfDay - 120,
          timeZone: view.start.timeZone,
          preferredUtcOffsetMinutes: view.start.utcOffsetMinutes,
        });
        const end = simulationMomentAtLocalTime({
          date: view.start.date,
          minuteOfDay: view.start.minuteOfDay - 60,
          timeZone: view.start.timeZone,
          preferredUtcOffsetMinutes: view.start.utcOffsetMinutes,
        });
        const busy = createScheduledActivity(requested, {
          stableKey: "actions-test:errand",
          title: "An errand",
          summary: "Something promised earlier.",
          kind: "confirmed",
          start,
          end,
          participantPersonIds: [life.personId],
          responsiblePersonId: life.personId,
          location: {
            locationKey: "actions-test:errand",
            label: "Across town",
            jurisdictionId: null,
          },
          // Any canonical event other than the invitation itself.
          sourceEntityIds: [requested.history.events[0]!.id],
          flexibility: { kind: "fixed" },
          access: { kind: "private", personIds: [life.personId] },
        });
        expect(
          attendPartyWork(busy, life.personId, view.lifeActivityId, "attended"),
        ).toBe(busy);
        expect(
          partyWorkBlockedReason(busy, life.personId, view.lifeActivityId),
        ).toBe(
          form === "phone-shift"
            ? "Resolve “An errand” on your calendar first."
            : "An earlier commitment must be resolved first.",
        );
        expect(
          partyWorkBlockingActivityId(busy, life.personId, view.lifeActivityId),
        ).toBe(
          form === "phone-shift"
            ? busy.history.scheduledActivities.find(
                (item) => item.stableKey === "actions-test:errand",
              )!.id
            : null,
        );
      },
    );

    it("an attended chapter meeting starts the organizer's follow-up work", () => {
      const life = adultLife("life-actions-b");
      let world = life.world;
      let offer: { chapterId: EntityId; activityId: EntityId } | null = null;
      for (let day = 0; day < 40 && !offer; day += 1) {
        world = passOrdinaryDays(world, 1, { stopForTentativeHolds: true });
        for (const encounter of projectPartyEncounters(world, life.personId)) {
          const found = encounter.activities.find((a) => a.state === "offered");
          if (found) {
            offer = {
              chapterId: encounter.chapterOrganizationId,
              activityId: found.activityId,
            };
            break;
          }
        }
      }
      expect(offer).not.toBeNull();
      const accepted = acceptChapterInvitation(
        world,
        life.personId,
        offer!.activityId,
      );
      const commitment = projectPartyEncounters(accepted, life.personId)
        .find((e) => e.chapterOrganizationId === offer!.chapterId)!
        .activities.find((a) => a.state === "accepted")!;
      let waited = accepted;
      for (let day = 0; day < 10; day += 1) {
        const next = passOrdinaryDays(waited, 1);
        if (next === waited) break;
        waited = next;
        if (
          scheduledActivityState(waited, commitment.activityId).status !==
          "scheduled"
        )
          break;
      }
      const outreachBefore = waited.history.futureDueItems.filter(
        (item) => item.transitionKey === CAMPAIGN_LIFE_OUTREACH_KEY,
      ).length;
      const attended = attendChapterMeeting(
        waited,
        life.personId,
        commitment.activityId,
      );
      expect(
        scheduledActivityState(attended, commitment.activityId).status,
      ).toBe("completed");
      const outreach = attended.history.futureDueItems.filter(
        (item) => item.transitionKey === CAMPAIGN_LIFE_OUTREACH_KEY,
      );
      expect(outreach.length).toBe(outreachBefore + 1);
      expect(outreach.at(-1)!.entityIds).toContain(life.personId);
    });

    it("plans a week without staff: an unaffordable plan is refused and a field plan is lived", () => {
      const life = adultLife("life-actions-a");
      const filed = fileForOffice(life.world, life.personId);
      const campaign = activeCampaignForCandidate(filed, life.personId)!;
      const week = projectCampaignWeek(filed, life.personId)!;
      expect(week.proposerPersonId).toBeNull();
      const money = () =>
        campaignTreasuryPosition(filed, campaign)?.liquidBalance;
      const refused = commitWeek(filed, life.personId, {
        campaignId: week.campaignId,
        weekStart: week.weekStart,
        proposerPersonId: null,
        revision: week.revision,
        emphasis: "field",
        allocation: {
          fieldShifts: 0,
          fundraisingSessions: 0,
          advertisingBuys: 1,
        },
        advertising: {
          channel: "digital",
          geographyKey: week.geographyChoices[0]!.key,
          amount: { minorUnits: 5_000, currency: week.treasury.currency },
        },
      });
      expect(
        projectCampaignWeek(refused, life.personId)!.lastRefusal?.refusal,
      ).toBe("insufficient-funds");
      expect(
        campaignTreasuryPosition(refused, campaign)?.liquidBalance,
      ).toEqual(money());
      const again = projectCampaignWeek(refused, life.personId)!;
      const committed = commitWeek(refused, life.personId, {
        campaignId: again.campaignId,
        weekStart: again.weekStart,
        proposerPersonId: null,
        revision: again.revision,
        emphasis: "field",
        allocation: {
          fieldShifts: 2,
          fundraisingSessions: 1,
          advertisingBuys: 0,
        },
        advertising: null,
      });
      const plan = projectCampaignWeek(committed, life.personId)!.committed!;
      expect(plan.sessions).toHaveLength(3);
      const released = letWeekSessionGo(
        committed,
        life.personId,
        plan.sessions.at(-1)!.actionId,
      );
      const afterRelease = projectCampaignWeek(
        released,
        life.personId,
      )!.committed!;
      expect(
        afterRelease.sessions.find(
          (session) => session.actionId === plan.sessions.at(-1)!.actionId,
        )!.status,
      ).toBe("cancelled");
      const next = afterRelease.nextActionId!;
      const done = doWeekSession(released, life.personId, next);
      // Doing the next session completes it, or returns the very same World
      // when something already on the calendar comes first.
      const doneSession = projectCampaignWeek(
        done,
        life.personId,
      )!.committed!.sessions.find((session) => session.actionId === next)!;
      expect(doneSession.status).toBe(
        done === released ? "scheduled" : "completed",
      );
      const condensed = runWeekCondensed(done, life.personId, plan.planId);
      const final = projectCampaignWeek(condensed, life.personId)!.committed!;
      // The let-go session stays let go and nothing is booked twice.
      expect(final.sessions).toHaveLength(3);
      expect(
        final.sessions.find(
          (session) => session.actionId === plan.sessions.at(-1)!.actionId,
        )!.status,
      ).toBe("cancelled");
      expect(
        final.sessions.filter((session) => session.status === "completed")
          .length,
      ).toBeGreaterThanOrEqual(done === released ? 0 : 1);
      // A condensed run that stopped early stopped at a real blocker.
      if (final.nextActionId !== null) {
        expect(runWeekCondensed(condensed, life.personId, plan.planId)).toBe(
          condensed,
        );
      }
    });
  },
);
