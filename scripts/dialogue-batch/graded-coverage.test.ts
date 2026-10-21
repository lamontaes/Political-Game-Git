import { describe, expect, it } from "vitest";
import {
  gradedCoverage,
  gradedCoverageByBatch,
  sumGradedCoverage,
  type GradedBatch,
} from "./apply-grades";

const batch = (id: string, kind: string, grades: number): GradedBatch => ({
  batch: {
    id,
    items: Array.from({ length: grades }, (_, n) => ({ i: n + 1, kind })),
  } as never,
  grades: {
    batch: id,
    grades: Array.from({ length: grades }, (_, n) => ({
      i: n + 1,
      grade: "GOOD",
    })),
  },
});

describe("the coverage file's graded counts", () => {
  const all = [batch("batch-7", "journal", 3), batch("batch-9", "notices", 2)];

  it("add up, batch by batch, to what one pass over every batch counts", () => {
    expect(sumGradedCoverage(gradedCoverageByBatch(all))).toEqual(
      gradedCoverage(all),
    );
  });

  it("keep a batch's share after its files are deleted", () => {
    const kept = gradedCoverageByBatch(all);
    // The next run reads only batch-9 from disk; batch-7 comes from the file.
    const merged = { ...kept, ...gradedCoverageByBatch([all[1]!]) };
    expect(sumGradedCoverage(merged)).toEqual(gradedCoverage(all));
  });

  it("counts a batch again from its files when they are still on disk", () => {
    const stale = { "batch-9": { unknown: { notices: 99 } } };
    const merged = { ...stale, ...gradedCoverageByBatch([all[1]!]) };
    expect(sumGradedCoverage(merged)).toEqual(
      sumGradedCoverage(gradedCoverageByBatch([all[1]!])),
    );
  });
});
