import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { PARAMETERS } from "./parameters";
import {
  AGE_BANDS,
  parameterRows,
} from "../../scripts/credit/derive-student-loan-seed";

/**
 * The student-loan seed is derived, never typed
 * (scripts/credit/derive-student-loan-seed.ts): the share of families with
 * education debt, their balances, and each age band's share of all balances.
 * The rows in the parameter table must equal what the sourced table gives, and
 * the age shares must add to one.
 */
it("the student-loan rows equal what the sourced table gives, and the age shares add to one", () => {
  const rows = parameterRows(
    JSON.parse(
      readFileSync("data/research/credit/student-loan-debt-2026.json", "utf8"),
    ),
  ) as Record<string, { value: number }>;
  for (const [key, row] of Object.entries(rows))
    expect(PARAMETERS[key]?.value, `${key} in the parameter table`).toBe(
      row.value,
    );
  const shares = Object.values(AGE_BANDS).map(
    (suffix) => rows[`studentLoanBalanceShare${suffix}`]!.value,
  );
  expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 3);
  expect(rows.studentLoanHolderShare!.value).toBeGreaterThan(0.1);
  expect(rows.studentLoanHolderShare!.value).toBeLessThan(0.4);
});
