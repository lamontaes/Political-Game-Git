#!/usr/bin/env node
/**
 * CLI Validation Suite for Government Finance and Employment Corpus
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { CorpusValidator } from "../../../src/source/government-finance-employment/index.js";
import type {
  GovernmentEntityMetadata,
  FinanceRecord,
  EmploymentRecord,
} from "../../../src/source/government-finance-employment/index.js";

const FIXTURES_DIR = path.resolve(
  process.cwd(),
  "data/source/government-finance-employment/fixtures",
);

export function runValidation(): boolean {
  console.log(
    "Validating State and Local Government Finance & Employment Corpus...",
  );

  if (!fs.existsSync(FIXTURES_DIR)) {
    console.error(`Fixtures directory not found: ${FIXTURES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
  const governments: GovernmentEntityMetadata[] = [];
  const financeRecords: FinanceRecord[] = [];
  const employmentRecords: EmploymentRecord[] = [];

  for (const file of files) {
    const filePath = path.join(FIXTURES_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);

    if (parsed.government) {
      governments.push(parsed.government);
    }
    if (Array.isArray(parsed.financeRecords)) {
      financeRecords.push(...parsed.financeRecords);
    }
    if (Array.isArray(parsed.employmentRecords)) {
      employmentRecords.push(...parsed.employmentRecords);
    }
  }

  const validator = new CorpusValidator();
  const report = validator.validateCorpus({
    governments,
    financeRecords,
    employmentRecords,
  });

  if (!report.isValid) {
    console.error(`✗ Validation failed with ${report.errors.length} errors:`);
    for (const err of report.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`✓ Validation passed for ${report.totalChecked} items.`);
  if (report.warnings.length > 0) {
    console.log(`  Warnings (${report.warnings.length}):`);
    for (const warn of report.warnings) {
      console.log(`  - ${warn}`);
    }
  }

  return true;
}

if (process.argv[1] && process.argv[1].endsWith("cli-validate.ts")) {
  runValidation();
}
