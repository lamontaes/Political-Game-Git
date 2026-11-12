/**
 * A counted record leaves with its own share of its group's fund (pool item
 * world-counted-departure-insufficient-group-funds; one model, two tiers):
 * the fund's balance per person times the people the record stands for.
 * A record of weight one half must never move more than the fund holds; a
 * record of weight three moves three households' share. Places are drawn by
 * seed (set COUNTED_DEPARTURE_SEED to reproduce); the place and seed are in
 * every failure.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { fundBalance, peopleInGroup } from "./counted-money";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { departCountedHousehold, residentsRuntime } from "./modules/residents";

const DRAWS = 2;

for (const [label, weight] of [
  ["one half", 0.5],
  ["three", 3],
] as const) {
  it(`a record of weight ${label} leaves with its own share of its group's fund`, () => {
    const base =
      process.env.COUNTED_DEPARTURE_SEED ?? randomBytes(8).toString("hex");
    for (let draw = 0; draw < DRAWS; draw++) {
      const seed = `${base}:${weight}:${draw}`;
      const place = drawPlace(seed, "counted-departure-share");
      const where = `${place.name} (${place.key}), seed ${seed}`;
      const was = setBookkeeping(false);
      try {
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        advanceCore(core, addDays(makeIsoDate(core.date), 35));
        const rt = residentsRuntime(core)!;
        expect(rt.api && rt.funded, `${where}: funded runtime`).toBeTruthy();
        const { store } = rt;
        const target = store
          .liveHouseholds()
          .find((h) => h.group >= 0 && store.countedCount(h) > 0);
        expect(target, `${where}: a live grouped household`).toBeTruthy();
        const h = target!;
        h.weight = weight;
        store.version++;
        const people = peopleInGroup(rt, h.group);
        const before = fundBalance(rt.api!, rt, h.group);
        const expected = Math.floor((before * store.weightedCount(h)) / people);
        const oneHousehold = Math.floor(
          (before * store.countedCount(h)) / people,
        );
        const out = departCountedHousehold(core, h.id);
        expect(out, `${where}: departure`).toBeTruthy();
        const after = fundBalance(rt.api!, rt, h.group);
        expect(before - after, `${where}: cash that left`).toBe(expected);
        expect(
          after,
          `${where}: fund stays at or above zero`,
        ).toBeGreaterThanOrEqual(0);
        if (weight < 1)
          expect(
            before - after,
            `${where}: no more than one household's share`,
          ).toBeLessThanOrEqual(oneHousehold);
      } finally {
        setBookkeeping(was);
      }
    }
  }, 600_000);
}
