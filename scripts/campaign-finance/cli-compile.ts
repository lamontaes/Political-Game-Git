#!/usr/bin/env node
/**
 * CLI Compiler for FEC Federal Campaign Finance Source Corpus
 *
 * Compiles authentic OpenFEC source records and synthetic test fixtures,
 * builds coverage manifest with explicit source vs synthetic inventory,
 * and derives empirical calibration benchmarks strictly isolated from synthetic fixtures.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCampaignFinanceManifest,
  compileCampaignFinanceCorpus,
  computeCalibrationProfile,
  type CompilerInput,
} from "../../src/campaign_finance/index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../../");

function loadJson<T>(relPath: string): T {
  const fullPath = resolve(ROOT, relPath);
  const content = readFileSync(fullPath, "utf-8");
  return JSON.parse(content) as T;
}

function writeJson(relPath: string, data: unknown): void {
  const fullPath = resolve(ROOT, relPath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export function runCompile(): void {
  console.log("Compiling FEC Campaign Finance Source Corpus...");

  const houseData = loadJson<{
    candidates: CompilerInput["candidates"];
    committees: CompilerInput["committees"];
    relationships: CompilerInput["relationships"];
    filings: CompilerInput["filings"];
    receipts: CompilerInput["receipts"];
    disbursements: CompilerInput["disbursements"];
    loans: CompilerInput["loans"];
    debts: CompilerInput["debts"];
    independentExpenditures: CompilerInput["independentExpenditures"];
  }>("data/campaign_finance/fixtures/house/ky06_house_race.json");

  const senateData = loadJson<{
    candidates: CompilerInput["candidates"];
    committees: CompilerInput["committees"];
    relationships: CompilerInput["relationships"];
    filings: CompilerInput["filings"];
    receipts: CompilerInput["receipts"];
    disbursements: CompilerInput["disbursements"];
    loans: CompilerInput["loans"];
    debts: CompilerInput["debts"];
    independentExpenditures: CompilerInput["independentExpenditures"];
  }>("data/campaign_finance/fixtures/senate/ky_senate_race.json");

  const presData = loadJson<{
    candidates: CompilerInput["candidates"];
    committees: CompilerInput["committees"];
    relationships: CompilerInput["relationships"];
    filings: CompilerInput["filings"];
    receipts: CompilerInput["receipts"];
    disbursements: CompilerInput["disbursements"];
    loans: CompilerInput["loans"];
    debts: CompilerInput["debts"];
    independentExpenditures: CompilerInput["independentExpenditures"];
  }>("data/campaign_finance/fixtures/presidential/presidential_race.json");

  const pacPartyData = loadJson<{
    candidates: CompilerInput["candidates"];
    committees: CompilerInput["committees"];
    relationships: CompilerInput["relationships"];
    filings: CompilerInput["filings"];
    receipts: CompilerInput["receipts"];
    disbursements: CompilerInput["disbursements"];
    loans: CompilerInput["loans"];
    debts: CompilerInput["debts"];
    independentExpenditures: CompilerInput["independentExpenditures"];
  }>("data/campaign_finance/fixtures/pac_party/party_and_pacs.json");

  const ieData = loadJson<{
    candidates: CompilerInput["candidates"];
    committees: CompilerInput["committees"];
    relationships: CompilerInput["relationships"];
    filings: CompilerInput["filings"];
    receipts: CompilerInput["receipts"];
    disbursements: CompilerInput["disbursements"];
    loans: CompilerInput["loans"];
    debts: CompilerInput["debts"];
    independentExpenditures: CompilerInput["independentExpenditures"];
  }>(
    "data/campaign_finance/fixtures/independent_expenditures/outside_spending_superpac.json",
  );

  const syntheticData = loadJson<{
    candidates: CompilerInput["candidates"];
    committees: CompilerInput["committees"];
    relationships: CompilerInput["relationships"];
    filings: CompilerInput["filings"];
    receipts: CompilerInput["receipts"];
    disbursements: CompilerInput["disbursements"];
    loans: CompilerInput["loans"];
    debts: CompilerInput["debts"];
    independentExpenditures: CompilerInput["independentExpenditures"];
  }>("data/campaign_finance/fixtures/synthetic/synthetic_test_scenarios.json");

  const input: CompilerInput = {
    candidates: [
      ...houseData.candidates,
      ...senateData.candidates,
      ...presData.candidates,
      ...pacPartyData.candidates,
      ...ieData.candidates,
      ...syntheticData.candidates,
    ],
    committees: [
      ...houseData.committees,
      ...senateData.committees,
      ...presData.committees,
      ...pacPartyData.committees,
      ...ieData.committees,
      ...syntheticData.committees,
    ],
    relationships: [
      ...houseData.relationships,
      ...senateData.relationships,
      ...presData.relationships,
      ...pacPartyData.relationships,
      ...ieData.relationships,
      ...syntheticData.relationships,
    ],
    filings: [
      ...houseData.filings,
      ...senateData.filings,
      ...presData.filings,
      ...pacPartyData.filings,
      ...ieData.filings,
      ...syntheticData.filings,
    ],
    receipts: [
      ...houseData.receipts,
      ...senateData.receipts,
      ...presData.receipts,
      ...pacPartyData.receipts,
      ...ieData.receipts,
      ...syntheticData.receipts,
    ],
    disbursements: [
      ...houseData.disbursements,
      ...senateData.disbursements,
      ...presData.disbursements,
      ...pacPartyData.disbursements,
      ...ieData.disbursements,
      ...syntheticData.disbursements,
    ],
    loans: [
      ...houseData.loans,
      ...senateData.loans,
      ...presData.loans,
      ...pacPartyData.loans,
      ...ieData.loans,
      ...syntheticData.loans,
    ],
    debts: [
      ...houseData.debts,
      ...senateData.debts,
      ...presData.debts,
      ...pacPartyData.debts,
      ...ieData.debts,
      ...syntheticData.debts,
    ],
    independentExpenditures: [
      ...houseData.independentExpenditures,
      ...senateData.independentExpenditures,
      ...presData.independentExpenditures,
      ...pacPartyData.independentExpenditures,
      ...ieData.independentExpenditures,
      ...syntheticData.independentExpenditures,
    ],
  };

  const corpus = compileCampaignFinanceCorpus(input);
  const empiricalCalibration = computeCalibrationProfile(
    corpus,
    "2024-OpenFEC",
    "empirical",
  );
  const syntheticCalibration = computeCalibrationProfile(
    corpus,
    "2024-OpenFEC",
    "synthetic_test",
  );
  const manifest = buildCampaignFinanceManifest(corpus);

  writeJson("data/campaign_finance/corpus/normalized_corpus.json", corpus);
  writeJson(
    "data/campaign_finance/manifests/campaign_finance_manifest.json",
    manifest,
  );
  writeJson(
    "data/campaign_finance/calibration/calibration_benchmarks.json",
    empiricalCalibration,
  );
  writeJson(
    "data/campaign_finance/calibration/synthetic_test_calibration.json",
    syntheticCalibration,
  );

  console.log(`Compilation complete:`);
  console.log(`  Total Candidates: ${corpus.candidates.length}`);
  console.log(`    House: ${manifest.coverage.offices.houseCandidates}`);
  console.log(`    Senate: ${manifest.coverage.offices.senateCandidates}`);
  console.log(
    `    Presidential: ${manifest.coverage.offices.presidentialCandidates}`,
  );
  console.log(
    `    Math check passed: ${manifest.coverage.offices.mathCheckPassed}`,
  );
  console.log(`  Committees: ${corpus.committees.length}`);
  console.log(`  Relationships: ${corpus.relationships.length}`);
  console.log(
    `  Filings: ${corpus.filings.length} (${manifest.totals.activeFilings} active, ${manifest.totals.supersededFilings} superseded)`,
  );
  console.log(`  Receipts: ${corpus.receipts.length}`);
  console.log(`  Disbursements: ${corpus.disbursements.length}`);
  console.log(`  Loans: ${corpus.loans.length}`);
  console.log(`  Debts: ${corpus.debts.length}`);
  console.log(
    `  Independent Expenditures: ${corpus.independentExpenditures.length}`,
  );
  console.log(
    `  Source vs Synthetic Inventory: ${manifest.sourceVsSyntheticInventory.aggregateAllEntities.actualOpenFec} actual, ${manifest.sourceVsSyntheticInventory.aggregateAllEntities.transformedOfficial} transformed, ${manifest.sourceVsSyntheticInventory.aggregateAllEntities.syntheticFixture} synthetic (${manifest.sourceVsSyntheticInventory.aggregateAllEntities.empiricalSharePercent}% empirical)`,
  );
  console.log(`  Corpus Checksum: ${manifest.integrity.corpusChecksum}`);
}

if (process.argv[1] && process.argv[1].endsWith("cli-compile.ts")) {
  runCompile();
}
