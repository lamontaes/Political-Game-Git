import { describe, expect, it } from "vitest";
import * as records from "./effect-records";
import {
  LAW_QUESTION_MEASURES,
  OUTCOME_LINKS,
  outcomeLinksFedByQuestion,
} from "./outcome-web";
import { policyOutcomeLinks } from "./policy-semantics";

describe("A129 policy projections use the live outcome web", () => {
  it("preserves every law's exact link rows, including term-fed measures", () => {
    const questions = new Set([
      ...Object.keys(LAW_QUESTION_MEASURES),
      ...OUTCOME_LINKS.filter((link) => link.from.startsWith("law:")).map(
        (link) => link.from.slice(4),
      ),
    ]);
    expect(questions.size).toBeGreaterThan(0);
    for (const question of questions) {
      const projection = policyOutcomeLinks(question);
      expect(projection).toEqual(outcomeLinksFedByQuestion(question));
      for (const link of projection) {
        expect(OUTCOME_LINKS.find((row) => row.key === link.key)).toBe(link);
      }
    }
    expect(policyOutcomeLinks("unrecorded:question")).toEqual([]);
  });

  it("keeps persistence writers separate from the compatibility evaluator", () => {
    expect(records.recordCausalProcess).toBeTypeOf("function");
    expect(records.activateEffect).toBeTypeOf("function");
    expect(records).not.toHaveProperty("evaluateEffectContribution");
    expect(records).not.toHaveProperty("evaluateAggregateMetric");
    expect(records).not.toHaveProperty("recordEvaluatedMetricState");
  });
});
