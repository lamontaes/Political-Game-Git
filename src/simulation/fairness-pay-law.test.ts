import { describe, expect, it } from "vitest";
import { FAIRNESS_LOG_PAY_GAIN, uncoveredPayShareAt } from "./fairness-pay-law";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "./life-places";
import { stableHash } from "./ids";
import type { World } from "./types";

describe("research-bounded fairness wage ratios", () => {
  it("uses the reported log-wage coefficient and sampling interval in correct units", () => {
    const state = lifePlaceStateIdentities()[0]!;
    const id = stateJurisdictionForKey(state.jurisdictionKey)!.id;
    expect(uncoveredPayShareAt({} as World, id)).toBe(Math.exp(-0.027));
    expect(FAIRNESS_LOG_PAY_GAIN.low).toBeCloseTo(0.00348, 8);
    expect(FAIRNESS_LOG_PAY_GAIN.high).toBeCloseTo(0.05052, 8);
  });
  it("draws one bounded value across a state's towns, stable after serialization", () => {
    const seed = "team5-fairness-range-three-places";
    const states = [...lifePlaceStateIdentities()]
      .sort((a, b) =>
        stableHash(`${seed}:${a.jurisdictionKey}`).localeCompare(
          stableHash(`${seed}:${b.jurisdictionKey}`),
        ),
      )
      .slice(0, 3);
    const world = { seed } as World;
    const before = JSON.stringify(world);
    const shares: number[] = [];
    for (const state of states) {
      const id = stateJurisdictionForKey(state.jurisdictionKey)!.id;
      const towns = searchLifePlaces("", 5000, {
        stateJurisdictionKey: state.jurisdictionKey,
      }).filter((p) => p.scope === "locality");
      expect(towns.length).toBeGreaterThan(1);
      const share = uncoveredPayShareAt(world, id);
      expect(share).toBeGreaterThanOrEqual(
        Math.exp(-FAIRNESS_LOG_PAY_GAIN.high),
      );
      expect(share).toBeLessThanOrEqual(Math.exp(-FAIRNESS_LOG_PAY_GAIN.low));
      for (const town of towns.slice(0, 2))
        expect(uncoveredPayShareAt(world, town.context.jurisdiction.id)).toBe(
          share,
        );
      expect(uncoveredPayShareAt(JSON.parse(before) as World, id)).toBe(share);
      expect(
        uncoveredPayShareAt({ ...world, seed: `${seed}-other` }, id),
      ).not.toBe(share);
      shares.push(share);
      console.info("FAIRNESS-RANGE", seed, state.jurisdictionKey, share);
    }
    expect(new Set(shares).size).toBe(3);
    expect(JSON.stringify(world)).toBe(before);
  });
});
