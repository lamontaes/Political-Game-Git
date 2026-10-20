import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { parameter as p } from "./parameters";
import shares from "../../data/research/people/nces-private-enrollment-share-fall-2021.json" with { type: "json" };
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
    const perChild =
      (shares.states[place.state as keyof typeof shares.states].share *
        p("openingPrivateTuitionAnnualUsd") *
        p("minorPerDollar")) /
      p("monthsPerYear");
    for (const row of tuition) {
      const school = schools.get(row.payeeId)!;
      const home = homes.get(row.householdId!)!;
      // Paid to a private school in the family's own town.
      expect(school.placeId).toBe(home.placeId);
      // A whole number of children's shares.
      const children = row.amountMinor / perChild;
      expect(Math.abs(children - Math.round(children))).toBeLessThan(0.01);
      expect(Math.round(children)).toBeGreaterThan(0);
    }
  }, 300_000);
});
