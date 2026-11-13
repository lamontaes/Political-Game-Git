/**
 * Newcomers arrive in a place by its share of the people, as leavers go by
 * its due movers (pool item world-town-net-moving-negative). The cause found
 * (src/core2/modules/counted-moves.ts, `arrivals`): arrivals were held per
 * origin and age band, never per place, and each month one place was drawn by
 * a hash weighted by its people, the loop stopping at the first household
 * larger than the balance, so a large neighboring record blocked the town's
 * arrivals and a town's small share seldom paid out (Marcola, Oregon: due
 * about 29 a year, arrived 6). Now each place keeps its own share of every
 * month's due and a household arrives once the place's total reaches half a
 * household. In the played world of two places drawn from all 56, one year:
 * the town's carried balance at year's end is within one of its households,
 * and no place carries more than one of its own households. The place and
 * seed are in every message; replay with ARRIVALS_SEED.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { COUNTED_MOVES_MODULE_ID, runtimeOf } from "./modules/counted-moves";
import { residentsRuntime, townPlaceOf } from "./modules/residents";
import { coreAPI } from "./state";

setBookkeeping(false);

const base = process.env.ARRIVALS_SEED ?? randomBytes(8).toString("hex");

describe.each(["a", "b"])("arrivals by place (draw %s)", (draw) => {
  it("each place's newcomers are its share of the due, to within one of its households", () => {
    const seed = `${base}:${draw}`;
    const place = drawPlace(seed, "arrivals-by-place");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const rt = runtimeOf(api);
    const store = residentsRuntime(core)?.store;
    expect(rt, `${where}: no counted moves`).toBeDefined();
    expect(store, `${where}: no counted households`).toBeDefined();
    // The largest household each place keeps: what one household is there.
    const largest = new Map<string, number>();
    for (const h of store!.liveHouseholds())
      largest.set(
        h.placeId,
        Math.max(largest.get(h.placeId) ?? 0, store!.weightedCount(h)),
      );
    const carried = new Map<string, number>();
    for (const [placeId, own] of rt!.arriveAt ?? [])
      carried.set(
        placeId,
        [...own.values()].reduce((sum, value) => sum + value, 0),
      );
    const moves = api
      .moduleState(COUNTED_MOVES_MODULE_ID)
      .table("moves")
      .rows() as unknown as {
      id: string;
      direction: string;
      toPlace: string;
      fromPlace?: string;
      people: number;
      reasons?: unknown;
    }[];
    const town = townPlaceOf(core)!;
    const inTown = moves.filter(
      (m) => m.direction === "in" && m.toPlace === town,
    );
    const arrived = inTown.reduce((sum, m) => sum + m.people, 0);
    const owed = carried.get(town) ?? 0;
    console.log(
      `arrivals-by-place: ${where}; town ${town}: due ${(arrived + owed).toFixed(1)}, arrived ${arrived} in ${inTown.length} households (${inTown
        .slice(0, 5)
        .map((m) => m.id)
        .join(", ")}), carried ${owed.toFixed(2)}`,
    );
    for (const m of inTown)
      expect(m.reasons, `${where}: ${m.id} names no reason`).toBeTruthy();
    for (const [placeId, value] of carried) {
      const one = largest.get(placeId) ?? 0;
      expect(
        Math.abs(value),
        `${where}: ${placeId} carries ${value.toFixed(2)} people due to arrive, more than one of its households (${one})`,
      ).toBeLessThanOrEqual(Math.max(one, 1));
    }
  }, 1_800_000);
});
