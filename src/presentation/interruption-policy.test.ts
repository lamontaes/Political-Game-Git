import { describe, expect, it } from "vitest";

import { addDays } from "../simulation/dates";
import { scheduledFutureDueItemsThrough } from "../simulation/future-transitions";
import {
  ensurePressDeskSchedule,
  PRESS_DESK_SWEEP_TRANSITION_KEY,
} from "../simulation/press";
import type { World } from "../simulation/types";
import { recordWorldEvent } from "../simulation/world";
import { advanceStoppingForPressRequests } from "./interruption-policy";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

function opening(): { world: World; personId: string } {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "press-stops-the-clock",
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
      placeKey: "0254920",
    }),
  ).game!;
  return {
    world: ensurePressDeskSchedule(
      openOrdinaryLife(game.world, game.playerPersonId),
    ),
    personId: game.playerPersonId,
  };
}

function askPlayer(world: World, personId: string): World {
  return recordWorldEvent(world, {
    stableKey: `press-stops-the-clock:${world.currentDate}`,
    type: "press.response-requested",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId],
    participants: [
      {
        personId,
        role: "focus:story-subject",
        detail: "Asked to respond before publication",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [],
    summary: "A reporter asked for a response.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("a reporter's question stops the clock", () => {
  const { world, personId } = opening();
  const sweep = scheduledFutureDueItemsThrough(
    world,
    world.currentDate,
    addDays(world.currentDate, 30),
  ).find((item) => item.transitionKey === PRESS_DESK_SWEEP_TRANSITION_KEY)!;

  it("stops a four-week skip at the desk review that asked the player", () => {
    expect(sweep).toBeDefined();
    // The desk review is where a real request is written; stand one in there.
    const reached = advanceStoppingForPressRequests(
      world,
      personId,
      28,
      (from, n) => {
        const next = passOrdinaryDays(from, n);
        return next.currentDate === sweep.dueAt
          ? askPlayer(next, personId)
          : next;
      },
    );
    expect(reached.currentDate).toBe(sweep.dueAt);
    expect(reached.currentDate < addDays(world.currentDate, 28)).toBe(true);
  }, 600_000);

  it("runs the whole skip when nobody asks", () => {
    const reached = advanceStoppingForPressRequests(
      world,
      personId,
      28,
      (from, n) => passOrdinaryDays(from, n),
    );
    expect(reached.currentDate).toBe(addDays(world.currentDate, 28));
  }, 600_000);
});
