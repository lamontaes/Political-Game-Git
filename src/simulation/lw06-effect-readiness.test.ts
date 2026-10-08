import { describe, expect, it } from "vitest";
import readiness from "../../data/research/laws/lw06-effect-readiness.json";
import powers from "../../data/research/powers-catalog/catalog.json";
import { TAX_TERM_QUESTION_ROWS } from "./policy-pack-tax-terms";

const LW06_UNSUPPORTED_QUESTIONS = [
  "us-tax-terms:county.payroll-tax-terms",
  "us-tax-terms:county.corporate-tax-terms",
  "us-tax-terms:city.income-tax-terms",
] as const;

describe("LW-06 effect readiness", () => {
  it("admits saved-record consumers and preserves the unsupported county payroll rule", () => {
    expect(readiness.batch).toBe("LW-06");
    expect(readiness.status).toBe(
      "supported-saved-records-with-authority-refusals",
    );
    expect(readiness.runtimeActivation).toBe(true);
    expect(readiness.entries.map((entry) => entry.questionKey)).toEqual(
      LW06_UNSUPPORTED_QUESTIONS,
    );
    for (const entry of readiness.entries) {
      expect(entry.evidenceStatus).not.toBe("built");
      expect(entry.evidenceStatus === "built-saved-records").toBe(
        readiness.supportedQuestionKeys.includes(entry.questionKey),
      );
      expect(entry.source.trim()).not.toBe("");
      expect(entry.blockers.length).toBeGreaterThan(0);
      expect(entry.blockers.every((blocker) => blocker.trim().length > 0)).toBe(
        true,
      );
    }
  });

  it("records the county payroll authority rule that excludes its question", () => {
    const payroll = powers.dials.find((dial) => dial.id === "payroll-tax");
    expect(payroll?.levels.county.may).toBe("no");
    expect(
      TAX_TERM_QUESTION_ROWS.some(
        (candidate) => candidate.key === "county.payroll-tax-terms",
      ),
    ).toBe(false);
  });

  it("retains the city sales assessment path", () => {
    expect(readiness.supportedQuestionKeys).toEqual([
      "us-tax-terms:city.sales-tax-terms",
      "us-tax-terms:county.corporate-tax-terms",
      "us-tax-terms:city.income-tax-terms",
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
