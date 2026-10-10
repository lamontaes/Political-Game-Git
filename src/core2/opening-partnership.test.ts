import { describe, expect, it } from "vitest";
import {
  drawAdultAge,
  OPENING_PARTNERSHIP,
  partneredByAge,
  partnershipGeo,
} from "./opening-partnership";

describe("opening partnership chain", () => {
  const nation = partnershipGeo(null);

  it("falls back from place to state to nation", () => {
    expect(nation.key).toBe(OPENING_PARTNERSHIP.nationalKey);
    const state = Object.keys(OPENING_PARTNERSHIP.geos).find(
      (key) => key.length === 2,
    )!;
    // A place too small for the 1-year survey reads its state.
    expect(partnershipGeo(`${state}99999`).key).toBe(state);
    // A territory outside the survey reads the nation.
    expect(partnershipGeo("6600000").key).toBe(OPENING_PARTNERSHIP.nationalKey);
  });

  it("rises with first marriages and falls with widowhood, faster for women", () => {
    const women = partneredByAge(nation.key, nation.rows, "female");
    const men = partneredByAge(nation.key, nation.rows, "male");
    expect(women[20]!).toBeLessThan(women[40]!);
    expect(men[20]!).toBeLessThan(men[50]!);
    expect(women[85]!).toBeLessThan(women[60]!);
    expect(women[85]!).toBeLessThan(men[85]!);
    for (const value of [...women, ...men]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("draws the same age for the same person and keeps it inside the role's bounds", () => {
    const input = {
      seed: "p15-partnership",
      key: "household:1:person:0",
      geo: nation,
      sex: "female" as const,
      arrangement: "alone" as const,
      minimum: 20,
      maximumExclusive: 90,
    };
    const age = drawAdultAge(input);
    expect(drawAdultAge(input)).toBe(age);
    expect(age).toBeGreaterThanOrEqual(20);
    expect(age).toBeLessThan(90);
    const alone = Array.from({ length: 400 }, (_, i) =>
      drawAdultAge({ ...input, key: `person:${i}` }),
    );
    const couple = Array.from({ length: 400 }, (_, i) =>
      drawAdultAge({ ...input, key: `person:${i}`, arrangement: "partnered" }),
    );
    const share = (ages: number[]) =>
      ages.filter((value) => value >= 75).length / ages.length;
    // Women 75 and over are far more often widowed and alone than in a couple.
    expect(share(alone)).toBeGreaterThan(share(couple));
  });
});
