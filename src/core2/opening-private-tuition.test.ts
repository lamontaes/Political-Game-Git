import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { parameter as p } from "./parameters";
import { generatedOpening } from "./tooling/generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-private-tuition");

describe(`private tuition in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("town families with school-age children pay the town's private schools", () => {
    const input = generatedOpening(place, {
      settings: { population: 1500 },
    });
    const schools = new Map(
      input.organizations
        .filter((row) => row.classification === "service:private-school")
        .map((row) => [row.id, row]),
    );
    const tuition = input.finance!.contracts.filter(
      (row) => row.kind === "household.customer.private-school",
    );
    if (!schools.size) {
      expect(tuition).toEqual([]);
      return;
    }
    expect(tuition.length).toBeGreaterThan(0);
    const homes = new Map(input.households.map((row) => [row.id, row]));
    const people = new Map(input.people.map((row) => [row.id, row]));
    const perChild =
      (p("openingPrivateTuitionAnnualUsd") * p("minorPerDollar")) /
      p("monthsPerYear");
    const cashPerHome = (id: string) =>
      homes
        .get(id)!
        .memberIds.reduce((sum, m) => sum + people.get(m)!.liquidMinor, 0);
    const enrolledByTown = new Map<
      string,
      { id: string; children: number }[]
    >();
    for (const row of tuition) {
      const school = schools.get(row.payeeId)!;
      const home = homes.get(row.householdId!)!;
      // Paid to a private school in the family's own town.
      expect(school.placeId).toBe(home.placeId);
      // The full tuition for a whole number of children.
      const children = row.amountMinor / perChild;
      expect(Math.abs(children - Math.round(children))).toBeLessThan(0.01);
      expect(Math.round(children)).toBeGreaterThan(0);
      enrolledByTown.set(home.placeId, [
        ...(enrolledByTown.get(home.placeId) ?? []),
        { id: home.id, children: Math.round(children) },
      ]);
    }
    // Who enrolls is a matter of means: within a town, no enrolled family has
    // less cash per child than a family with children who did not enroll.
    for (const [placeId, enrolled] of enrolledByTown) {
      const inSchool = new Set(enrolled.map((row) => row.id));
      const perChildCash = (id: string, kids: number) => cashPerHome(id) / kids;
      const least = Math.min(
        ...enrolled.map((row) => perChildCash(row.id, row.children)),
      );
      for (const home of input.households) {
        if (home.placeId !== placeId || inSchool.has(home.id)) continue;
        const ageOf = (m: string) =>
          ageOnDate(
            makeIsoDate(people.get(m)!.birthDate),
            makeIsoDate(input.startedAt),
          );
        const kids = home.memberIds.filter(
          (m) =>
            ageOf(m) >= p("openingSchoolAgeFirst") &&
            ageOf(m) <= p("openingSchoolAgeLast"),
        ).length;
        const payer = home.memberIds.some(
          (m) => ageOf(m) > p("openingSchoolAgeLast"),
        );
        if (!payer) continue;
        if (kids)
          expect(perChildCash(home.id, kids)).toBeLessThanOrEqual(least + 1);
      }
    }
  }, 300_000);
});
