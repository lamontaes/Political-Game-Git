import { describe, expect, it } from "vitest";
import { MORTALITY_WINDOW_KEY } from "../simulation/crisis/mortality";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { LEGACY_WORLD_OPENING_VERSION } from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { advanceWorld } from "../simulation/world";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { advanceCalendarToActivity } from "./calendar-time-control";
import { passOrdinaryDays } from "./ordinary-life";
import {
  scheduledActivitiesVisibleTo,
  scheduledActivityState,
} from "../simulation";
import type { World } from "../simulation/types";

/**
 * CRUNCH47, from LAND's F47 follow-up: the mortality producer is started by
 * the clock, in passOrdinaryDays. Several production paths move time without
 * going through it — advanceCalendarToActivity is the one a player can reach,
 * through the "wait until this activity" control. The question this answers is
 * whether an ordinary life can accumulate real time, and therefore real risk,
 * in a world where the producer was never started and nobody can die.
 *
 * This asserts where the producer is started, not what its rates are. No rate
 * is read or changed here.
 */
const LONG = 900_000;

function mortalityWindows(world: World) {
  return world.history.futureDueItems.filter(
    (item) => item.transitionKey === MORTALITY_WINDOW_KEY,
  );
}

function opened(seed: string, openingVersion?: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 30,
      depth: "summarize-earlier-life",
      ...(openingVersion === undefined
        ? {}
        : { worldOpeningVersion: openingVersion as never }),
    }),
  ).game!;
}

describe("a current opening can always die", () => {
  it(
    "the producer exists from the opening, before any day is passed",
    () => {
      const life = opened("mortality-entry-opening");
      // The world a player is handed already carries the model; it does not
      // wait for them to press a particular control first.
      expect(mortalityWindows(life.world).length).toBe(1);
    },
    LONG,
  );

  it(
    "waiting for a scheduled activity starts nothing, which is why the opening must",
    () => {
      // A legacy opening is a genuine producer-free world — no record is
      // removed to make one, because deleting a due item would break history
      // contiguity and prove nothing about the game.
      const life = opened(
        "mortality-entry-activities",
        LEGACY_WORLD_OPENING_VERSION,
      );
      expect(mortalityWindows(life.world).length).toBe(0);

      // Time moves through a path that is not passOrdinaryDays, so the world
      // acquires a calendar without acquiring the producer.
      const lived = advanceWorld(
        life.world,
        45,
        createCampaignElectionTransitionRegistry(),
      );
      expect(mortalityWindows(lived).length).toBe(0);

      const activities = scheduledActivitiesVisibleTo(
        lived,
        life.playerPersonId,
      ).filter(
        (activity) =>
          scheduledActivityState(lived, activity.id).start.date >
          lived.currentDate,
      );
      console.info(
        JSON.stringify({
          futureActivities: activities.length,
          firstStart: activities[0]
            ? scheduledActivityState(lived, activities[0].id).start.date
            : null,
        }),
      );
      if (activities.length === 0) {
        // Reported rather than passed over: this leg did not get to run.
        console.info(
          JSON.stringify({
            unmeasured:
              "this seed scheduled nothing the player can wait for, so the wait-for-activity path was not exercised",
          }),
        );
        return;
      }

      // The player's "wait until this activity" control goes through
      // advanceWorldMinutes, never passOrdinaryDays, so it starts nothing.
      // Real time passes and the producer is still absent.
      const waited = advanceCalendarToActivity(
        lived,
        life.playerPersonId,
        activities[0]!.id,
      );
      expect(waited.world.currentDate >= lived.currentDate).toBe(true);
      expect(mortalityWindows(waited.world).length).toBe(0);
    },
    LONG,
  );

  it(
    "passing ordinary days still starts it for a save that has none",
    () => {
      // The older entry point keeps working; the opening adds an earlier one
      // rather than moving it, so legacy saves are unaffected.
      const life = opened(
        "mortality-entry-ordinary",
        LEGACY_WORLD_OPENING_VERSION,
      );
      expect(mortalityWindows(life.world).length).toBe(0);
      const passed = passOrdinaryDays(life.world, 1);
      expect(mortalityWindows(passed).length).toBe(1);
    },
    LONG,
  );
});
