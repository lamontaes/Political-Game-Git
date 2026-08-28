#!/usr/bin/env node
/**
 * CLI Compiler for FEC Federal Campaign Finance Source Corpus
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compileCampaignFinanceCorpus,
  computeCalibrationProfile,
  buildCampaignFinanceManifest,
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

  const input: CompilerInput = {
    candidates: [
      ...houseData.candidates,
      ...senateData.candidates,
      ...presData.candidates,
      ...pacPartyData.candidates,
      ...ieData.candidates,
    ],
    committees: [
      ...houseData.committees,
      ...senateData.committees,
      ...presData.committees,
      ...pacPartyData.committees,
      ...ieData.committees,
    ],
    relationships: [
      ...houseData.relationships,
      ...senateData.relationships,
      ...presData.relationships,
      ...pacPartyData.relationships,
      ...ieData.relationships,
    ],
    filings: [
      ...houseData.filings,
      ...senateData.filings,
      ...presData.filings,
      ...pacPartyData.filings,
      ...ieData.filings,
    ],
    receipts: [
      ...houseData.receipts,
      ...senateData.receipts,
      ...presData.receipts,
      ...pacPartyData.receipts,
      ...ieData.receipts,
    ],
    disbursements: [
      ...houseData.disbursements,
      ...senateData.disbursements,
      ...presData.disbursements,
      ...pacPartyData.disbursements,
      ...ieData.disbursements,
    ],
    loans: [
      ...houseData.loans,
      ...senateData.loans,
      ...presData.loans,
      ...pacPartyData.loans,
      ...ieData.loans,
    ],
    debts: [
      ...houseData.debts,
      ...senateData.debts,
      ...presData.debts,
      ...pacPartyData.debts,
      ...ieData.debts,
    ],
    independentExpenditures: [
      ...houseData.independentExpenditures,
      ...senateData.independentExpenditures,
      ...presData.independentExpenditures,
      ...pacPartyData.independentExpenditures,
      ...ieData.independentExpenditures,
    ],
  };

  const corpus = compileCampaignFinanceCorpus(input);
  const calibration = computeCalibrationProfile(corpus);
  const manifest = buildCampaignFinanceManifest(corpus);

  writeJson("data/campaign_finance/corpus/normalized_corpus.json", corpus);
  writeJson(
    "data/campaign_finance/manifests/campaign_finance_manifest.json",
    manifest,
  );
  writeJson(
    "data/campaign_finance/calibration/calibration_benchmarks.json",
    calibration,
  );

  console.log(`Compilation complete:`);
  console.log(`  Candidates: ${corpus.candidates.length}`);
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
  console.log(`  Corpus Checksum: ${manifest.integrity.corpusChecksum}`);
}

if (process.argv[1] && process.argv[1].endsWith("cli-compile.ts")) {
  runCompile();
}
