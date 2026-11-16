/**
 * A counted household's savings weight is exp(σz − σ²/2) with z a standard
 * normal fixed by the world's seed and the household's id (pool item
 * counted-saving-draw-not-normal). The draw used to come from Box-Muller on
 * the FNV hash of the same key ending ":a" and ":b", whose two units differ
 * only in their last digits, so z was a function of one unit: over the
 * 20,000 ids below it put 213 above 3, against 27 for a normal, and the
 * weights' mean was far from one.
 *
 * The bounds are the normal's own sampling range for 20,000 draws, at four
 * standard deviations either way (about one run in 16,000 would fall outside
 * by chance; the ids and seed are fixed, so the run is the same every time):
 *   - above 3: p = 0.00135, so n·p = 27.0 and sd = √(n·p·(1−p)) = 5.2;
 *     4 sd gives 6.2 to 47.8.
 *   - the weights' mean: one, with sd √(e^{σ²} − 1)/√n, at σ = 1.39
 *     √(6.90 − 1)/141.4 = 0.0172; 4 sd gives 0.931 to 1.069.
 */
import { expect, it } from "vitest";
import { savingWeight } from "./counted-money";
import { countedParameter } from "./modules/residents";

const SEED = "saving-weight-draw";
const N = 20_000;

it("draws each household's savings weight from a standard normal, fixed by its id", () => {
  const sigma = countedParameter("countedSavingsSpreadLog");
  const ids = Array.from(
    { length: N },
    (_, i) => `household_${i.toString(16)}`,
  );
  const weights = ids.map((id) => savingWeight(SEED, { id }));
  // The same seed and id give the same weight, and a kept weight is read back.
  expect(savingWeight(SEED, { id: ids[7]! })).toBe(weights[7]);
  const kept = { id: ids[8]!, saving: 0.5 };
  expect(savingWeight(SEED, kept)).toBe(0.5);
  // z back from the weight: (ln w + σ²/2) / σ.
  const zs = weights.map((w) => (Math.log(w) + (sigma * sigma) / 2) / sigma);
  const above = zs.filter((z) => z > 3).length;
  const below = zs.filter((z) => z < -3).length;
  expect(above).toBeGreaterThanOrEqual(6.2);
  expect(above).toBeLessThanOrEqual(47.8);
  expect(below).toBeGreaterThanOrEqual(6.2);
  expect(below).toBeLessThanOrEqual(47.8);
  const mean = weights.reduce((n, w) => n + w, 0) / N;
  expect(mean).toBeGreaterThanOrEqual(0.931);
  expect(mean).toBeLessThanOrEqual(1.069);
  process.stdout.write(
    `SAVING DRAW ${N} ids, seed ${SEED}: z above 3 ${above}, below −3 ${below} (27 each for a normal); mean weight ${mean.toFixed(4)}\n`,
  );
});
