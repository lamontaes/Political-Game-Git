/**
 * Group quarters fill the rooms their residents left (owner, Nov 8: group
 * quarters turn over): a place's rooms of one type are its beds, and a room
 * emptied by a death or a fill-in is taken by the next person on the
 * institution's waiting list, so no institution runs down by more than one
 * room in a played year. A place with group quarters drawn from all 56; set
 * GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { COUNTED_MOVES_MODULE_ID } from "./modules/counted-moves";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** The weighted people in each (place, type) of group quarters, and the heaviest room of each. */
function quarters(core: CoreState) {
  const store = residentsRuntime(core)!.store;
  const out = new Map<string, { people: number; heaviest: number }>();
  for (const h of store.liveHouseholds()) {
    if (!h.quarters || !store.countedMembers(h).length) continue;
    const key = `${h.placeId}|${h.quarters}`;
    const row = out.get(key) ?? { people: 0, heaviest: 0 };
    const n = store.weightedCount(h);
    row.people += n;
    row.heaviest = Math.max(row.heaviest, n);
    out.set(key, row);
  }
  return out;
}

it(`group quarters fill the rooms they empty (seed ${seed})`, () => {
  setBookkeeping(false);
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "counted-rooms");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // The first month records each institution's beds.
    advanceCore(core, addDays(makeIsoDate(core.date), 35));
    const before = quarters(core);
    if (!before.size) continue;
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const after = quarters(core);
    const api = coreAPI(core);
    const admitted = (
      api
        .moduleState(COUNTED_MOVES_MODULE_ID)
        .table("moves")
        .rows() as unknown as { fromPlace: string }[]
    ).filter((row) => row.fromPlace === "waiting-list").length;
    for (const [key, was] of before) {
      const now = after.get(key)?.people ?? 0;
      expect(
        was.people - now,
        `${where}: ${key} lost ${was.people - now} of ${was.people} with ${admitted} admissions`,
      ).toBeLessThan(was.heaviest + 1e-6);
    }
    console.log(
      `${where}: ${before.size} institutions, ${admitted} admissions`,
    );
    return;
  }
  console.log(`seed ${seed}: no drawn place had group quarters`);
}, 900_000);
