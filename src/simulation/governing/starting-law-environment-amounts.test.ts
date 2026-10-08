import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026/index";

const ENVIRONMENT_AMOUNT_QUESTIONS = [
  "us-policy-positions:environment-energy.bottle-deposit",
  "us-policy-positions:environment-energy.clean-electricity-standard",
  "us-policy-positions:environment-energy.price-carbon",
  "us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties",
] as const;

describe("starting environmental law amounts", () => {
  it("records a sourced numeric term for every affirmative law row", () => {
    const questions = startingLaw.questions as unknown as Record<
      string,
      {
        answers: Record<
          string,
          {
            answer: string;
            estimated?: string;
            lawTerms?: Array<{
              questionKey: string;
              key: string;
              value: number;
              unit: string;
            }>;
            lawSchedules?: Array<{ questionKey: string; key: string }>;
          }
        >;
      }
    >;
    let affirmative = 0;

    for (const questionKey of ENVIRONMENT_AMOUNT_QUESTIONS) {
      for (const [place, row] of Object.entries(
        questions[questionKey]!.answers,
      )) {
        if (row.answer !== "yes") continue;
        affirmative += 1;
        const terms = row.lawTerms ?? [];
        expect(
          terms.length > 0 || (row.lawSchedules?.length ?? 0) > 0,
          `${questionKey} ${place}`,
        ).toBe(true);
        for (const term of terms) {
          expect(term.questionKey).toBe(questionKey);
          expect(Number.isFinite(term.value)).toBe(true);
          expect(term.key.length).toBeGreaterThan(0);
          expect(term.unit.length).toBeGreaterThan(0);
        }
      }
    }

    expect(affirmative).toBe(64);
    expect(
      questions[ENVIRONMENT_AMOUNT_QUESTIONS[1]]!.answers["US-AS"]!.estimated,
    ).toContain("Guam's reported 25% renewable target by 2035");
    expect(
      questions[ENVIRONMENT_AMOUNT_QUESTIONS[1]]!.answers["US-VI"]!.estimated,
    ).toContain("Guam's reported 25% renewable target by 2035");
  });
});
