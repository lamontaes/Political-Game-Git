import { describe, expect, it } from "vitest";

import startingLaw from "../data/research/laws/starting-law-2026.json" with { type: "json" };
import { createProductionPolicyCatalog } from "../src/simulation/production-catalog";

type StartingLawAnswer = {
  answer?: string;
  before?: StartingLawAnswer;
  lawSchedules?: readonly unknown[];
  lawTerms?: readonly unknown[];
  phases?: readonly StartingLawAnswer[];
  regionalTerms?: readonly StartingLawAnswer[];
};

const startingLawData = startingLaw as unknown as {
  questions: Record<string, { answers: Record<string, StartingLawAnswer> }>;
};

function carriesTerms(row: StartingLawAnswer | undefined): boolean {
  if (!row) return false;
  if (
    [row.lawTerms, row.lawSchedules].some((terms) => terms && terms.length > 0)
  ) {
    return true;
  }
  return (
    carriesTerms(row.before) ||
    (row.phases?.some(carriesTerms) ?? false) ||
    (row.regionalTerms?.some(carriesTerms) ?? false)
  );
}

function policyArea(questionKey: string): string {
  return questionKey.split(":")[1]?.split(".")[0] ?? "unknown";
}

const catalog = createProductionPolicyCatalog();
const termQuestionKeys = Object.values(catalog.propositions)
  .filter((proposition) => proposition.parameters?.length)
  .map((proposition) => proposition.stableKey)
  .filter((questionKey) => startingLawData.questions[questionKey]);
const policyAreas = [...new Set(termQuestionKeys.map(policyArea))].sort();

describe("starting-law term completeness", () => {
  it("recognizes terms stored on direct, prior, phased, and regional rows", () => {
    expect([
      carriesTerms({ lawTerms: [{}] }),
      carriesTerms({ before: { lawSchedules: [{}] } }),
      carriesTerms({ phases: [{ lawTerms: [{}] }] }),
      carriesTerms({ regionalTerms: [{ lawTerms: [{}] }] }),
      carriesTerms({ lawTerms: [] }),
    ]).toEqual([true, true, true, true, false]);
  });

  it.each(policyAreas)(
    "%s: every yes answer on a term-declaring question carries terms",
    (area) => {
      const missing: { place: string; question: string }[] = [];
      for (const questionKey of termQuestionKeys) {
        if (policyArea(questionKey) !== area) continue;
        const question = startingLawData.questions[questionKey]!;
        for (const [place, row] of Object.entries(question.answers)) {
          if (row.answer === "yes" && !carriesTerms(row)) {
            missing.push({ place, question: questionKey });
          }
        }
      }
      expect(missing).toEqual([]);
    },
  );
});
