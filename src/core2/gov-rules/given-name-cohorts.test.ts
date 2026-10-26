import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import TOP_SHARE from "../data/names/given-name-top-share.json" with { type: "json" };
import {
  birthCohortGivenName,
  cohortGivenNameShare,
} from "./given-name-cohorts";

// The opening draws given names from here. The share of people who take a
// cohort name is the published share of births the decade's top 100 names
// account for, by decade and sex (given-name-top-share.json).
describe("given names by birth year", () => {
  const seed = randomBytes(8).toString("hex");
  const shares = TOP_SHARE.share as unknown as Record<
    string,
    Record<"male" | "female", number>
  >;

  it(`the fraction taking a cohort name matches the published share for every decade and sex (seed ${seed})`, () => {
    const people = 2000;
    for (const [decade, row] of Object.entries(shares)) {
      for (const sex of ["male", "female"] as const) {
        // The middle year of the decade stands at that decade's own share.
        const year = Number.parseInt(decade, 10) + 5;
        let took = 0;
        for (let index = 0; index < people; index++) {
          const next = birthCohortGivenName(
            seed,
            `person:${decade}:${sex}:${index}`,
            {
              givenName: "Placeholder",
              familyName: "Sample",
              birthDate: `${year}-06-15`,
              gender: sex,
            },
          );
          if (next !== "Placeholder") took++;
        }
        // Five binomial standard deviations at 2,000 people is about 0.056.
        expect(
          Math.abs(took / people - row[sex]),
          `${decade} ${sex}`,
        ).toBeLessThan(0.06);
      }
    }
  });

  it("falls with the decade: the 1950s took more cohort names than the 2000s", () => {
    for (const sex of ["male", "female"] as const)
      expect(cohortGivenNameShare(sex, 1955)).toBeGreaterThan(
        cohortGivenNameShare(sex, 2005),
      );
  });

  it("keeps the given name when the world states no binary gender", () => {
    for (const gender of ["nonbinary", "unstated", undefined] as const)
      expect(
        birthCohortGivenName(seed, "person:x", {
          givenName: "Alex",
          familyName: "Sample",
          birthDate: "1990-06-01",
          gender,
        }),
      ).toBe("Alex");
  });
});
