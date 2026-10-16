/**
 * The Politics sheet carries each holder's years of service, how they reached
 * the seat and the seat's elections, from the term records, in a place drawn
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
      // A holder the world opened with by election has that election listed,
      // named by the term it seated.
      if (holder.elected)
        expect(
          seat.elections.some((row) => row.termId === holder.termId),
          seat.seatId,
        ).toBe(true);
    }
    // Some seat in a town shows an election with its record id.
    expect(
      held.some((seat) => seat.elections.length > 0),
      `${place.key}: no seat shows an election`,
    ).toBe(true);
  }, 300_000);
});
