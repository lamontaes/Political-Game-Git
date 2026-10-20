/**
 * A place other than the player's keeps a coarse population, and a person met
 * there is drawn from its counts. Places are drawn from all 56 with a seed
 * nobody chose; a failure names the place and the seed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { coarsePlace, metResident } from "./coarse-place";
import { townJobRate } from "./town-pay";

const seed = process.env.COARSE_PLACE_SEED || randomBytes(8).toString("hex");
const places = Array.from({ length: 6 }, (_, i) =>
  drawPlace(seed, `coarse-place-${i}`),
);
console.log(
  `coarse-place: seed ${seed}; ${places.map((p) => `${p.name} (${p.key})`).join(", ")}`,
);

describe("coarse place counts", () => {
  it("count workers by age and by job, and the two totals agree", () => {
    let counted = 0;
    for (const place of places) {
      const coarse = coarsePlace(place.key);
      const where = `${place.name} (${place.key}), seed ${seed}`;
      if (!coarse) continue;
      counted += 1;
      expect(coarse.workers, where).toBeGreaterThan(0);
      expect(coarse.workers, where).toBeLessThan(coarse.residents);
      const jobs = coarse.jobs.reduce((sum, row) => sum + row.count, 0);
      // Public and private jobs both come from the place's mix, so the jobs
      // add up to its workers (floating-point error only).
      expect(Math.abs(jobs - coarse.workers), where).toBeLessThan(
        coarse.workers * 1e-6 + 1e-6,
      );
    }
    expect(
      counted,
      `no drawn place had a Census population, seed ${seed}`,
    ).toBeGreaterThan(0);
  });

  it("fill in the same person every time, with an age and wage the counts show", () => {
    for (const place of places) {
      const coarse = coarsePlace(place.key);
      const where = `${place.name} (${place.key}), seed ${seed}`;
      if (!coarse) continue;
      for (let i = 0; i < 20; i++) {
        const met = metResident(coarse, seed, `day:${i}`);
        expect(met, where).toBeDefined();
        expect(metResident(coarse, seed, `day:${i}`), where).toEqual(met);
        const band = coarse.ages.find((row) => row.id === met!.ageRowId)!;
        expect(met!.age, where).toBeGreaterThanOrEqual(band.minAge);
        expect(met!.age, where).toBeLessThanOrEqual(
          Math.max(band.minAge, band.maxAge - 1),
        );
        expect(met!.age, where).toBeGreaterThanOrEqual(met!.job.minAge);
        const wage = townJobRate(
          met!.job.occupation,
          coarse.jurisdictionId,
          50,
        );
        expect(met!.job.hourlyMinor, where).toBe(wage?.hourlyMinor ?? null);
      }
    }
  });
});
