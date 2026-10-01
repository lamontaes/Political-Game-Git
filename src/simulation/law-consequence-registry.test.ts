import { loadedPolicyRegistry } from "./policy-pack-registry";
import { MINIMUM_WAGE_PAY_ROWS } from "./law-consequences/pay-rows";
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

it("admits the reviewed tax handler only with its declared selector and action", () => {
  const registry = createLawConsequenceRegistry();
  const handler = registry.handlers.get("tax");
  expect(handler?.owner).toBe("team-6");
  expect(registry.capabilities.selectorsByKind?.get("tax")).toEqual(
    new Set(["recorded-tax-base-payer"]),
  );
  expect(registry.capabilities.actions.get("tax")).toEqual(
    new Set(["assess-enacted-tax-base"]),
  );
  expect(registry.capabilities.selectorsByKind?.get("tax")?.has("work")).toBe(
    false,
  );
});

it("loads each wage law into the one admitted payroll handler without changing its terms", () => {
  const registry = createLawConsequenceRegistry();
  const handler = registry.handlers.get("pay");
  expect(handler?.owner).toBe("Team3");
  const catalog = loadedPolicyRegistry();
  for (const [questionKey, row] of Object.entries(MINIMUM_WAGE_PAY_ROWS)) {
    const question = catalog.propositions.find(
      (p) => p.stableKey === questionKey,
    );
    expect(question, questionKey).toBeDefined();
    expect(question!.consequences?.filter((r) => r.id === row.id)).toEqual([
      row,
    ]);
    expect(validateLawConsequences([row], registry.capabilities)).toEqual([]);
  }
  expect(registry.capabilities.actions.get("pay")).toEqual(
    new Set(["raise-hourly-floor"]),
  );
});
