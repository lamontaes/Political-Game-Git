import { describe, expect, it } from "vitest";
import { buildDeepPast, schoolOpenBy } from "./deep-past";
import { buildPopulation } from "./population";

// Audit 1 (Oct 12): a person's school must have existed when they started
// there. A school counts for a cohort only if the NCES directory lists it by
// that year; before 1986-87, only schools already listed then.
const seed = process.env.GOLDEN_PATH_SEED ?? "schools-by-era";
const input = buildDeepPast(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 800,
  }),
);
const schooling = input.people.flatMap((person) =>
  (person.pastFacts ?? []).filter(
    (fact) => fact.kind === "school:cohort-estimate",
  ),
);

describe(`schools by era in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("names only schools the directory lists by the cohort's year", () => {
    const real = schooling.filter(
      (fact) => fact.facts?.institutionSourceKey === "NCES-CCD",
    );
    expect(real.length).toBeGreaterThan(0);
    for (const fact of real)
      expect(
        schoolOpenBy(
          fact.facts!.institutionSourceId!,
          Number(fact.facts!.cohortYear),
        ),
      ).toBe(true);
  });

  it("checks the rule itself: later schools don't count for earlier years", () => {
    expect(schoolOpenBy("no-such-school", 1970)).toBe(false);
    expect(schoolOpenBy("no-such-school", 2030)).toBe(true);
  });
});
