import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { startingLawTerms, type LawInForce } from "./law-in-force";
import type { EntityId } from "../types";

const questionKey = "us-policy-positions:labor-workforce.paid-family-leave";
const law = (operativeAt: string): LawInForce => ({
  answer: "yes",
  origin: "in-force-at-start",
  measureId: `starting-law:US-NJ:${questionKey}` as EntityId,
  operativeAt: makeIsoDate(operativeAt),
  operativeBasis: "enacted-date",
  level: "state-statute",
});

describe("sourced annual family-leave terms", () => {
  it("keeps 2026 employee contributions distinct from total or disability premiums", () => {
    expect(
      startingLawTerms(
        law("2026-01-01"),
        questionKey,
        makeIsoDate("2026-01-01"),
      ),
    ).toEqual([
      { questionKey, key: "rate", value: 23, unit: "basis-points" },
      { questionKey, key: "cap", value: 171100, unit: "dollars/year" },
      { questionKey, key: "replacement", value: 0.85, unit: "ratio" },
    ]);
  });

  it("does not backdate annual terms to the categorical reader default", () => {
    expect(
      startingLawTerms(
        law("2000-01-01"),
        questionKey,
        makeIsoDate("2025-12-31"),
      ),
    ).toEqual([]);
  });

  it("does not extend calendar-2026 amounts into an unread year", () => {
    expect(
      startingLawTerms(
        law("2026-01-01"),
        questionKey,
        makeIsoDate("2026-12-31"),
      ),
    ).toHaveLength(3);
    expect(
      startingLawTerms(
        law("2027-01-01"),
        questionKey,
        makeIsoDate("2027-01-01"),
      ),
    ).toEqual([]);
  });
});
