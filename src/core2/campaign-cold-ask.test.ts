/**
 * A cold ask is answered by the stranger's own means and agreement (lift the
 * pins, family 30a): the chance of a gift slides up with both, is nothing
 * without either, and never reaches one, so what a place gives comes out of
 * its people and lean, not a fixed share of them.
 */
import { expect, it } from "vitest";
import { coldAskChance } from "./modules/campaigns";

it("the chance of a gift to a cold ask slides with agreement and means", () => {
  expect(coldAskChance(0, 2)).toBe(0);
  expect(coldAskChance(0.5, 0)).toBe(0);
  let last = 0;
  for (const agreement of [0.1, 0.3, 0.5, 0.7, 0.9]) {
    const chance = coldAskChance(agreement, 1.5);
    expect(chance, `agreement ${agreement}`).toBeGreaterThan(last);
    last = chance;
  }
  last = 0;
  for (const means of [0.2, 0.5, 1, 2, 4]) {
    const chance = coldAskChance(0.5, means);
    expect(chance, `means ${means}`).toBeGreaterThan(last);
    last = chance;
  }
  expect(coldAskChance(1, 100)).toBeLessThan(1);
});
