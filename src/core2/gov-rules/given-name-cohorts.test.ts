import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { birthCohortGivenName as oldBirthCohortGivenName } from "../../simulation/given-name-cohorts";
import {
  birthCohortGivenName,
  COHORT_GIVEN_NAME_SHARE,
} from "./given-name-cohorts";

// The opening draws given names from here now. Until the old engine is
// retired, its copy must give every person the same name.
describe("given names by birth year", () => {
  const seed = randomBytes(8).toString("hex");

  it(`match the old engine for every person (seed ${seed})`, () => {
    let changed = 0;
    for (let index = 0; index < 600; index++) {
      const person = {
        givenName: "Placeholder",
        familyName: "Sample",
        birthDate: `${1925 + (index % 100)}-0${1 + (index % 9)}-15`,
        gender: (["male", "female", "nonbinary", undefined] as const)[
          index % 4
        ],
      };
      const key = `person:${seed}:${index}`;
      const next = birthCohortGivenName(seed, key, person as never);
      expect(next, key).toBe(
        oldBirthCohortGivenName(seed, key, person as never),
      );
      if (next !== person.givenName) changed++;
    }
    // Some take a cohort name and some keep the ordinary draw's name.
    expect(changed).toBeGreaterThan(0);
    expect(changed).toBeLessThan(600);
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

  it("is a share, not all or none", () => {
    expect(COHORT_GIVEN_NAME_SHARE).toBeGreaterThan(0);
    expect(COHORT_GIVEN_NAME_SHARE).toBeLessThan(1);
  });
});
