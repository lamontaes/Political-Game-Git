/**
 * Per-place commuting shares from LODES (pool: world-commute-flow-data). A
 * place drawn from all 56 jurisdictions reads its own sourced shares or, where
 * the files do not cover it, the national average marked ESTIMATED; none is
 * unknown, and a place keeps more of its workers at home where it holds
 * more jobs for them.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { placeLocalities, placeStateKeys } from "./places";
import { commutingSharesOf } from "./commuting-shares";

describe("commuting shares by place", () => {
  it("gives the drawn place sourced shares or a marked estimate, each inside 0 to 1", () => {
    for (let i = 0; i < 12; i++) {
      const seed = randomBytes(8).toString("hex");
      const place = drawPlace(seed, "commuting-shares");
      const where = `${place.name} [${place.key}], seed ${seed}`;
      const shares = commutingSharesOf(place.key);
      expect(shares.liveWorkShare, where).toBeGreaterThanOrEqual(0);
      expect(shares.liveWorkShare, where).toBeLessThanOrEqual(1);
      expect(shares.workInShare, where).toBeGreaterThanOrEqual(0);
      expect(shares.workInShare, where).toBeLessThanOrEqual(1);
      expect(shares.citation, where).toMatch(/LODES/);
      if (shares.tag === "SOURCED") {
        expect(shares.residentJobs, where).toBeGreaterThan(0);
        expect(shares.jobsHere, where).toBeGreaterThan(0);
      }
    }
  });

  it("covers every one of the 56 jurisdictions with sourced shares or the marked national average", () => {
    const uncovered: string[] = [];
    for (const state of placeStateKeys()) {
      let sourced = 0,
        total = 0;
      for (const locality of placeLocalities(state)) {
        total++;
        if (commutingSharesOf(locality.key).tag === "SOURCED") sourced++;
      }
      // A jurisdiction with no sourced place at all means the files missed it.
      if (total > 0 && !sourced) uncovered.push(state);
    }
    // Territories without LODES files (Puerto Rico publishes none) use the estimate; no state may.
    const territories = new Set(["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"]);
    expect(
      uncovered.filter((state) => !territories.has(state)),
      "jurisdictions with no sourced place",
    ).toEqual([]);
  });

  it("keeps more of a place's working residents at home where the place holds more jobs for them", () => {
    // Pins family 32 (#9747): no national band. The check is the relationship
    // the files carry: across every sourced place, the share of working
    // residents who work at home rises with the jobs the place holds per
    // working resident. A table whose shares were one copied figure, or
    // shuffled between places, has no such order and fails.
    const jobsPerWorker: number[] = [],
      staysHome: number[] = [];
    for (const state of placeStateKeys())
      for (const locality of placeLocalities(state)) {
        const row = commutingSharesOf(locality.key);
        if (row.tag !== "SOURCED") continue;
        jobsPerWorker.push(row.jobsHere / row.residentJobs);
        staysHome.push(row.liveWorkShare);
      }
    const order = rankCorrelation(jobsPerWorker, staysHome);
    console.log(
      `${staysHome.length} sourced places: rank correlation of jobs per working resident with the share who work at home ${order.toFixed(3)}`,
    );
    expect(
      order,
      "jobs per working resident and working at home",
    ).toBeGreaterThan(0);
  });
});

/** Spearman's rank correlation of two equal-length lists; tied values share their mean rank. */
function rankCorrelation(a: readonly number[], b: readonly number[]): number {
  const rank = (values: readonly number[]) => {
    const order = values
      .map((value, index) => [value, index] as const)
      .sort((x, y) => x[0] - y[0]);
    const ranks = new Array<number>(values.length);
    for (let start = 0; start < order.length;) {
      let end = start;
      while (end + 1 < order.length && order[end + 1]![0] === order[start]![0])
        end += 1;
      for (let at = start; at <= end; at += 1)
        ranks[order[at]![1]] = (start + end) / 2;
      start = end + 1;
    }
    return ranks;
  };
  const ra = rank(a),
    rb = rank(b),
    mid = (a.length - 1) / 2;
  let together = 0,
    spreadA = 0,
    spreadB = 0;
  for (let i = 0; i < a.length; i += 1) {
    together += (ra[i]! - mid) * (rb[i]! - mid);
    spreadA += (ra[i]! - mid) ** 2;
    spreadB += (rb[i]! - mid) ** 2;
  }
  return together / Math.sqrt(spreadA * spreadB);
}
