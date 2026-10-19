/**
 * Press staff leave one at a time, each from its own cause (pool item
 * world-press-staff-same-day-exit). Ten staff once left on one December day
 * because they had no household and read as strained with no savings; with
 * households drawn for the town's own staff, no date is shared by more than a
 * few. A place is drawn from all 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { PRESS_MODULE_ID } from "./modules/press";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

interface Staff {
  id: string;
  leftOn?: string;
  leftBecause?: string;
}

it("press staff departures are spread over the year, a few at most on one date", () => {
  const place = drawPlace(seed, "press-staff-departures");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  for (let day = 0; day < 365; day += 1)
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  const staff = coreAPI(world.core)
    .moduleState(PRESS_MODULE_ID)
    .table("staff")
    .rows() as unknown as Staff[];
  const byDate = new Map<string, string[]>();
  for (const row of staff)
    if (row.leftOn)
      byDate.set(row.leftOn, [...(byDate.get(row.leftOn) ?? []), row.id]);
  for (const [date, ids] of byDate)
    expect(
      ids.length,
      `${where}: ${ids.length} staff left on ${date}`,
    ).toBeLessThanOrEqual(3);
  for (const row of staff.filter((r) => r.leftOn))
    expect(row.leftBecause, `${where}: ${row.id} has a cause`).toBeTruthy();
}, 1_800_000);
