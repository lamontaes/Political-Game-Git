import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { DEFAULT_OPENING_INCOME_DATA as data } from "./opening-income";
import { parameter } from "./parameters";
import { daysBetween, makeIsoDate } from "./kernel/dates";
import { generatedOpening } from "./tooling/generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "opening-retirement-coverage");

describe(`the opening's retirees in ${place.name} (seed ${seed})`, () => {
  it("are covered for the recomputed share of their adult years, and name their claim", () => {
    const input = generatedOpening(place);
    const covered = input.people.flatMap((person) =>
      (person.pastFacts ?? [])
        .filter((fact) => fact.kind === data.generatedCoverageKind)
        .map((fact) => ({ person, fact })),
    );
    expect(covered.length, `${place.name}; seed ${seed}`).toBeGreaterThan(0);
    // Months covered over the months from the career's start to the claim:
    // the parameter's value, moved a little by each person's reliability.
    let months = 0,
      span = 0;
    for (const { fact } of covered) {
      months += Number(fact.facts!.coveredMonths);
      span +=
        (daysBetween(
          makeIsoDate(String(fact.facts!.startedAt)),
          makeIsoDate(fact.date),
        ) /
          parameter("daysPerMeanYear")) *
        parameter("monthsPerYear");
    }
    const fraction = parameter(data.parameters.coveredFraction);
    expect(fraction).toBeCloseTo(0.685, 3);
    const trait = parameter(data.parameters.coveredTraitPull);
    expect(Math.abs(months / span - fraction)).toBeLessThan(trait * 2);
    // One retiree's claim and award follow the coverage by record id.
    const { person, fact } = covered[0]!;
    const claim = person.pastFacts!.find(
      (row) => row.kind === data.generatedClaimKind,
    );
    expect(claim?.facts?.coverageFactId, `${person.id}: ${fact.id}`).toBe(
      fact.id,
    );
  }, 600_000);
});
