import { expect, it } from "vitest";
import { createLawConsequenceRegistry } from "./law-consequence-registry";
import { validateLawConsequences } from "./law-consequence-validation";
import type {
  LawConsequenceKindRegistration,
  LawConsequenceRow,
} from "./law-consequence-types";
const pay: LawConsequenceKindRegistration = {
  kind: "pay",
  owner: "Team2",
  selectors: ["work"],
  actions: ["floor"],
  predicates: [],
  units: ["minor/hour"],
  resolve: () => [],
  apply: (world) => world,
};
it("refuses two owners of the same kind", () =>
  expect(() => createLawConsequenceRegistry([pay, pay])).toThrow(
    "Duplicate law consequence kind owner: pay",
  ));
it("does not admit another kind's selector", () => {
  const registry = createLawConsequenceRegistry([
    pay,
    { ...pay, kind: "tax", selectors: ["taxpayer"] },
  ]);
  const row: LawConsequenceRow = {
    id: "test",
    kind: "pay",
    when: "payroll",
    who: { selector: "taxpayer", predicates: [] },
    what: "floor",
    amount: { op: "term", key: "floor", unit: "minor/hour" },
    conditions: [],
    lag: { days: 0, sourceIds: [] },
    onRepeal: "preserve-completed",
    evidence: {
      sourceIds: ["test"],
      population: "test",
      scope: "test",
      why: "test",
      uncertainty: "test",
    },
  };
  expect(validateLawConsequences([row], registry.capabilities)).toContain(
    "Consequence test: missing selector capability 'taxpayer'",
  );
});
it("keeps an empty capability set unavailable", () =>
  expect(createLawConsequenceRegistry([]).handlers.size).toBe(0));
