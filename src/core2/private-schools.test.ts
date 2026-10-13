import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import type { EntityId } from "../simulation/types";
import { buildDeepPast } from "./deep-past";
import { profileFor } from "./opening-profile";
import { buildPopulation } from "./population";
import privateSchools from "./data/opening-private-schools.json" with { type: "json" };

// SG-P15-school-assignment, private schools: in three drawn towns, children
// whose households have the means attend a private school the NCES survey
// lists in their county, about as often as their state's children do.
const SHARES = privateSchools.shareByState as Record<string, number>;
const towns = [0, 1, 2].map((draw) => {
  const place = drawPlace(
    process.env.GOLDEN_PATH_SEED ?? "private-schools",
    `private-${draw}`,
  );
  const input = buildDeepPast(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: "2021-01-01",
      minimumPeople: 800,
    }),
  );
  return { place, input };
});

describe(`private schools in ${towns.map(({ place }) => `${place.name} (seed ${place.seed.slice(0, 12)})`).join(", ")}`, () => {
  it("sends about the state's share of children to a listed private school", () => {
    for (const { place, input } of towns) {
      const children = input.people.filter(
        (person) =>
          person.tier !== "husk" &&
          ageOnDate(
            makeIsoDate(person.birthDate),
            makeIsoDate(input.startedAt),
          ) < 18 &&
          (person.pastFacts ?? []).some(
            (fact) => fact.kind === "school:cohort-estimate",
          ),
      );
      if (!children.length) continue;
      const attending = children.filter((person) =>
        (person.pastFacts ?? []).some(
          (fact) => fact.facts?.institutionSourceKey === "NCES-PSS",
        ),
      );
      const share = SHARES[place.state.split("-").at(-1)!] ?? 0;
      expect(attending.length / children.length, place.name).toBeLessThan(
        share * 1.8 + 0.04,
      );
      // A county with no listed private school sends no one.
      const listed = children.some((person) => {
        const geoid = person.countyId
          ? lifePlaceByJurisdictionId(person.countyId as EntityId)?.sourceGeoid
          : undefined;
        return !!geoid && !!privateSchools.byCounty[geoid as never];
      });
      if (listed)
        expect(attending.length / children.length, place.name).toBeGreaterThan(
          share * 0.4 - 0.03,
        );
      else expect(attending.length).toBe(0);
      for (const person of attending)
        for (const fact of person.pastFacts ?? [])
          if (fact.facts?.institutionSourceKey === "NCES-PSS") {
            expect(fact.source.citation).toContain("Private School Universe");
            expect(fact.facts.schoolControl).toBe("private");
          }
    }
  });

  it("is chosen by households with more means", () => {
    let privateEarnings = 0;
    let privateCount = 0;
    let publicEarnings = 0;
    let publicCount = 0;
    for (const { input } of towns) {
      const wage = new Map(
        input.jobs.map((job) => [job.id, job.wageDailyMinor]),
      );
      const earnings = new Map<string, number>();
      for (const person of input.people)
        if (person.tier !== "husk" && person.jobId)
          earnings.set(
            person.householdId,
            (earnings.get(person.householdId) ?? 0) +
              (wage.get(person.jobId) ?? 0),
          );
      for (const person of input.people) {
        if (
          person.tier === "husk" ||
          ageOnDate(
            makeIsoDate(person.birthDate),
            makeIsoDate(input.startedAt),
          ) >= 18
        )
          continue;
        const facts = person.pastFacts ?? [];
        if (!facts.some((fact) => fact.kind === "school:cohort-estimate"))
          continue;
        const home = earnings.get(person.householdId) ?? 0;
        if (
          facts.some((fact) => fact.facts?.institutionSourceKey === "NCES-PSS")
        ) {
          privateEarnings += home;
          privateCount += 1;
        } else {
          publicEarnings += home;
          publicCount += 1;
        }
      }
    }
    expect(privateCount).toBeGreaterThan(0);
    expect(privateEarnings / privateCount).toBeGreaterThan(
      publicEarnings / publicCount,
    );
  });

  it("sends a Catholic family's child to a Catholic school more often than other families'", () => {
    let catholic = 0;
    let catholicAtCatholic = 0;
    let other = 0;
    let otherAtCatholic = 0;
    for (const { input } of towns) {
      const eldest = new Map<string, string>();
      for (const person of [...input.people].sort(
        (a, b) =>
          a.birthDate.localeCompare(b.birthDate) || a.id.localeCompare(b.id),
      )) {
        if (eldest.has(person.householdId)) continue;
        const faith = profileFor(person, input.seed, input.startedAt)?.faith;
        if (faith) eldest.set(person.householdId, faith);
      }
      for (const person of input.people)
        for (const fact of person.pastFacts ?? []) {
          if (fact.facts?.institutionSourceKey !== "NCES-PSS") continue;
          const atCatholic = fact.facts.schoolAffiliation === "catholic";
          if (eldest.get(person.householdId) === "catholic") {
            catholic += 1;
            if (atCatholic) catholicAtCatholic += 1;
          } else {
            other += 1;
            if (atCatholic) otherAtCatholic += 1;
          }
        }
    }
    if (catholic && other)
      expect(catholicAtCatholic / catholic).toBeGreaterThan(
        otherAtCatholic / other,
      );
  });
});
