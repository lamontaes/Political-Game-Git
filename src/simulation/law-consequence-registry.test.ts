import { expect, it } from "vitest";
import {
  createLawConsequenceRegistry,
  LAW_CONSEQUENCE_REGISTRATIONS,
} from "./law-consequence-registry";
import { PAY_REGISTRATION } from "./law-consequences/pay";
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
    new Set(["assess-enacted-tax-base", "attribute-saved-statutory-tax"]),
  );
  expect(registry.capabilities.selectorsByKind?.get("tax")?.has("work")).toBe(
    false,
  );
});

it("admits the existing rights handler without borrowing another kind capability", () => {
  const registry = createLawConsequenceRegistry();
  expect(registry.handlers.get("right-permission")?.owner).toBe("Team 8");
  expect(
    registry.capabilities.selectorsByKind?.get("right-permission"),
  ).toEqual(
    new Set(["recorded-person-permission", "recorded-organization-permission"]),
  );
  expect(registry.capabilities.actions.get("right-permission")).toEqual(
    new Set(["permit-on-yes", "prohibit-on-yes"]),
  );
  expect(
    registry.capabilities.selectorsByKind
      ?.get("right-permission")
      ?.has("recorded-tax-base-payer"),
  ).toBe(false);
});

it("registers the reviewed pay adapter once in the ordinary registry", () => {
  const registry = createLawConsequenceRegistry();
  expect(registry.handlers.get("pay")).toBe(PAY_REGISTRATION);
  expect(
    LAW_CONSEQUENCE_REGISTRATIONS.filter((entry) => entry.kind === "pay"),
  ).toEqual([PAY_REGISTRATION]);
  expect(registry.capabilities.selectorsByKind?.get("pay")).toEqual(
    new Set(PAY_REGISTRATION.selectors),
  );
  expect(registry.capabilities.actions.get("pay")).toEqual(
    new Set(PAY_REGISTRATION.actions),
  );
});
