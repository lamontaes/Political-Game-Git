import { describe, expect, it } from "vitest";
import {
  fullRetirementAgeMonths,
  retirementClaimAgeMonths,
} from "./retirement-claim";

const weights = {
  anchorYearsBeforeFull: 1.5,
  traitPullYears: 1.5,
  needPullYears: 2,
  fullBufferMonths: 24,
};

describe("the retirement claim, a decision inside the law", () => {
  it("uses the full retirement age for the birth year", () => {
    expect(fullRetirementAgeMonths(1937)).toBe(65 * 12);
    expect(fullRetirementAgeMonths(1943)).toBe(66 * 12);
    expect(fullRetirementAgeMonths(1957)).toBe(66 * 12 + 6);
    expect(fullRetirementAgeMonths(1965)).toBe(67 * 12);
  });

  it("claims earlier with less saved and later with more patience", () => {
    const base = { birthYear: 1950, bufferMonths: 24 };
    const poor = retirementClaimAgeMonths(
      { ...base, bufferMonths: 0 },
      weights,
    );
    const middle = retirementClaimAgeMonths(base, weights);
    const patient = retirementClaimAgeMonths(
      { ...base, deliberation: 1, reliability: 1, risk: -1 },
      weights,
    );
    expect(poor).toBeLessThan(middle);
    expect(patient).toBeGreaterThan(middle);
    // The same person always decides the same way.
    expect(retirementClaimAgeMonths(base, weights)).toBe(middle);
  });

  it("never claims before 62 or waits past 70", () => {
    expect(
      retirementClaimAgeMonths(
        { birthYear: 1950, bufferMonths: 0, risk: 1 },
        { ...weights, needPullYears: 20 },
      ),
    ).toBe(62 * 12);
    expect(
      retirementClaimAgeMonths(
        { birthYear: 1950, bufferMonths: 99, deliberation: 1, reliability: 1 },
        { ...weights, traitPullYears: 20 },
      ),
    ).toBe(70 * 12);
  });

  it("follows the law in force when it's given: a later full age moves the claim", () => {
    const base = { birthYear: 1965, bufferMonths: 24 };
    const statute = {
      earliestMonths: 744,
      fullMonths: 804,
      delayedMaxMonths: 840,
    };
    expect(retirementClaimAgeMonths({ ...base, law: statute }, weights)).toBe(
      retirementClaimAgeMonths(base, weights),
    );
    const raised = { ...statute, fullMonths: 816, earliestMonths: 768 };
    expect(retirementClaimAgeMonths({ ...base, law: raised }, weights)).toBe(
      retirementClaimAgeMonths(base, weights) + 12,
    );
    expect(
      retirementClaimAgeMonths(
        { ...base, bufferMonths: 0, risk: 1, law: raised },
        { ...weights, needPullYears: 20 },
      ),
    ).toBe(768);
  });
});
