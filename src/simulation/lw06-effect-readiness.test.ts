import { describe, expect, it } from "vitest";
import readiness from "../../data/research/laws/lw06-effect-readiness.json";
import { TAX_TERM_QUESTION_ROWS } from "./policy-pack-tax-terms";

const LW06_UNSUPPORTED_QUESTIONS = [
  "us-tax-terms:county.corporate-tax-terms",
  "us-tax-terms:city.income-tax-terms",
] as const;

describe("LW-06 effect readiness", () => {
  it("records unsupported outcomes with sources and concrete blockers", () => {
    expect(readiness.batch).toBe("LW-06");
    expect(readiness.status).toBe("unsupported-consequences-recorded");
    expect(readiness.runtimeActivation).toBe(false);
    expect(readiness.entries.map((entry) => entry.questionKey)).toEqual(
      LW06_UNSUPPORTED_QUESTIONS,
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

  it("retains county payroll and city sales assessment paths", () => {
    expect(readiness.supportedQuestionKeys).toEqual([
      "us-tax-terms:county.payroll-tax-terms",
      "us-tax-terms:city.sales-tax-terms",
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
