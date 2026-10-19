/**
 * Per-place commuting shares from LODES (pool: world-commute-flow-data). A
 * place drawn from all 56 jurisdictions reads its own sourced shares or, where
 * the files do not cover it, the national average marked ESTIMATED; none is
 * unknown, and the national shares match the published magnitude.
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

  it("matches the national picture: most residents of a place work outside it", () => {
    let liveWork = 0,
      residentJobs = 0;
    for (const state of placeStateKeys())
      for (const locality of placeLocalities(state)) {
        const row = commutingSharesOf(locality.key);
        if (row.tag !== "SOURCED") continue;
        liveWork += row.residentJobs * row.liveWorkShare;
        residentJobs += row.residentJobs;
      }
    const share = liveWork / residentJobs;
    // ACS puts the share who work in their place of residence near a third.
    expect(share, "national live-and-work-in-place share").toBeGreaterThan(0.2);
    expect(share, "national live-and-work-in-place share").toBeLessThan(0.5);
  });
});
