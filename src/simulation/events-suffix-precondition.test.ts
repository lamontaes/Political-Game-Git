import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import { assertWorldIntegrity } from "./world";
import type { World } from "./types";

/**
 * The precondition a suffix proof for the event family depends on.
 *
 * Proving only the events appended since the last proof is sound ONLY while
 * every check in that pass is monotone in the safe direction: an event that
 * validated once must never stop validating as the world moves on. That holds
 * today because those checks read frozen event fields, a current date that
 * only increases, maps written by spread-and-add, and append-only history.
 *
 * It is a property of the checks as they stand, not of the design. One check
 * added to that loop that reads state which can move in both directions and
 * the suffix proof becomes silently wrong — the skipped check is exactly the
 * one whose answer changed, and no existing test would notice.
 *
 * So this asserts the property rather than describing it. An event that was
 * present and valid at an earlier frontier is still present, still identical,
 * and still passes the full integrity pass after the world has moved a long
 * way past it. If somebody adds a non-monotone check, this fails.
 */
const LONG = 1_800_000;

function frontier(world: World) {
  return world.history.events.map((event) => ({
    id: event.id,
    sequence: event.sequence,
    occurredAt: event.occurredAt,
    recordedAt: event.recordedAt,
    type: event.type,
  }));
}

describe("an event that proved once keeps proving", () => {
  it(
    "earlier events stay identical and keep passing as the world advances",
    () => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: "events-suffix-precondition",
          startAge: 30,
          depth: "summarize-earlier-life",
        }),
      ).game!;
      let world = game.world;
      // Full pass at the first frontier: every event here is proven valid.
      expect(() => assertWorldIntegrity(world)).not.toThrow();
      const first = frontier(world);
      expect(first.length).toBeGreaterThan(0);

      const checkpoints: { day: number; events: number }[] = [];
      for (let step = 1; step <= 8; step += 1) {
        world = passOrdinaryDays(world, 45);
        // The whole pass re-proves every earlier event. If any had become
        // invalid, this throws — which is the failure a suffix proof would
        // silently skip.
        expect(() => assertWorldIntegrity(world)).not.toThrow();
        checkpoints.push({ day: step * 45, events: world.history.events.length });
      }

      // The earlier events are not merely still valid, they are untouched:
      // a suffix proof assumes the prefix cannot have been rewritten either.
      const later = frontier(world);
      expect(later.length).toBeGreaterThan(first.length);
      expect(later.slice(0, first.length)).toEqual(first);

      console.info(
        JSON.stringify({
          startDate: game.world.currentDate,
          endDate: world.currentDate,
          daysAdvanced: 8 * 45,
          eventsAtFirstFrontier: first.length,
          eventsNow: later.length,
          checkpoints,
        }),
      );
      expect(world.currentDate > addDays(game.world.currentDate, 300)).toBe(
        true,
      );
    },
    LONG,
  );
});
