#!/usr/bin/env node
/**
 * CLI Validator for FEC Federal Campaign Finance Source Corpus
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateCampaignFinanceCorpus,
  computeSha256,
  type FecCampaignFinanceCorpus,
} from "../../src/campaign_finance/index";
import type { CampaignFinanceManifest } from "../../src/campaign_finance/manifest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../../");

function loadJson<T>(relPath: string): T {
  const fullPath = resolve(ROOT, relPath);
  const content = readFileSync(fullPath, "utf-8");
  return JSON.parse(content) as T;
}

export function runValidate(): boolean {
  console.log("Validating FEC Campaign Finance Source Corpus...");

  const corpus = loadJson<FecCampaignFinanceCorpus>(
    "data/campaign_finance/corpus/normalized_corpus.json",
  );
  const manifest = loadJson<CampaignFinanceManifest>(
    "data/campaign_finance/manifests/campaign_finance_manifest.json",
  );

  const valResult = validateCampaignFinanceCorpus(corpus);

  if (!valResult.valid) {
    console.error("Validation Errors:");
    for (const err of valResult.errors) {
      console.error(`  - ${err}`);
    }
    return false;
  }

  if (valResult.warnings.length > 0) {
    console.warn("Validation Warnings:");
    for (const warn of valResult.warnings) {
      console.warn(`  - ${warn}`);
    }
  }

  // Checksum verification
  const serialized = JSON.stringify(corpus);
  const checksum = computeSha256(serialized);

  if (checksum !== manifest.integrity.corpusChecksum) {
    console.error(
      `Checksum mismatch! Manifest: ${manifest.integrity.corpusChecksum}, Calculated: ${checksum}`,
    );
    return false;
  }

  console.log("Validation Succeeded:");
  console.log(`  Corpus integrity valid: true`);
  console.log(`  Candidate/Committee ID formats valid: true`);
  console.log(`  Cycle separation valid: true`);
  console.log(`  Amendment non-double-counting valid: true`);
  console.log(`  Debts vs Loans distinction valid: true`);
  console.log(`  Zero secrets detected: true`);
  console.log(`  Manifest checksum matched: ${checksum}`);

  return true;
}

if (process.argv[1] && process.argv[1].endsWith("cli-validate.ts")) {
  const ok = runValidate();
  process.exit(ok ? 0 : 1);
}
