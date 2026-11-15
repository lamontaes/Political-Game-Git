/**
 * A counted record leaves with its own share of its group's fund (pool item
 * world-counted-departure-insufficient-group-funds; one model, two tiers):
 * the fund's balance per claim times the record's claim (the people it
 * stands for at its savings weight).
 * A record of weight one half must never move more than the fund holds; a
 * record of weight three moves three households' share.
 *
 * Pinned (tests-housing-sale-tests-draw-from-the-clock): each weight is
 * tried on one named place, seed and household. The old test drew two
 * places a weight from randomBytes and took the first live grouped
 * household, on the premise that any draw has one; every pinned household
 * below is a live grouped counted household 35 days in.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  claimsInGroup,
  fundBalance,
  savingClaim,
  savingWeight,
} from "./counted-money";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { departCountedHousehold, residentsRuntime } from "./modules/residents";

const CASES = [
  {
    label: "one half",
    weight: 0.5,
    // Orion, Illinois.
    place: {
      key: "1756601",
      seed: "54fc08284d70643c62458d11a48f768d39daba4af3e8ffd03543850dddc8c9b1",
    },
    householdId: "household_5e86f896a4cbbc2b",
  },
  {
    label: "three",
    weight: 3,
    // Tiburones, Puerto Rico.
    place: {
      key: "7282125",
      seed: "fe8f03a2510a454fd415434c9888646c33151a2bbb5054f5bfd748e9926d1b03",
    },
    householdId: "household_9e987cde5740412d",
  },
] as const;

for (const { label, weight, place, householdId } of CASES) {
  it(`a record of weight ${label} leaves with its own share of its group's fund`, () => {
    const where = `place ${place.key}, seed ${place.seed}, ${householdId}`;
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
      const target = store.liveHouseholds().find((h) => h.id === householdId);
      expect(
        target && target.group >= 0 && store.countedCount(target) > 0,
        `${where}: a live grouped household`,
      ).toBe(true);
      const h = target!;
      h.weight = weight;
      store.version++;
      // Each household's claim on the fund is its people at its savings weight (savingWeight).
      const claims = claimsInGroup(rt, h.group);
      const before = fundBalance(rt.api!, rt, h.group);
      const expected = Math.floor((before * savingClaim(rt, h)) / claims);
      const oneHousehold = Math.floor(
        (before * store.countedCount(h) * savingWeight(core.seed, h)) / claims,
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
    // About 27 s measured (Orion), 20 s (Tiburones): building the place and its 35 days.
  }, 60_000);
}
