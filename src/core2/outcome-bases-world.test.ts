/**
 * Each world's outcome levels (owner, Oct 27: "realistic not real... it goes
 * for every statistic unless it is in law"): every kept outcome in every one
 * of the 56 places opens on its own level, drawn from the world's seed around
 * the published one; a rate in law and an index that starts at 100 keep theirs.
 */
import { describe, expect, it } from "vitest";
import bases from "../../data/research/outcome-web/place-outcome-bases-2024.json" with { type: "json" };
import local from "./data/outcome-web/outcome-web.json" with { type: "json" };
import { KEPT_OUTCOMES, baseOf, publishedBaseOf } from "./outcome-web-model";
import { placeStateKeys } from "./places";

const LAW = new Set(local.worldBases.lawMeasures);
const kept = local.keptOutcomes as Record<string, { scale?: string }>;
const units = bases.measures as Record<string, { unit: string }>;
const fixed = (measure: string) =>
  LAW.has(measure) ||
  kept[measure]?.scale === "index" ||
  (units[measure]?.unit.startsWith("index") ?? false);

describe("each world's outcome levels", () => {
  const keys = placeStateKeys();
  it("opens every non-law outcome in all 56 places off the published level and off another world's", () => {
    expect(keys).toHaveLength(56);
    let checked = 0;
    for (const measure of KEPT_OUTCOMES)
      for (const key of keys) {
        const real = publishedBaseOf(measure, key).value;
        const a = baseOf(measure, key, "world-a").value;
        const b = baseOf(measure, key, "world-b").value;
        if (fixed(measure)) {
          expect(a, `${measure} ${key}`).toBe(real);
          continue;
        }
        checked += 1;
        if (real !== 0) {
          expect(a, `${measure} ${key}`).not.toBe(real);
          expect(a, `${measure} ${key}`).not.toBe(b);
        }
        // Within the spread of the published level.
        expect(Math.abs(a - real), `${measure} ${key}`).toBeLessThanOrEqual(
          Math.abs(real) * local.worldBases.spreadShare.value + 1e-9,
        );
      }
    expect(checked).toBeGreaterThan(56 * 40);
  });
  it("keeps a percent between 0 and 100 and draws the same level again from the same seed", () => {
    for (const measure of KEPT_OUTCOMES)
      for (const key of keys) {
        const a = baseOf(measure, key, "world-a").value;
        expect(a, `${measure} ${key}`).toBe(
          baseOf(measure, key, "world-a").value,
        );
        if (kept[measure]?.scale === "share")
          expect(a >= 0 && a <= 100, `${measure} ${key}`).toBe(true);
      }
  });
});
