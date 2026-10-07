import { expect, it } from "vitest";
import {
  validateLawConsequences,
  type LawConsequenceCapabilities,
} from "./law-consequence-validation";
import type { LawConsequenceRow } from "./law-consequence-types";
const capabilities: LawConsequenceCapabilities = {
  kinds: new Set(["pay"]),
  selectors: new Set(["active-work-payflows"]),
  actions: new Map([["pay", new Set(["raise-hourly-floor"])]]),
  predicates: new Set(),
};
const row: LawConsequenceRow = {
  id: "mod-floor",
  kind: "pay",
  when: "payroll",
  who: { selector: "active-work-payflows", predicates: [] },
  what: "raise-hourly-floor",
  amount: { op: "term", key: "hourlyMinor", unit: "minor/hour" },
  conditions: [],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["legal-terms"],
    population: "covered workers",
    scope: "governing jurisdiction",
    why: "statutory floor",
    uncertainty: "exact legal term",
  },
};
it("admits a new law row using existing capabilities", () =>
  expect(validateLawConsequences([row], capabilities)).toEqual([]));
it("names precisely the unavailable selector and kind", () => {
  expect(
    validateLawConsequences(
      [
        {
          ...row,
          kind: "tax",
          who: { selector: "unregistered", predicates: [] },
        },
      ],
      capabilities,
    ),
  ).toContain(
    "Consequence mod-floor: missing selector capability 'unregistered'",
  );
  expect(
    validateLawConsequences([{ ...row, kind: "tax" }], capabilities),
  ).toContain("Consequence mod-floor: missing kind capability 'tax'");
});
it("validates onward rows through the same capability contract", () =>
  expect(
    validateLawConsequences(
      [{ ...row, onward: [{ ...row, id: "follow", what: "unsupported" }] }],
      capabilities,
    ),
  ).toContain(
    "Consequence follow: missing pay action capability 'unsupported'",
  ));
it("rejects duplicate identities and unsourced delayed consequences", () => {
  const errors = validateLawConsequences(
    [row, { ...row, lag: { days: 3, sourceIds: [] } }],
    capabilities,
  );
  expect(errors).toContain(
    "Consequence mod-floor: missing or duplicate row ID",
  );
  expect(errors).toContain(
    "Consequence mod-floor: lag requires source evidence",
  );
});
