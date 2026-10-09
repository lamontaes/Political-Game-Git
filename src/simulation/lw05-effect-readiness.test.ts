import { describe, expect, it } from "vitest";
import readiness from "../../data/research/laws/lw05-effect-readiness.json";
import { TAX_TERM_QUESTION_ROWS } from "./policy-pack-tax-terms";

const LW05_RECORD_BOUND_QUESTIONS = [
  "us-tax-terms:state.corporate-tax-terms",
  "us-tax-terms:county.income-tax-terms",
] as const;

describe("LW-05 effect readiness", () => {
  it("admits the saved-record consumers while retaining their evidence limits", () => {
    expect(readiness.batch).toBe("LW-05");
    expect(readiness.status).toBe(
      "supported-saved-records-with-authority-refusals",
    );
    expect(readiness.runtimeActivation).toBe(true);
    expect(readiness.entries.map((entry) => entry.questionKey)).toEqual(
      LW05_RECORD_BOUND_QUESTIONS,
    );
    for (const entry of readiness.entries) {
      expect(entry.evidenceStatus).toBe("built-saved-records");
      expect(entry.source.trim()).not.toBe("");
      expect(entry.blockers.length).toBeGreaterThan(0);
      expect(entry.blockers.every((blocker) => blocker.trim().length > 0)).toBe(
        true,
      );
    }
  });

  it("retains the existing county sales and property tax consequence paths", () => {
    expect(readiness.supportedQuestionKeys).toEqual([
      "us-tax-terms:county.sales-tax-terms",
      "us-tax-terms:county.property-tax-terms",
      ...LW05_RECORD_BOUND_QUESTIONS,
    ]);
    for (const questionKey of readiness.supportedQuestionKeys) {
      const row = TAX_TERM_QUESTION_ROWS.find(
        (candidate) => `us-tax-terms:${candidate.key}` === questionKey,
      );
      expect(row?.consequences).toHaveLength(1);
      expect(row?.consequences?.[0]?.what).toBe("assess-enacted-tax-base");
    }
  });
});
