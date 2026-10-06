import { describe, expect, it } from "vitest";

import startingLaw from "../data/research/laws/starting-law-2026.json" with { type: "json" };
import { createProductionPolicyCatalog } from "../src/simulation/production-catalog";

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

const catalog = createProductionPolicyCatalog();
// A catalog parameter means the proposition has operative terms. Those terms
// can be numeric amounts/schedules or a recorded category rule.
const termQuestionKeys = Object.values(catalog.propositions)
  .filter((proposition) => proposition.parameters?.length)
  .map((proposition) => proposition.stableKey)
  .filter((questionKey) => startingLawData.questions[questionKey]);
const policyAreas = [...new Set(termQuestionKeys.map(policyArea))].sort();

// Temporary gate tolerance only for the law areas currently being filled.
// This list is shrink-only: each area's data PR removes its own area. Never
// add an area here to hide new gaps; the final Session 19 PR empties the list.
const INITIAL_TOLERATED_AREAS = [
  "agriculture-natural-resources",
  "business-commerce",
  "civil-family-community",
  "education",
  "environment-energy",
  "fiscal",
  "government-operations",
  "housing-land-use",
  "justice-public-safety",
  "labor-workforce",
  "technology-privacy",
  "transportation-infrastructure",
] as const;
// Filling PRs remove their area below and record it as removed. Do not grow
// INITIAL_TOLERATED_AREAS or put a removed area back. Session 19 empties the
// active TOLERATED_AREAS list after all area PRs land.
const REMOVED_TOLERATED_AREAS = [] as const;
const TOLERATED_AREAS = [
  "agriculture-natural-resources",
  "business-commerce",
  "civil-family-community",
  "education",
  "environment-energy",
  "fiscal",
  "government-operations",
  "housing-land-use",
  "justice-public-safety",
  "labor-workforce",
  "technology-privacy",
  "transportation-infrastructure",
] as const;
const toleratedAreas = new Set<string>(TOLERATED_AREAS);

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

  it("keeps wholly unfilled catalog questions in the expected guard set", () => {
    const questionKey =
      "us-policy-positions:fiscal.exempt-groceries-from-sales-tax";
    expect(termQuestionKeys).toContain(questionKey);
    const question = startingLawData.questions[questionKey]!;
    const yesRows = Object.entries(question.answers).filter(
      ([, row]) => row.answer === "yes",
    );
    expect(yesRows).toHaveLength(43);
    expect(yesRows.every(([, row]) => !carriesTerms(row))).toBe(true);
  });

  it("limits temporary tolerances to the initial named in-progress areas", () => {
    expect(
      [...toleratedAreas].every((area) =>
        (INITIAL_TOLERATED_AREAS as readonly string[]).includes(area),
      ),
    ).toBe(true);
    expect(
      [...toleratedAreas].some((area) =>
        (REMOVED_TOLERATED_AREAS as readonly string[]).includes(area),
      ),
    ).toBe(false);
    expect(toleratedAreas.size).toBeLessThanOrEqual(
      INITIAL_TOLERATED_AREAS.length,
    );
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
      if (toleratedAreas.has(area)) {
        // Keep this area's assertion live and visible while its own PR is in
        // progress. Once filled, remove it from toleratedAreas so the strict
        // empty-gap assertion below applies to it.
        expect(
          missing.length,
          `${area} must leave the tolerance list when filled`,
        ).toBeGreaterThan(0);
        return;
      }
      expect(missing).toEqual([]);
    },
  );
});
