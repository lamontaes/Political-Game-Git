import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { createScenarioWorld } from "./demo";
import { PORTABILITY_CONTEXT } from "./portability-fixture";
import { assertWorldIntegrity } from "./world";
import {
  formatPersonStressHarnessReport,
  runPersonStressHarness,
} from "./person-stress-harness";

describe("Person Multi-Seed Stress Harness", () => {
  it.each(["production", "stress"] as const)(
    "replays %s harness populations through the alternate jurisdiction constructor",
    (profile) => {
      const options = {
        seedCount: 20,
        seedPrefix: "synthetic-portability-stress",
        peoplePerSeed: 8,
        profile,
        currentDate: PORTABILITY_CONTEXT.initialMoment.date,
        jurisdictionId: PORTABILITY_CONTEXT.jurisdiction.id,
      };
      const result = runPersonStressHarness(options);
      expect(result).toStrictEqual(runPersonStressHarness(options));
      expect(result.uniqueAppearanceSeeds).toBe(160);
      for (const population of result.populations) {
        const world = createScenarioWorld(
          population.seed,
          PORTABILITY_CONTEXT,
          {
            peopleCount: options.peoplePerSeed,
            profile,
          },
        );
        expect(() => assertWorldIntegrity(world)).not.toThrow();
        expect(world.personOrder).toEqual(
          population.people.map((person) => person.id),
        );
        for (const summary of population.people) {
          expect(world.people[summary.id]).toMatchObject({
            givenName: summary.givenName,
            familyName: summary.familyName,
            birthDate: summary.birthDate,
            appearance: { seed: summary.appearanceSeed },
            homeJurisdictionId: options.jurisdictionId,
            generatorVersion: "person-v5",
            corpusVersion: "names-v1",
          });
        }
      }
    },
  );

  it("16. produces deterministic statistics and report across multiple seeds", () => {
    const run1 = runPersonStressHarness({
      seeds: ["harness-seed-1", "harness-seed-2", "harness-seed-3"],
      peoplePerSeed: 6,
      profile: "production",
      currentDate: makeIsoDate("2026-01-05"),
    });

    const run2 = runPersonStressHarness({
      seeds: ["harness-seed-1", "harness-seed-2", "harness-seed-3"],
      peoplePerSeed: 6,
      profile: "production",
      currentDate: makeIsoDate("2026-01-05"),
    });

    expect(run1).toStrictEqual(run2);
    expect(run1.totalSeeds).toBe(3);
    expect(run1.peoplePerSeed).toBe(6);
    expect(run1.totalPeople).toBe(18);
    expect(run1.uniqueFullNames).toBe(18);
    expect(run1.fullNameCollisions).toBe(0);
    expect(run1.uniqueAppearanceSeeds).toBe(18);
    expect(run1.ageStats.min).toBeGreaterThanOrEqual(21);
    expect(run1.ageStats.max).toBeLessThanOrEqual(75);

    const report = formatPersonStressHarnessReport(run1, true);
    expect(report).toContain("GENERATED PERSON STRESS HARNESS REPORT");
    expect(report).toContain("Generator Version:   person-v5");
    expect(report).toContain("Corpus Version:      names-v1");
    expect(report).toContain("Total People:        18");
  });

  it("handles stress profile with extreme age distributions and boundaries", () => {
    const result = runPersonStressHarness({
      seeds: ["stress-profile-1", "stress-profile-2"],
      peoplePerSeed: 6,
      profile: "stress",
      currentDate: makeIsoDate("2026-01-05"),
    });

    expect(result.profile).toBe("stress");
    expect(result.totalPeople).toBe(12);
    // Stress profile includes 18-year-olds and 88-year-olds
    expect(result.ageStats.min).toBe(18);
    expect(result.ageStats.max).toBe(88);
    // Leap birthdays and boundary birthdays are generated
    expect(result.leapBirthdaysCount).toBe(2);
    expect(result.boundaryBirthdaysCount).toBeGreaterThan(0);
  });

  it("handles custom seed count and large populations", () => {
    const result = runPersonStressHarness({
      seedCount: 20,
      peoplePerSeed: 10,
      profile: "production",
    });

    expect(result.totalSeeds).toBe(20);
    expect(result.peoplePerSeed).toBe(10);
    expect(result.totalPeople).toBe(200);
    expect(result.uniqueFullNames).toBeGreaterThan(190);
    expect(result.uniqueAppearanceSeeds).toBe(200);
  });
});
