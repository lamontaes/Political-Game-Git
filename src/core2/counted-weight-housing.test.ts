/** One model, two tiers: the town's rental stock stands for as many renting households as the counted records' weights say. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import type { StockRow } from "./housing-construction";

const SCALE = 3;
/** Counted group sizes round to whole households: a few percent of a small stock. */
const ROUNDING = 0.05;

function openStock(seed: string, key: string, countScale?: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    countScale: countScale ?? 1,
  });
  // The housing engine records its stock on its first day.
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  return (
    coreAPI(core)
      .moduleState("housing")
      .table("stock")
      .rows() as unknown as StockRow[]
  ).sort((a, b) => a.placeId.localeCompare(b.placeId));
}

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(32).toString("hex");

it(`sizes the rental stock to the renting households the counted records stand for (seed ${seed})`, () => {
  // A town of owners only has no rental stock to size: places are drawn in
  // turn until one has renters at the opening.
  const tried: string[] = [];
  for (let life = 0; life < 6; life += 1) {
    const draw = drawPlace(`${seed}:${life}`, "census-housing");
    const where = `seed ${draw.seed}, ${draw.name} (${draw.key}), draw ${seed}:${life}`;
    const base = openStock(draw.seed, draw.key);
    expect(base.length, where).toBeGreaterThan(0);
    if (!base.some((row) => row.rentalUnits > 0)) {
      tried.push(draw.name);
      continue;
    }
    const scaled = openStock(draw.seed, draw.key, SCALE);
    expect(
      scaled.map((row) => row.placeId),
      where,
    ).toEqual(base.map((row) => row.placeId));
    base.forEach((row, at) => {
      const big = scaled[at]!;
      // Three times the renters, within the full people who stay one each and
      // the rounding of each counted group's size to whole households.
      const fullRenters = row.rentalUnits - row.vacantRental;
      const renters = big.rentalUnits - big.vacantRental;
      expect(renters, `${where}: ${row.placeId}`).toBeGreaterThanOrEqual(
        fullRenters,
      );
      expect(renters, `${where}: ${row.placeId}`).toBeLessThanOrEqual(
        SCALE * fullRenters * (1 + ROUNDING) + SCALE,
      );
    });
    // The town the player lives in: its counted renters triple, so its units grow.
    const town = base.reduce((a, b) => (b.rentalUnits > a.rentalUnits ? b : a));
    const bigTown = scaled.find((row) => row.placeId === town.placeId)!;
    expect(bigTown.rentalUnits, where).toBeGreaterThan(town.rentalUnits);
    return;
  }
  throw new Error(
    `no drawn place had renters at the opening: ${tried.join("; ")} (seed ${seed})`,
  );
}, 900_000);
