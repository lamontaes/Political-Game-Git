/**
 * Derives the student-loan seed from the sourced table
 * (data/research/credit/student-loan-debt-2026.json) and writes it as
 * parameter rows, for the student-loan debt kind (pool item
 * laws-federal-student-loan-debt-kind) to read when it is built: how many
 * households hold the debt, how large it is, and how it spreads over the ages
 * of those who hold it.
 *
 *   studentLoanHolderShare       share of families with education debt (Fed
 *                                Survey of Consumer Finances 2022)
 *   studentLoanMedianBalanceUsd  their median balance (2022 dollars)
 *   studentLoanMeanBalanceUsd    their mean balance (2022 dollars)
 *   studentLoanBalanceShare<age> each age band's share of all balances (New
 *                                York Fed, 2026Q2), summing to one
 *
 * The engine seeds holders by these, so the opening world's balances add to
 * about the national total over the households it has; the share by age sets
 * who among the households holds how much. Borrower counts, repayment status
 * and payments are not in the source and stay with the engine as estimates.
 *
 *   node --import tsx scripts/credit/derive-student-loan-seed.ts
 * rewrites the studentLoan* rows at the end of src/core2/data/parameters.json;
 * src/core2/student-loan-seed.test.ts checks they equal what this gives.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "data/research/credit/student-loan-debt-2026.json";
const PARAMETERS = "src/core2/data/parameters.json";

interface Source {
  balanceByAgeTrillionUsd: Record<string, number | string>;
  familiesWithStudentDebt: {
    sharePct: number;
    medianBalanceUsd: number;
    meanBalanceUsd: number;
  };
}

/** The age bands the New York Fed publishes, as parameter-name suffixes. */
export const AGE_BANDS = {
  "18-29": "18to29",
  "30-39": "30to39",
  "40-49": "40to49",
  "50-59": "50to59",
  "60-69": "60to69",
  "70+": "70plus",
} as const;

/** Each band's share of the balances in the age rows, rounded to four places. */
export function balanceShares(source: Source): Record<string, number> {
  const rows = Object.entries(AGE_BANDS).map(([band, suffix]) => [
    suffix,
    Number(source.balanceByAgeTrillionUsd[band]),
  ]) as [string, number][];
  const total = rows.reduce((n, [, trillion]) => n + trillion, 0);
  return Object.fromEntries(
    rows.map(([suffix, trillion]) => [
      suffix,
      Math.round((10_000 * trillion) / total) / 10_000,
    ]),
  );
}

const CITE = `Derived by scripts/credit/derive-student-loan-seed.ts from ${SOURCE}`;

/** The parameter rows this derivation writes, keyed by the name an engine reads. */
export function parameterRows(source: Source) {
  const rows: Record<string, unknown> = {};
  const held = source.familiesWithStudentDebt;
  rows.studentLoanHolderShare = {
    value: Math.round(held.sharePct * 10) / 1000,
    tag: "SOURCED",
    role: "opening",
    citation: `${CITE}: the share of families with education debt, Federal Reserve Survey of Consumer Finances 2022, Table 4 (21.8 percent). The survey is 2022; the engine marks any 2026 adjustment ESTIMATED.`,
  };
  rows.studentLoanMedianBalanceUsd = {
    value: held.medianBalanceUsd,
    tag: "SOURCED",
    role: "opening",
    citation: `${CITE}: the median balance among families holding education debt, Survey of Consumer Finances 2022, Table 4 (2022 dollars).`,
  };
  rows.studentLoanMeanBalanceUsd = {
    value: held.meanBalanceUsd,
    tag: "SOURCED",
    role: "opening",
    citation: `${CITE}: the mean balance among families holding education debt, Survey of Consumer Finances 2022, Table 4 (2022 dollars).`,
  };
  for (const [suffix, value] of Object.entries(balanceShares(source)))
    rows[`studentLoanBalanceShare${suffix}`] = {
      value,
      tag: "ESTIMATED",
      role: "opening",
      citation: `${CITE}: this age band's share of the student-loan balances in the New York Fed's Household Debt and Credit Report for 2026Q2 (page 21 data), each band over the sum of the bands.`,
      estimatedFrom:
        "Each age row over the sum of the age rows; the published national total is slightly larger because a few borrowers' birth years are unknown.",
      spread: {
        low: Math.round(value * 800) / 1000,
        high: Math.round(value * 1200) / 1000,
        unit: "share of balances",
        citation:
          "Plus or minus a fifth: one quarter's balances by age, with unknown birth years left out.",
      },
    };
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = JSON.parse(readFileSync(SOURCE, "utf8")) as Source;
  const rows = parameterRows(source);
  // Splice the rows in as the file's last keys, so the rest of the file is untouched.
  let text = readFileSync(PARAMETERS, "utf8").trimEnd();
  const first = text.indexOf(',\n  "studentLoan');
  if (first >= 0) text = text.slice(0, first) + "\n}";
  const body = Object.entries(rows)
    .map(
      ([key, row]) =>
        `  ${JSON.stringify(key)}: ${JSON.stringify(row, null, 2).replace(/\n/g, "\n  ")}`,
    )
    .join(",\n");
  writeFileSync(
    PARAMETERS,
    `${text.slice(0, text.lastIndexOf("}")).trimEnd()},\n${body}\n}\n`,
  );
  console.log(
    Object.entries(rows)
      .map(([k, v]) => `${k} ${(v as { value: number }).value}`)
      .join("\n"),
  );
}
