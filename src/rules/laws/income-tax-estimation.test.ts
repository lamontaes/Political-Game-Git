import { describe, expect, it } from "vitest";
import {
  reciprocalRankedReferences as legacyRank,
  weightedReferenceMean as legacyMean,
} from "../../simulation/income-tax-withholding";
import { STATES } from "../../simulation/state-reference";
import {
  reciprocalRankedReferences,
  weightedReferenceMean,
} from "./income-tax-estimation";

describe("standalone similar-state tax estimate math", () => {
  it.each(Object.keys(STATES))(
    "matches legacy ranking and mean for US-%s",
    (usps) => {
      const rows = [
        { key: `${usps}:a`, closeness: 1, value: 10_000 },
        { key: `${usps}:b`, closeness: 1, value: 14_000 },
        { key: `${usps}:c`, closeness: 2, value: 18_000 },
        { key: `${usps}:d`, closeness: 4, value: 22_000 },
      ];
      const compare = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
        a.closeness - b.closeness;
      const stable = (row: (typeof rows)[number]) => row.key;
      const ranked = reciprocalRankedReferences(rows, compare, stable);
      const legacyRanked = legacyRank(rows, compare, stable);
      expect(ranked).toEqual(legacyRanked);
      expect(weightedReferenceMean(ranked, (row) => row.value)).toBe(
        legacyMean(legacyRanked, (row) => row.value),
      );
    },
  );
});
