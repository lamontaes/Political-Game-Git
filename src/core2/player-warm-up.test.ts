/**
 * The opening's warm-up (skill day-one-in-motion; src/core2/player-warm-up.ts): the world runs the 31 days
 * before the start date, and the played person does nothing in them. Pinned to Lewiston, Maine, one fixed seed.
 */
import { describe, expect, it } from "vitest";
import {
  buildBenchWorld,
  entrantChoice,
  OPENING_WARMUP_DAYS,
} from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { warmUpOpening } from "./player-warm-up";
import { snapshotExplicitControlV1 } from "./player-control-state-v1";

const PLACE = "2338740";
const SEED = "23142a2761a616b9618e425db3c9591cc9cba0aaf1f83ab37d888944e039ab3b";

describe("opening warm-up", () => {
  it("runs the other people's days and leaves the played person's own life alone, with nothing shown to the player", () => {
    setBookkeeping(false);
    const start = makeIsoDate(gameStartDate());
    const early = addDays(start, -OPENING_WARMUP_DAYS);
    // The same world as the New game route builds, up to the moment the warm-up starts.
    const world = buildBenchWorld(SEED, early, {
      twoLevel: true,
      placeKey: PLACE,
    });
    const core = world.core;
    const playerId = world.playerId!;
    const before = structuredClone(core.people.get(playerId)!);
    const others = [...core.people.values()].filter((p) => p.id !== playerId);
    const actsBefore = others.reduce((sum, p) => sum + p.actCount, 0);
    warmUpOpening(core, start, playerId);
    const after = core.people.get(playerId)!;
    expect(core.date).toBe(start);
    // Nothing the player would have chosen: no act, no job change, no move.
    expect(after.actCount).toBe(before.actCount);
    expect(after.lastActDate).toBe(before.lastActDate);
    expect(after.jobId).toBe(before.jobId);
    expect(after.placeId).toBe(before.placeId);
    expect(after.householdId).toBe(before.householdId);
    // The world did run: other people acted.
    const actsAfter = others.reduce(
      (sum, p) => sum + core.people.get(p.id)!.actCount,
      0,
    );
    expect(actsAfter).toBeGreaterThan(actsBefore);
    // Control is handed back: the player's own clock can take the person.
    expect(snapshotExplicitControlV1(core).personId).toBeUndefined();
  }, 120_000);

  it("shows the player nothing from the warm-up, and the player is the age the start date says", () => {
    setBookkeeping(false);
    const start = makeIsoDate(gameStartDate());
    const world = buildBenchWorld(SEED, start, {
      twoLevel: true,
      placeKey: PLACE,
      warmUpDays: OPENING_WARMUP_DAYS,
    });
    expect(world.core.date).toBe(start);
    for (const book of world.director.ledger.people.values()) {
      expect(book.watchedSince).toBe(start);
      expect(book.moments).toEqual([]);
      expect(book.schedule).toEqual([]);
    }
    const player = world.core.people.get(world.playerId!)!;
    // The golden path: the 17-year-old whose 18th birthday comes soonest after the start.
    expect(ageOnDate(makeIsoDate(player.birthDate), start)).toBe(17);
    expect(typeof entrantChoice).toBe("function");
  }, 140_000);
});
