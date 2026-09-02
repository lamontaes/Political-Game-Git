#!/usr/bin/env node
/**
 * CLI Tool to inspect a specific government entity's finance and employment profiles
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseCensusGovId } from "../../src/government_finance_employment/index.js";

const FIXTURES_DIR = path.resolve(
  process.cwd(),
  "data/government_finance_employment/fixtures",
);

export function runInspection(censusGovId?: string) {
  const targetId = censusGovId ?? process.argv[2];
  if (!targetId) {
    console.log(
      "Usage: node --import tsx scripts/government-finance-employment/cli-inspect.ts <censusGovId>",
    );
    process.exit(1);
  }

  console.log(`Inspecting Government Entity: ${targetId}`);

  try {
    const parsedId = parseCensusGovId(targetId);
    console.log("Parsed Census Gov ID:");
    console.log(JSON.stringify(parsedId, null, 2));
  } catch (err) {
    console.warn(
      "Notice: Non-standard or aggregate ID format:",
      (err as Error).message,
    );
  }

  const files = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
  let found = false;

  for (const file of files) {
    const filePath = path.join(FIXTURES_DIR, file);
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    if (
      parsed.government &&
      (parsed.government.censusGovId === targetId ||
        parsed.government.govId === targetId)
    ) {
      found = true;
      console.log(`\nFound Record in: ${file}`);
      console.log(
        "Government Metadata:",
        JSON.stringify(parsed.government, null, 2),
      );

      if (parsed.financeRecords) {
        console.log(`\nFinance Records (${parsed.financeRecords.length}):`);
        for (const f of parsed.financeRecords) {
          console.log(
            ` - Fiscal Year ${f.fiscalYear} (${f.enumerationType}): Total Revenue $${f.totalRevenue?.toLocaleString()}, Total Expenditure $${f.totalExpenditure?.toLocaleString()}, Debt Outstanding $${f.debtOutstandingEndYear?.total?.toLocaleString()}`,
          );
        }
      }

      if (parsed.employmentRecords) {
        console.log(
          `\nEmployment Records (${parsed.employmentRecords.length}):`,
        );
        for (const e of parsed.employmentRecords) {
          console.log(
            ` - Survey Year ${e.surveyYear} (Func ${e.functionCode} - ${e.functionName}): Full-Time: ${e.fullTimeEmployees}, Part-Time: ${e.partTimeEmployees}, Monthly Payroll: $${e.totalPayroll?.toLocaleString()}`,
          );
        }
      }
    }
  }

  if (!found) {
    console.log(`No fixture found matching ID: ${targetId}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("cli-inspect.ts")) {
  runInspection();
}
