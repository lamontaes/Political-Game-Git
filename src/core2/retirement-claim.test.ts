import { describe, expect, it } from "vitest";
import { retirementClaimAgeMonths } from "./retirement-claim";
import {
  socialSecurityAgesFrom,
  startingSocialSecurityAges,
} from "./social-security-law";

const weights = {
  anchorYearsBeforeFull: 1.5,
  traitPullYears: 1.5,
  needPullYears: 2,
  fullBufferMonths: 24,
};

describe("the retirement claim, a decision inside the law", () => {
  it("uses the full retirement age for the birth year", () => {
    const full = (birthDate: string) =>
      startingSocialSecurityAges(birthDate).fullMonths;
    expect(full("1937-06-01")).toBe(65 * 12);
    expect(full("1943-06-01")).toBe(66 * 12);
    expect(full("1957-06-01")).toBe(66 * 12 + 6);
    expect(full("1965-06-01")).toBe(67 * 12);
    // Born on January 1: treated as born the year before.
    expect(full("1960-01-01")).toBe(66 * 12 + 10);
    expect(full("1960-01-02")).toBe(67 * 12);
  });

  it("follows a changed law", () => {
    const base = { bufferMonths: 24 };
    const today = startingSocialSecurityAges("1965-06-01");
    // Congress raises the full retirement age to 68 and the earliest claim to 63.
    const raised = socialSecurityAgesFrom("1965-06-01", {
      earliestYears: 63,
      fullYears: 68,
      delayedYears: 71,
    });
    expect(raised.fullMonths).toBe(68 * 12);
    expect(retirementClaimAgeMonths({ ...base, ages: raised }, weights)).toBe(
      retirementClaimAgeMonths({ ...base, ages: today }, weights) + 12,
    );
  });

  it("claims earlier with less saved and later with more patience", () => {
    const base = {
      ages: startingSocialSecurityAges("1950-06-01"),
      bufferMonths: 24,
    };
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
        {
          ages: startingSocialSecurityAges("1950-06-01"),
          bufferMonths: 0,
          risk: 1,
        },
        { ...weights, needPullYears: 20 },
      ),
    ).toBe(62 * 12);
    expect(
      retirementClaimAgeMonths(
        {
          ages: startingSocialSecurityAges("1950-06-01"),
          bufferMonths: 99,
          deliberation: 1,
          reliability: 1,
        },
        { ...weights, traitPullYears: 20 },
      ),
    ).toBe(70 * 12);
  });
});
