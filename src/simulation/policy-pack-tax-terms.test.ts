import { expect, it } from "vitest";
import { loadPolicyPacks } from "./policy-packs";
import { POLICY_PACKS } from "./policy-pack-registry";
import {
  TAX_TERMS_POLICY_PACK,
  TAX_TERM_QUESTION_ROWS,
} from "./policy-pack-tax-terms";
import { TAX_LAW_TERM_KEYS, TAX_NUMERIC_LAW_TERMS } from "./tax-law-term-keys";

it("loads tax questions without assigning any rates or replacing existing questions", () => {
  const original = loadPolicyPacks(POLICY_PACKS);
  const next = loadPolicyPacks([...POLICY_PACKS, TAX_TERMS_POLICY_PACK]);
  expect(next.report.rejections).toEqual([]);
  for (const row of original.propositions) {
    expect(next.propositions.find((entry) => entry.id === row.id)).toEqual(row);
  }
  expect(TAX_TERM_QUESTION_ROWS.length).toBeGreaterThan(0);
  for (const row of TAX_TERM_QUESTION_ROWS) {
    expect(row.parameters?.map((term) => term.key)).toEqual(
      Object.values(TAX_LAW_TERM_KEYS),
    );
    expect(row.consequences).toBeUndefined();
    expect(row.principles).toBeUndefined();
  }
});

it("keeps exact rational rates separate from occurrence allowances and timing", () => {
  expect(TAX_NUMERIC_LAW_TERMS.map(({ field, unit }) => [field, unit])).toEqual(
    [
      ["rateNumerator", "count"],
      ["rateDenominator", "count"],
      ["allowanceMinorUnits", "minor"],
      ["effectiveDelayDays", "days"],
      ["collectionLagDays", "days"],
    ],
  );
  expect(
    TAX_TERM_QUESTION_ROWS.some(
      (row) => row.key === "federal.property-tax-terms",
    ),
  ).toBe(false);
});
