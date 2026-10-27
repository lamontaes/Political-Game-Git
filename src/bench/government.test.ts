/**
 * The Politics sheet carries each holder's years of service, how they reached
 * the seat and the elections the world ran for it, from the term records, in a place drawn
 * from all 56 (place and seed named in every failure message).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { governmentView } from "./government";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "bench-government-terms");

describe(`the government view in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("sends each holder's service, how they reached the seat and the seat's elections", () => {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const view = governmentView(core, core.playerId!);
    const held = view.seats.filter((seat) => seat.holder);
    expect(held.length).toBeGreaterThan(0);
    for (const seat of held) {
      const holder = seat.holder!;
      expect(holder.serviceStart, seat.seatId).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(holder.reached, seat.seatId).toBeTruthy();
      // The seat's elections are only races the world ran: a holder seated
      // before the opening has an estimated average share, which is not sent
      // (owner, Oct 27: no placeholder vote share on screen).
      if (holder.reached === "in office at the opening")
        expect(
          seat.elections.some((row) => row.termId === holder.termId),
          seat.seatId,
        ).toBe(false);
    }
  }, 300_000);
});
