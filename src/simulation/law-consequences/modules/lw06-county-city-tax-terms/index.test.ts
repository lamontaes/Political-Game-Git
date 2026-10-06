import { expect, it } from "vitest";
import { createLawConsequenceRegistry } from "../../../law-consequence-registry";
import { validateLawConsequences } from "../../../law-consequence-validation";
import {
  LW06_TAX_TERM_CONSEQUENCE_ROWS,
  LW06_TAX_TERM_QUESTION_KEYS,
  registrations,
} from "./index";

it("defines the four LW06 tax-term rows against the existing tax kind", () => {
  expect(registrations).toEqual([]);
  const rows = Object.values(LW06_TAX_TERM_CONSEQUENCE_ROWS);
  expect(Object.keys(LW06_TAX_TERM_CONSEQUENCE_ROWS).sort()).toEqual(
    [...LW06_TAX_TERM_QUESTION_KEYS].sort(),
  );
  expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  expect(
    validateLawConsequences(rows, createLawConsequenceRegistry().capabilities),
  ).toEqual([]);
  for (const row of rows) {
    expect(row).toMatchObject({
      kind: "tax",
      when: "assessment",
      who: { selector: "recorded-tax-base-payer" },
      what: "assess-enacted-tax-base",
      amount: { op: "record", key: "enacted-tax-assessment", unit: "minor" },
      onRepeal: "preserve-completed",
    });
    expect(row).not.toHaveProperty("rate");
    expect(row).not.toHaveProperty("base");
    expect(row.evidence.uncertainty).toMatch(
      /Unsupported authority or terms remain unavailable/,
    );
  }
});
