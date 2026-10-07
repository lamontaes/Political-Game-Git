import { describe, expect, it } from "vitest";
import readiness from "../../data/research/laws/lw10-effect-readiness.json";
import termsBatch from "../../data/research/laws/catalog-terms-batch-04.json";
import {
  FEDERAL_MANDATORY_MINIMUM_ROW,
} from "./law-consequences/modules/federal-justice-rights";
import { US_FEDERAL_POSITIONS_PACK } from "./policy-pack-us-federal-positions";

const MANDATORY_MINIMUM =
  "us-federal-positions:justice-rights.reduce-mandatory-minimums";
const STOCK_TRADING =
  "us-federal-positions:government.ban-congressional-stock-trading";

describe("LW-10 effect readiness", () => {
  it("preserves the canonical federal sentencing consequence path", () => {
    expect(readiness.batch).toBe("LW-10");
    expect(readiness.consequencePathsOnMain).toEqual([MANDATORY_MINIMUM]);
    const question = US_FEDERAL_POSITIONS_PACK.propositions?.find(
      (row) => `us-federal-positions:${row.key}` === MANDATORY_MINIMUM,
    );
    expect(question?.consequences).toContainEqual(
      FEDERAL_MANDATORY_MINIMUM_ROW,
    );
  });

  it("keeps mandatory-minimum terms blocked until sourced bounds exist", () => {
    expect(readiness.pendingTermQuestionKeys).toEqual([MANDATORY_MINIMUM]);
    const law = termsBatch.laws.find(
      (entry) => entry.questionKey === MANDATORY_MINIMUM,
    );
    expect(law?.parameters.map((parameter) => parameter.selectableRange.status)).toEqual([
      "needs-research",
      "needs-research",
    ]);
    expect(law?.currentLawSource.status).toBe(
      "missing-starting-row-research-required",
    );
  });

  it("records the unsized congressional stock-ban path as unsupported", () => {
    expect(readiness.status).toBe(
      "partial-with-unsupported-outcome-recorded",
    );
    expect(readiness.runtimeActivation).toBe(false);
    const question = US_FEDERAL_POSITIONS_PACK.propositions?.find(
      (row) => `us-federal-positions:${row.key}` === STOCK_TRADING,
    );
    expect(question?.consequences).toBeUndefined();
    const law = termsBatch.laws.find(
      (entry) => entry.questionKey === STOCK_TRADING,
    );
    expect(
      law?.parameters.find((parameter) => parameter.key === "coverage")
        ?.selectableRange.status,
    ).toBe("needs-research");
    const entry = readiness.entries.find(
      (candidate) => candidate.questionKey === STOCK_TRADING,
    );
    expect(entry?.source.trim()).not.toBe("");
    expect(entry?.blockers.length).toBeGreaterThan(0);
    expect(entry?.blockers.every((blocker) => blocker.trim().length > 0)).toBe(
      true,
    );
  });
});
