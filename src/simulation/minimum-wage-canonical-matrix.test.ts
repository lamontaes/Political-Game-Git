import { expect, it } from "vitest";
import matrix from "../../data/research/money/minimum-wage-dated-matrix-2026.json" with { type: "json" };
import { createScenarioWorld } from "./demo";
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import { requireLifePlace, stateJurisdictionForKey } from "./life-places";
import {
  ensureJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { createProductionPolicyCatalog } from "./production-catalog";
import { createPolicyCatalog } from "./policy";
import { lawInForce } from "./governing/law-in-force";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import {
  minimumHourlyMinorAt,
  startingStateMinimumHourly,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
} from "./minimum-wage";

const place = requireLifePlace("3137000");
const base = createScenarioWorld("canonical-wage-matrix", place.context, {
  peopleCount: 6,
});
const production = createProductionPolicyCatalog();
const catalog = createPolicyCatalog({
  catalogVersion: "fixture:canonical-wage-matrix",
  domains: Object.values({
    ...base.policyCatalog.domains,
    ...production.domains,
  }),
  issues: Object.values({ ...base.policyCatalog.issues, ...production.issues }),
  propositions: Object.values({
    ...base.policyCatalog.propositions,
    ...production.propositions,
  }),
  subjects: Object.values({
    ...base.policyCatalog.subjects,
    ...production.subjects,
  }),
  principles: Object.values({
    ...base.policyCatalog.principles,
    ...production.principles,
  }),
});
let fixture = ensureJurisdiction(
  { ...base, policyCatalog: catalog },
  NATIONAL_ELECTION_JURISDICTION,
);
for (const key of Object.keys(matrix.places))
  fixture = ensureJurisdiction(fixture, stateJurisdictionForKey(key)!);
function onDate(date: string) {
  const currentDate = makeIsoDate(date);
  return {
    ...fixture,
    currentDate,
    currentMoment: simulationMomentOnLocalDate(
      fixture.currentMoment,
      currentDate,
    ),
  };
}
const question = Object.values(catalog.propositions).find(
  (p) => p.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
)!;

it("uses the same canonical law and final-term query for all 56 matrix places, preserving unbound scope", () => {
  let standard = 0,
    unsupported = 0;
  for (const key of Object.keys(matrix.places)) {
    const world = onDate("2026-01-05");
    const law = lawInForce(
      world,
      stateJurisdictionForKey(key)!.id,
      question.id,
      world.currentDate,
    );
    expect(law, key).not.toBeNull();
    const term = readFinalEnactedLawTerm(world, law!, {
      questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
      termKey: "target",
      unit: "minor/hour",
    });
    if (term) {
      const researched = matrix.places[key as keyof typeof matrix.places].rows;
      expect(
        researched.some(
          (r) => r.value === term.value && r.operativeAt === law!.operativeAt,
        ),
        key,
      ).toBe(true);
      expect(term.measureId, key).toBe(
        `starting-law:${key}:${STATE_MINIMUM_WAGE_QUESTION_KEY}`,
      );
      expect(term.provisionId, key).toBeNull();
      standard++;
    } else unsupported++;
  }
  expect(standard).toBe(47);
  expect(unsupported).toBe(9); // Seven federal-only places, NY/OR region scopes.
});

it.each([
  ["US-DC", "2026-06-30", 1795],
  ["US-DC", "2026-07-01", 1840],
  ["US-FL", "2025-09-29", null],
  ["US-FL", "2025-09-30", 1400],
  ["US-FL", "2026-09-29", 1400],
  ["US-FL", "2026-09-30", 1500],
  ["US-AK", "2026-06-30", 1300],
  ["US-AK", "2026-07-01", 1400],
  ["US-CT", "2026-01-05", 1694],
  ["US-CT", "2027-01-01", 1748],
] as const)(
  "does not backdate %s's numeric phase on %s",
  (key, date, expected) => {
    const world = onDate(date);
    expect(startingStateMinimumHourly(key, world, world.currentDate)).toBe(
      expected === null ? null : expected / 100,
    );
    expect(
      minimumHourlyMinorAt(
        world,
        stateJurisdictionForKey(key)!.id,
        world.currentDate,
      ),
    ).toBe(expected);
  },
);

it("keeps the federal floor on the federal proposition and does not fabricate Mississippi's state statute", () => {
  const world = onDate("2026-01-05");
  const federal = Object.values(catalog.propositions).find(
    (p) => p.stableKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    federal.id,
    world.currentDate,
  )!;
  expect(law.answer).toBe("no");
  expect(
    readFinalEnactedLawTerm(world, law, {
      questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
      termKey: "floor",
      unit: "minor/hour",
    }),
  ).toMatchObject({
    value: 725,
    measureId: `starting-law:US:${FEDERAL_MINIMUM_WAGE_QUESTION_KEY}`,
    provisionId: null,
  });
  expect(
    startingStateMinimumHourly("US-MS", world, world.currentDate),
  ).toBeNull();
  const state = lawInForce(
    world,
    stateJurisdictionForKey("US-MS")!.id,
    question.id,
    world.currentDate,
  )!;
  expect(
    readFinalEnactedLawTerm(world, state, {
      questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
      termKey: "target",
      unit: "minor/hour",
    }),
  ).toBeNull();
});

it("refuses an undated standalone legacy table lookup and unresolved regional rates", () => {
  expect(startingStateMinimumHourly("US-DC")).toBeNull();
  const world = onDate("2026-01-05");
  expect(startingStateMinimumHourly("US-NY", world)).toBeNull();
  expect(startingStateMinimumHourly("US-OR", world)).toBeNull();
  expect(startingStateMinimumHourly("US-AS", world)).toBeNull();
});
