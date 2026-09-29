import { describe, expect, it } from "vitest";

import {
  addDays,
  campaignActionResult,
  campaignForCandidate,
  deserializeWorld,
  ensureCampaignOpponents,
  ensureStateJurisdiction,
  fileCampaign,
  makeCurrencyCode,
  searchLifePlaces,
  serializeWorld,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
} from "./index";
import type { EntityId, World } from "./index";
import { currentCampaignRoutine, setCampaignRoutine } from "./campaign-routine";
import { campaignActionForActivity } from "./campaign-queries";
import {
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
} from "./time-work";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import {
  composeFutureTransitionHandlerRegistries,
  createFutureTransitionHandlerRegistry,
} from "./future-transitions";
import type { RoutineTimeHook } from "./types";
import { simulationMomentAtLocalTime } from "./dates";
import { assertWorldIntegrity } from "./world";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../presentation/ordinary-life";

const SLOW = 120_000;

/** An ordinary 40-year-old life in a town in the state, filed for governor. */
function governorRace(usps: string, seed: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${usps}`,
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const personId = game.playerPersonId;
  const world = openOrdinaryLife(game.world, personId);
  const jurisdictionId = stateJurisdictionForKey(`US-${usps}`)!.id;
  const opponents = ensureCampaignOpponents(
    ensureStateJurisdiction(world, usps),
    {
      stableKey: `routine-${usps}`,
      jurisdictionId,
      count: 1,
      excludePersonIds: [personId],
    },
  );
  const filed = fileCampaign(opponents.world, {
    stableKey: `routine-${usps}`,
    candidatePersonId: personId,
    jurisdictionId,
    officeKey: stateExecutiveIdentity(usps)!.officeKey,
    districtBinding: null,
    electionDate: addDays(world.currentDate, 90),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: `Committee for the ${usps} fixture`,
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  return { world: filed.world, personId };
}

/** Routine sessions on record: booked by a routine, with their state. */
function routineSessions(world: World, personId: EntityId) {
  const routines = new Set(
    (world.history.campaignRoutines ?? []).map((routine) => routine.eventId),
  );
  return world.history.scheduledActivities
    .filter(
      (activity) =>
        activity.responsiblePersonId === personId &&
        activity.sourceEntityIds.some((id) => routines.has(id)),
    )
    .map((activity) => {
      const action = campaignActionForActivity(world, activity.id)!;
      return {
        date: scheduledActivityState(world, activity.id).start.date,
        status: scheduledActivityState(world, activity.id).status,
        kind: action.kind,
        done: Boolean(campaignActionResult(world, action.id)),
      };
    });
}

/** Lets days pass the way the player's "pass a day" does, a day at a time. */
function passDays(world: World, days: number): World {
  let current = world;
  const until = addDays(world.currentDate, days);
  for (let step = 0; step < days * 4 && current.currentDate < until; step += 1)
    current = passOrdinaryDays(current, 1);
  return current;
}

const EVENINGS = {
  work: "outreach" as const,
  weekdays: [1, 2, 3, 4, 5],
  startMinute: 19 * 60,
  minutes: 90,
};
const EARLY_CALLS = {
  work: "fundraising" as const,
  weekdays: [1, 2, 3, 4, 5],
  startMinute: 6 * 60,
  minutes: 60,
};
const SATURDAY_CALLS = {
  work: "fundraising" as const,
  weekdays: [6],
  startMinute: 10 * 60,
  minutes: 60,
};

describe("standing campaign hours (D-11)", () => {
  it(
    "runs the routine on the ordinary clock until it is changed, and writes each session up",
    () => {
      const { world, personId } = governorRace("OR", "d11-routine-or");
      const routineSet = setCampaignRoutine(world, personId, [
        EVENINGS,
        SATURDAY_CALLS,
      ]);
      const campaign = campaignForCandidate(routineSet, personId)!;
      expect(currentCampaignRoutine(routineSet, campaign.id)?.blocks).toEqual([
        SATURDAY_CALLS,
        EVENINGS,
      ]);
      // Setting the same hours again writes nothing.
      expect(
        setCampaignRoutine(routineSet, personId, [SATURDAY_CALLS, EVENINGS]),
      ).toBe(routineSet);

      const week = passDays(routineSet, 7);
      const sessions = routineSessions(week, personId);
      // Every session the clock booked in the week was done and written up,
      // and nothing the routine booked was left hanging in the past.
      expect(sessions.length).toBeGreaterThan(0);
      for (const session of sessions.filter(
        (row) => row.date < week.currentDate,
      ))
        expect(session).toMatchObject({ status: "completed", done: true });
      expect(new Set(sessions.map((row) => row.kind))).toEqual(
        new Set(["outreach", "fundraising"]),
      );
      assertWorldIntegrity(deserializeWorld(serializeWorld(week)));

      // Stopping the routine stops the sessions.
      const stopped = setCampaignRoutine(week, personId, []);
      const later = passDays(stopped, 7);
      const booked = routineSessions(later, personId).filter(
        (row) => row.date > stopped.currentDate,
      );
      expect(booked).toEqual([]);
    },
    SLOW,
  );

  it(
    "loses a session another commitment holds the time for, and keeps the rest",
    () => {
      const { world, personId } = governorRace("WA", "d11-routine-wa");
      const routineSet = setCampaignRoutine(world, personId, [EARLY_CALLS]);
      // The game opens on Monday, January 5, 2026; early Tuesday is promised
      // elsewhere before the routine reaches it.
      const tuesday = addDays(routineSet.currentDate, 1);
      const at = (minuteOfDay: number) =>
        simulationMomentAtLocalTime({
          date: tuesday,
          minuteOfDay,
          timeZone: routineSet.currentMoment.timeZone,
          preferredUtcOffsetMinutes: routineSet.currentMoment.utcOffsetMinutes,
        });
      const promised = createScheduledActivity(routineSet, {
        stableKey: "d11-test:tuesday-breakfast",
        title: "An early breakfast with a friend",
        summary: "A breakfast promised before the routine reached Tuesday.",
        kind: "confirmed",
        start: at(5 * 60 + 30),
        end: at(6 * 60 + 30),
        participantPersonIds: [personId],
        responsiblePersonId: personId,
        location: {
          locationKey: "d11-test:breakfast",
          label: "A diner",
          jurisdictionId: null,
        },
        sourceEntityIds: [personId],
        flexibility: { kind: "fixed" },
        access: { kind: "private", personIds: [personId] },
      });
      const breakfastId = promised.history.scheduledActivities.at(-1)!.id;
      let current = promised;
      const until = addDays(promised.currentDate, 4);
      for (let step = 0; step < 16 && current.currentDate < until; step += 1) {
        const next = passOrdinaryDays(current, 1);
        // The breakfast is a promise the player keeps; time stops for it.
        current =
          next === current &&
          scheduledActivityState(current, breakfastId).status === "scheduled"
            ? performScheduledActivity(
                current,
                breakfastId,
                createCampaignElectionTransitionRegistry(),
              )
            : next;
      }
      expect(scheduledActivityState(current, breakfastId).status).toBe(
        "completed",
      );
      const byDate = new Map(
        routineSessions(current, personId).map((row) => [row.date, row]),
      );
      // Monday's 6 a.m. session had gone by before the routine was set, so it
      // was never asked for; Tuesday's was lost to the breakfast; Wednesday's
      // and Thursday's were done.
      expect(byDate.has(promised.currentDate)).toBe(false);
      expect(byDate.has(tuesday)).toBe(false);
      expect(byDate.get(addDays(tuesday, 1))).toMatchObject({ done: true });
      expect(byDate.get(addDays(tuesday, 2))).toMatchObject({ done: true });
    },
    SLOW,
  );

  it("keeps each routine once when registries are composed again", () => {
    const calls: string[] = [];
    const hook = (name: string): RoutineTimeHook => ({
      isAutoResolvableActivity: () => false,
      projectWindows: () => [],
      ensureScheduled: (world) => world,
      afterActivityCompleted: (world) => {
        calls.push(name);
        return world;
      },
    });
    const job = createFutureTransitionHandlerRegistry([], hook("job"));
    const hours = createFutureTransitionHandlerRegistry([], hook("hours"));
    const both = composeFutureTransitionHandlerRegistries(job, hours);
    const again = composeFutureTransitionHandlerRegistries(
      composeFutureTransitionHandlerRegistries(hours, both),
      job,
    );
    const world = {} as World;
    again.routine!.afterActivityCompleted(world, "activity" as EntityId);
    // Each routine once, the one met first still first.
    expect(calls).toEqual(["hours", "job"]);
  });

  it(
    "refuses hours that overlap or run past midnight",
    () => {
      const { world, personId } = governorRace("NM", "d11-routine-nm");
      expect(() =>
        setCampaignRoutine(world, personId, [
          EVENINGS,
          { ...SATURDAY_CALLS, weekdays: [1], startMinute: 19 * 60 + 30 },
        ]),
      ).toThrow("overlap");
      expect(() =>
        setCampaignRoutine(world, personId, [
          { ...EVENINGS, startMinute: 23 * 60, minutes: 120 },
        ]),
      ).toThrow("same day");
    },
    SLOW,
  );
});
