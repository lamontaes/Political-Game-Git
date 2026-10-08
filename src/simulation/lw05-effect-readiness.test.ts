import { describe, expect, it } from "vitest";
import readiness from "../../data/research/laws/lw05-effect-readiness.json";
import { TAX_TERM_QUESTION_ROWS } from "./policy-pack-tax-terms";

const LW05_UNSUPPORTED_QUESTIONS = [
  "us-tax-terms:state.corporate-tax-terms",
  "us-tax-terms:county.income-tax-terms",
] as const;

describe("LW-05 effect readiness", () => {
  it("records unsupported outcomes with concrete blockers and keeps them inactive", () => {
    expect(readiness.batch).toBe("LW-05");
    expect(readiness.status).toBe("unsupported-consequences-recorded");
    expect(readiness.runtimeActivation).toBe(false);
    expect(readiness.entries.map((entry) => entry.questionKey)).toEqual(
      LW05_UNSUPPORTED_QUESTIONS,
    );
    for (const entry of readiness.entries) {
      expect(entry.evidenceStatus).not.toBe("built");
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
