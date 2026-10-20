import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { parameter as p } from "./parameters";
import { faithAffinity, rankByChoice } from "./private-tuition-choice";
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
    // Who enrolls is a matter of means and beliefs: within a town, a family's
    // cash per child as a rank in town times its faith's draw (the owner's
    // Oct 20 ruling) puts every enrolled family at or above every family with
    // children that did not enroll.
    for (const [placeId, enrolled] of enrolledByTown) {
      const inSchool = new Set(enrolled.map((row) => row.id));
      const ageOf = (m: string) =>
        ageOnDate(
          makeIsoDate(people.get(m)!.birthDate),
          makeIsoDate(input.startedAt),
        );
      const families = input.households
        .filter((home) => home.placeId === placeId)
        .flatMap((home) => {
          const kids = home.memberIds.filter(
            (m) =>
              ageOf(m) >= p("openingSchoolAgeFirst") &&
              ageOf(m) <= p("openingSchoolAgeLast"),
          ).length;
          const adults = home.memberIds.filter(
            (m) => ageOf(m) > p("openingSchoolAgeLast"),
          );
          return kids && adults.length
            ? [
                {
                  id: home.id,
                  cash: cashPerHome(home.id) / kids,
                  affinity: faithAffinity(adults.map((m) => people.get(m)!)),
                },
              ]
            : [];
        });
      const rank = (cash: number) =>
        (families.filter((f) => f.cash < cash).length +
          families.filter((f) => f.cash === cash).length / 2) /
        families.length;
      const scored = families.map((f) => ({
        ...f,
        score: rank(f.cash) * f.affinity,
      }));
      const least = Math.min(
        ...scored.filter((f) => inSchool.has(f.id)).map((f) => f.score),
      );
      for (const f of scored)
        if (!inSchool.has(f.id))
          expect(f.score, `${f.id} in ${placeId}`).toBeLessThanOrEqual(
            least + 1e-9,
          );
    }
  }, 300_000);

  it("ranks a family by money and faith together, with no jump at any one value", () => {
    const poorCatholic = {
      id: "a",
      cashPerChild: 100,
      affinity: p("privateTuitionAffinityCatholic"),
    };
    const richNone = {
      id: "b",
      cashPerChild: 900,
      affinity: p("privateTuitionAffinityNone"),
    };
    const middleNone = {
      id: "c",
      cashPerChild: 500,
      affinity: p("privateTuitionAffinityNone"),
    };
    const families = [poorCatholic, richNone, middleNone];
    const order = rankByChoice(families, (f) => f.affinity).map((f) => f.id);
    // Ranks 1/6, 3/6 and 5/6 of the town by cash: the Catholic family's draw
    // (x2.5) puts its poor rank ahead of the richer families with no faith tie
    // (x0.48): 0.42 against 0.40 and 0.24.
    expect(order).toEqual(["a", "b", "c"]);
    // The same money in a family of equal faith still orders by money.
    const same = rankByChoice([middleNone, richNone], (f) => f.affinity).map(
      (f) => f.id,
    );
    expect(same).toEqual(["b", "c"]);
    // A tiny change in cash never reorders families by more than one place.
    const nudged = rankByChoice(
      [{ ...middleNone, cashPerChild: 501 }, richNone],
      (f) => f.affinity,
    ).map((f) => f.id);
    expect(nudged).toEqual(["b", "c"]);
  });
});
