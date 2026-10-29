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
import { knownCard } from "./card";
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

  it("sends every holder's headshot and card id, and a named official opens a card", () => {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const view = governmentView(core, core.playerId!);
    const held = view.seats.filter((seat) => seat.holder);
    // Every holder carries the id a click opens and a face field; a face is
    // the figure's url and head, never initials (owner, Oct 28, point 12).
    for (const seat of held) {
      const holder = seat.holder!;
      expect(holder.cardId, seat.seatId).toBeTruthy();
      expect("face" in holder, seat.seatId).toBe(true);
      if (holder.face) {
        expect(holder.face.url, seat.seatId).toMatch(/^\/art\/people-engine\//);
        expect(holder.face.head.length, seat.seatId).toBe(3);
      }
    }
    expect(held.filter((seat) => seat.holder!.face).length).toBeGreaterThan(0);
    // The player's own members (senators, representative, legislators) have
    // faces and open a card by their id, resident or named official.
    const own = view.keyPeople.filter((k) => k.own);
    expect(own.length).toBeGreaterThan(0);
    for (const k of own) {
      expect(k.face, `${k.name} (${k.personId})`).toBeTruthy();
      const card = knownCard(core, core.playerId!, k.personId);
      expect(card.name, k.personId).toBe(k.name);
      expect(card.face, k.personId).toBeTruthy();
    }
    // A named official who is not a resident gets the public card from their term.
    const official = own.find((k) => !k.resident);
    if (official) {
      const card = knownCard(core, core.playerId!, official.personId);
      expect(card.seats[0]?.office, official.personId).toBeTruthy();
      expect(card.publicKnowledge, official.personId).toBeTruthy();
    }
  }, 300_000);
});
