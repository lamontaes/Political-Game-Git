import { describe, expect, it } from "vitest";

import startingLaw from "../data/research/laws/starting-law-2026.json" with { type: "json" };

type StartingLawAnswer = {
  answer?: string;
  before?: StartingLawAnswer;
  lawCategories?: readonly unknown[];
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
    [row.lawTerms, row.lawSchedules, row.lawCategories].some(
      (terms) => terms && terms.length > 0,
    )
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

// A question declares terms when any affirmative starting-law row carries
// them. From then on, every affirmative place row for that question is checked.
const termQuestionKeys = Object.entries(startingLawData.questions)
  .filter(([, question]) =>
    Object.values(question.answers).some(
      (row) => row.answer === "yes" && carriesTerms(row),
    ),
  )
  .map(([questionKey]) => questionKey);
const policyAreas = [...new Set(termQuestionKeys.map(policyArea))].sort();

describe("starting-law term completeness", () => {
  it("recognizes terms stored on direct, prior, phased, and regional rows", () => {
    expect([
      carriesTerms({ lawTerms: [{}] }),
      carriesTerms({ before: { lawSchedules: [{}] } }),
      carriesTerms({ phases: [{ lawCategories: [{}] }] }),
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
