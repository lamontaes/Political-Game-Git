#!/usr/bin/env node
/**
 * CLI Inspection Tool for Campaign Finance Calibration Benchmarks
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CampaignFinanceCalibrationProfile } from "../../src/campaign_finance/calibration_types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../../");

function loadJson<T>(relPath: string): T {
  const fullPath = resolve(ROOT, relPath);
  const content = readFileSync(fullPath, "utf-8");
  return JSON.parse(content) as T;
}

export function runCalibrationInspection(): void {
  const profile = loadJson<CampaignFinanceCalibrationProfile>(
    "data/campaign_finance/calibration/calibration_benchmarks.json",
  );

  console.log("=== FEC CAMPAIGN FINANCE CALIBRATION BENCHMARKS ===");
  console.log(`Calibration Mode: ${profile.calibrationMode.toUpperCase()}`);
  console.log(
    `Vintage: ${profile.vintage} | Generated: ${profile.generatedAt}`,
  );
  console.log(
    `Source Coverage: ${profile.sourceCoverage.actualOpenFecFilings} actual OpenFEC, ${profile.sourceCoverage.transformedOfficialFilings} transformed official, ${profile.sourceCoverage.syntheticFixtureFilings} synthetic (Empirical Only: ${profile.sourceCoverage.empiricalOnly})`,
  );

  console.log("\n--- Office Fundraising Benchmarks ---");
  for (const b of profile.fundraisingBenchmarks) {
    console.log(
      `  Office ${b.office} [${b.category}] (N=${b.sampleSize}): Median $${b.medianReceipts.toLocaleString()} | Mean $${b.meanReceipts.toLocaleString()} | P75 $${b.p75Receipts.toLocaleString()} | P90 $${b.p90Receipts.toLocaleString()}`,
    );
  }

  console.log("\n--- Campaign Burn Rates by Phase ---");
  for (const p of profile.burnRatesByPhase) {
    console.log(
      `  ${p.phaseLabel} (N=${p.sampleReports}): Median Burn ${p.medianBurnRate}x | Mean Burn ${p.meanBurnRate}x`,
    );
  }

  console.log("\n--- Debt Prevalence & Composition ---");
  console.log(
    `  Committees with Debt: ${profile.debtPrevalence.percentCommitteesWithDebt}%`,
  );
  console.log(
    `  Committees with Candidate Personal Loans: ${profile.debtPrevalence.percentCommitteesWithCandidateLoans}%`,
  );
  console.log(
    `  Committees with Vendor Trade Debts: ${profile.debtPrevalence.percentCommitteesWithVendorDebts}%`,
  );
  console.log(
    `  Candidate Loan Share of Debt: ${(profile.debtPrevalence.candidateLoanShareOfTotalDebt * 100).toFixed(1)}%`,
  );
  console.log(
    `  Vendor Trade Debt Share of Debt: ${(profile.debtPrevalence.vendorDebtShareOfTotalDebt * 100).toFixed(1)}%`,
  );

  console.log("\n--- Donor Contribution Distributions ---");
  console.log(
    `  Grassroots / Small-Dollar Unitemized (<$200): ${(profile.donorDistributions.unitemizedSmallDollarShare * 100).toFixed(1)}%`,
  );
  console.log(
    `  Itemized Individual Donors (>= $200): ${(profile.donorDistributions.itemizedIndividualShare * 100).toFixed(1)}%`,
  );
  console.log(
    `  PAC & Organization Contributions: ${(profile.donorDistributions.pacContributionShare * 100).toFixed(1)}%`,
  );
  console.log(
    `  Candidate Self-Funding (Contributions + Loans): ${(profile.donorDistributions.candidateSelfFundingShare * 100).toFixed(1)}%`,
  );
  console.log(
    `  Transfers & Other: ${(profile.donorDistributions.transfersAndOtherShare * 100).toFixed(1)}%`,
  );

  console.log("\n--- Outside Independent Expenditures Scale ---");
  console.log(
    `  Outside Spending Ratio (Outside / Candidate Spend): ${profile.independentExpenditures.outsideSpendingToCandidateSpendingRatio}x`,
  );
  console.log(
    `  Pro-Candidate Support Spending Share: ${(profile.independentExpenditures.supportShareOfOutsideSpending * 100).toFixed(1)}%`,
  );
  console.log(
    `  Opposition / Attack Spending Share: ${(profile.independentExpenditures.opposeShareOfOutsideSpending * 100).toFixed(1)}%`,
  );

  console.log("\n--- Filing Cadence ---");
  console.log(`  Total Filings: ${profile.filingCadence.totalFilings}`);
  console.log(
    `  Quarterly Filings: ${profile.filingCadence.quarterlyFilingsCount}`,
  );
  console.log(
    `  Monthly Filings: ${profile.filingCadence.monthlyFilingsCount}`,
  );
  console.log(
    `  Pre-Election Bursts: ${profile.filingCadence.preElectionBurstsCount}`,
  );
  console.log(
    `  Fast Notices (24/48hr): ${profile.filingCadence.fastNoticeBurstsCount}`,
  );
  console.log(
    `  Amendment Rate: ${profile.filingCadence.amendmentRatePercent}%`,
  );
}

if (process.argv[1] && process.argv[1].endsWith("cli-calibration.ts")) {
  runCalibrationInspection();
}
