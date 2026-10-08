import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import type { EntityId } from "../types";
import { startingLawTermScope, type LawInForce } from "./law-in-force";

const questionKey = "us-policy-positions:labor-workforce.raise-minimum-wage";

function startingLaw(placeKey: string, operativeAt: string): LawInForce {
  return {
    answer: "yes",
    origin: "in-force-at-start",
    measureId: `starting-law:${placeKey}:${questionKey}` as EntityId,
    operativeAt: makeIsoDate(operativeAt),
    operativeBasis: "enacted-date",
    level: "state-statute",
  };
}

describe("starting-law term scope", () => {
  const onDate = makeIsoDate("2026-01-01");

  it("distinguishes regional and statewide starting terms", () => {
    expect(
      startingLawTermScope(
        startingLaw("US-OR", "2000-01-01"),
        questionKey,
        onDate,
      ),
    ).toBe("regional");
    expect(
      startingLawTermScope(
        startingLaw("US-CA", "2026-01-01"),
        questionKey,
        onDate,
      ),
    ).toBe("statewide");
  });

  it("leaves an unavailable starting row's scope unknown", () => {
    expect(
      startingLawTermScope(
        startingLaw("US-CA", "2025-12-31"),
        questionKey,
        onDate,
      ),
    ).toBe(null);
  });
});
