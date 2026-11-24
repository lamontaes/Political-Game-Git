/**
 * A seat's holder takes it on the term's true first day, also when that day
 * falls in the warm-up before the day the player starts (owner's playthrough,
 * Nov 23, rows C2 and C4): the President's card said "In office since
 * December 20" (the world's first day) and the cabinet's first nominations
 * were dated before the inauguration. A world is built on a drawn place with
 * the warm-up the New game route runs, and the record is read as it lands.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { cabinetOf } from "./office-day-federal-president";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "term-start");
console.log(`term-start-true-day: ${place.name} (${place.key}), seed ${seed}`);

describe("a holder takes the seat on the term's true first day", () => {
  it("dates the President's term from the inauguration, and no nomination before it", () => {
    const world = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      warmUpDays: OPENING_WARMUP_DAYS,
    });
    const api = coreAPI(world.core);
    const term = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [
          "seat:US:president",
          "serving",
        ]) as unknown as TermRow[]
    )[0]!;
    // The office's start day (the Twentieth Amendment): never the world's first day.
    expect(term.startDate.slice(5)).toBe("01-20");
    expect(term.startDate <= api.state.date).toBe(true);
    for (const post of cabinetOf(api))
      if (post.nominatedOn)
        expect(
          post.nominatedOn >= term.startDate,
          `${post.postId} nominated ${post.nominatedOn}, before the term began ${term.startDate}`,
        ).toBe(true);
  }, 240_000);
});
