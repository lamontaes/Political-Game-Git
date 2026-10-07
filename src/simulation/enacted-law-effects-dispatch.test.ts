import { expect, it } from "vitest";
import { enactedTaxFixture } from "../../tests/fixtures/tax-policy-fixture";
import { applyLawConsequences } from "./enacted-law-effects";
import { createLawConsequenceRegistry } from "./law-consequence-registry";
import type { LawConsequenceRow } from "./law-consequence-types";
import { makeIsoDate } from "./dates";

const tax: LawConsequenceRow = {
  id: "dispatch:tax",
  kind: "tax",
  when: "assessment",
  who: { selector: "recorded-tax-base-payer", predicates: [] },
  what: "attribute-saved-statutory-tax",
  amount: { op: "record", key: "enacted-tax-assessment", unit: "minor" },
  conditions: [],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["dispatch-control"],
    population: "existing fixture payer",
    scope: "dispatcher boundary only",
    why: "Check admission without inventing a payment or exposure.",
    uncertainty: "Authored control, not a legal amount.",
  },
};

function fixture(rows: readonly LawConsequenceRow[]) {
  const { world } = enactedTaxFixture();
  const id = world.policyCatalog.propositionOrder[0]!;
  const proposition = world.policyCatalog.propositions[id]!;
  return {
    ...world,
    policyCatalog: {
      ...world.policyCatalog,
      propositionOrder: [id],
      propositions: {
        [id]: { ...proposition, consequences: rows },
      },
    },
  };
}

function context(world: ReturnType<typeof fixture>, activity = tax.when) {
  return {
    // The future date makes the real tax resolver quiet after admission.
    onDate: makeIsoDate("2099-01-01"),
    activity,
    activityId: world.id,
    subjectIds: [],
    questionKey:
      world.policyCatalog.propositions[
        world.policyCatalog.propositionOrder[0]!
      ]!.stableKey,
  };
}

it("keeps canonical tax capabilities with empty or partial caller registrations", () => {
  const world = fixture([tax]);
  const coverage = createLawConsequenceRegistry().handlers.get(
    "coverage-eligibility",
  )!;
  expect(applyLawConsequences(world, context(world), [])).toBe(world);
  expect(applyLawConsequences(world, context(world), [coverage])).toBe(world);
  expect(createLawConsequenceRegistry([]).handlers.size).toBe(0);
});

it("does not admit an unrelated activity until it is requested", () => {
  const world = fixture([{ ...tax, what: "unregistered-tax-action" }]);
  expect(applyLawConsequences(world, context(world, "renewal"), [])).toBe(
    world,
  );
  expect(() => applyLawConsequences(world, context(world), [])).toThrow(
    "missing tax action capability 'unregistered-tax-action'",
  );
});

it("refuses unknown kinds and selectors for the requested activity", () => {
  const unknownKind = fixture([
    { ...tax, kind: "unregistered-kind" as LawConsequenceRow["kind"] },
  ]);
  expect(() =>
    applyLawConsequences(unknownKind, context(unknownKind), []),
  ).toThrow("missing kind capability 'unregistered-kind'");
  const unknownSelector = fixture([
    { ...tax, who: { selector: "unregistered-payer", predicates: [] } },
  ]);
  expect(() =>
    applyLawConsequences(unknownSelector, context(unknownSelector), []),
  ).toThrow("missing selector capability 'unregistered-payer'");
});

it("refuses a conflicting optional owner instead of replacing canonical tax", () => {
  const world = fixture([tax]);
  const canonical = createLawConsequenceRegistry().handlers.get("tax")!;
  expect(() =>
    applyLawConsequences(world, context(world), [
      { ...canonical, owner: "conflicting-owner" },
    ]),
  ).toThrow("Duplicate law consequence kind owner: tax");
});
