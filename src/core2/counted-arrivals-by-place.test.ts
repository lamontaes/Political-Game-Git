/**
 * Newcomers arrive in each place by its share of the people, as leavers go by
 * its due movers (pool item world-town-net-moving-negative).
 *
 * The cause found (src/core2/modules/counted-moves.ts, `arrivals`): arrivals
 * were held per origin and age band, never per place. Each month one place was
 * drawn by a hash weighted by its people, and the balance stopped at the first
 * household larger than what was left, so a large neighboring record blocked
 * the town's arrivals and a town's small share seldom paid out. A household
 * was also charged to the band of its oldest member alone, so the under-18
 * due bought households headed by 30-to-44-year-olds and the children in them
 * were never counted against it. Measured on the train (Nov 13) in Everson,
 * Pennsylvania (`drawPlace("d4", "students-measure")`): 20 people arrived in
 * year 1 against 44 leaving (-2.6 percent), 65 in year 2 (+4.3 percent), with
 * 1,144 people due to arrive around the town and never paid out at the end of
 * year 1. Now each place keeps its own share of every month's due; a
 * household arrives once the place's whole balance reaches half a household,
 * shaped like one of the place's households with someone of the age most due;
 * each of its people is charged to their own age's balance.
 *
 * In the played world of two places drawn from all 56, one year: every
 * arrival names its reasons; the town's arrivals are its due to within one of
 * its households; no place carries, in all or at any one age, more than one
 * of its own households. The place and seed are in every message; replay with
 * ARRIVALS_SEED.
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
    const moves = api
      .moduleState(COUNTED_MOVES_MODULE_ID)
      .table("moves")
      .rows() as unknown as {
      id: string;
      direction: string;
      toPlace: string;
      fromPlace: string;
      people: number;
      reasons?: Record<string, number>;
    }[];
    const town = townPlaceOf(core)!;
    const inTown = moves.filter(
      // Rooms refilled from an institution's waiting list are its turnover,
      // not newcomers to the place (`admitToRooms`).
      (m) =>
        m.direction === "in" &&
        m.toPlace === town &&
        m.fromPlace !== "waiting-list",
    );
    const arrived = inTown.reduce((sum, m) => sum + m.people, 0);
    const owedOf = (placeId: string) =>
      [...(rt!.arriveAt.get(placeId)?.values() ?? [])].reduce(
        (sum, value) => sum + value,
        0,
      );
    const owed = owedOf(town);
    console.log(
      `arrivals-by-place: ${where}; town ${town}: due ${(arrived + owed).toFixed(1)}, arrived ${arrived} in ${inTown.length} households (${inTown
        .slice(0, 5)
        .map((m) => m.id)
        .join(", ")}), carried ${owed.toFixed(2)}`,
    );
    expect(
      inTown.length,
      `${where}: no household arrived in the town`,
    ).toBeGreaterThan(0);
    for (const m of inTown)
      expect(
        Object.keys(m.reasons ?? {}).length,
        `${where}: ${m.id} names no reason`,
      ).toBeGreaterThan(0);
    for (const [placeId, own] of rt!.arriveAt) {
      const one = Math.max(largest.get(placeId) ?? 0, 1);
      const total = owedOf(placeId);
      expect(
        Math.abs(total),
        `${where}: ${placeId} carries ${total.toFixed(2)} people due to arrive, more than one of its households (${one})`,
      ).toBeLessThanOrEqual(one);
      const byBand = new Map<string, number>();
      for (const [key, value] of own) {
        const band = key.split("|")[1]!;
        byBand.set(band, (byBand.get(band) ?? 0) + value);
      }
      for (const [band, value] of byBand)
        expect(
          Math.abs(value),
          `${where}: ${placeId} carries ${value.toFixed(2)} people of age band ${band} due to arrive, more than one of its households (${one})`,
        ).toBeLessThanOrEqual(one);
    }
  }, 1_800_000);
});
