/**
 * Housing Affordability Corpus Compiler
 *
 * Compiles raw and fixture HUD USER FMR, HUD USER Income Limits, and CHAS datasets
 * into a canonical, deterministic, validated housing corpus package.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  parseFmrCsv,
  parseIncomeLimitCsv,
} from "./adapters/hud_user_download.js";
import { parseChasExtractCsv } from "./adapters/chas_file_adapter.js";
import {
  buildCalibrationProfile,
  normalizeChasRecord,
  normalizeFmrRecord,
  normalizeIncomeLimitRecord,
} from "./normalizer.js";
import { canonicalJsonStringify, computeSha256 } from "./provenance.js";
import type {
  ChasAffordabilityRecord,
  CompiledHousingCorpus,
  FairMarketRentRecord,
  GeographicIdentity,
  HousingCalibrationProfile,
  IncomeLimitRecord,
} from "./types.js";

export interface CompileOptions {
  dataDir?: string;
  outputFile?: string;
}

export function compileHousingCorpus(
  options?: CompileOptions,
): CompiledHousingCorpus {
  const baseDir =
    options?.dataDir ?? resolve(process.cwd(), "data/housing_affordability");
  const rawDir = resolve(baseDir, "raw");

  const fmr2024Path = resolve(rawDir, "hud_fmr_fy2024.csv");
  const fmr2023Path = resolve(rawDir, "hud_fmr_fy2023.csv");
  const il2024Path = resolve(rawDir, "hud_il_fy2024.csv");
  const il2023Path = resolve(rawDir, "hud_il_fy2023.csv");
  const chasPath = resolve(rawDir, "chas_2018_2022_extract.csv");

  const fmrRecords: FairMarketRentRecord[] = [];
  const incomeLimitRecords: IncomeLimitRecord[] = [];
  const chasRecords: ChasAffordabilityRecord[] = [];
  const geoMap = new Map<string, GeographicIdentity>();

  // 1. Ingest FMR FY2024
  if (existsSync(fmr2024Path)) {
    const content = readFileSync(fmr2024Path, "utf-8");
    const rawRows = parseFmrCsv(content);
    for (const r of rawRows) {
      const rec = normalizeFmrRecord(
        r,
        "https://www.huduser.gov/portal/datasets/fmr.html",
      );
      fmrRecords.push(rec);
      geoMap.set(rec.geo.geoId, rec.geo);
    }
  }

  // 2. Ingest FMR FY2023 (multi-vintage support)
  if (existsSync(fmr2023Path)) {
    const content = readFileSync(fmr2023Path, "utf-8");
    const rawRows = parseFmrCsv(content);
    for (const r of rawRows) {
      const rec = normalizeFmrRecord(
        r,
        "https://www.huduser.gov/portal/datasets/fmr.html",
      );
      fmrRecords.push(rec);
      geoMap.set(rec.geo.geoId, rec.geo);
    }
  }

  // 3. Ingest Income Limits FY2024
  if (existsSync(il2024Path)) {
    const content = readFileSync(il2024Path, "utf-8");
    const rawRows = parseIncomeLimitCsv(content);
    for (const r of rawRows) {
      const rec = normalizeIncomeLimitRecord(
        r,
        "https://www.huduser.gov/portal/datasets/il.html",
      );
      incomeLimitRecords.push(rec);
      geoMap.set(rec.geo.geoId, rec.geo);
    }
  }

  // 4. Ingest Income Limits FY2023
  if (existsSync(il2023Path)) {
    const content = readFileSync(il2023Path, "utf-8");
    const rawRows = parseIncomeLimitCsv(content);
    for (const r of rawRows) {
      const rec = normalizeIncomeLimitRecord(
        r,
        "https://www.huduser.gov/portal/datasets/il.html",
      );
      incomeLimitRecords.push(rec);
      geoMap.set(rec.geo.geoId, rec.geo);
    }
  }

  // 5. Ingest CHAS 2018-2022 ACS extract
  if (existsSync(chasPath)) {
    const content = readFileSync(chasPath, "utf-8");
    const rawCells = parseChasExtractCsv(content);
    for (const c of rawCells) {
      const rec = normalizeChasRecord(
        c,
        "https://www.huduser.gov/portal/datasets/cp.html",
      );
      chasRecords.push(rec);
      geoMap.set(rec.geo.geoId, rec.geo);
    }
  }

  // Sort records deterministically
  fmrRecords.sort((a, b) => a.id.localeCompare(b.id));
  incomeLimitRecords.sort((a, b) => a.id.localeCompare(b.id));
  chasRecords.sort((a, b) => a.id.localeCompare(b.id));

  const geographicCoverage = Array.from(geoMap.values()).sort((a, b) =>
    a.geoId.localeCompare(b.geoId),
  );

  // 6. Build calibration profiles for latest baseline (FY2024 + CHAS 2018-2022)
  const calibrationProfiles: HousingCalibrationProfile[] = [];
  for (const geo of geographicCoverage) {
    const fmrLatest = fmrRecords.find(
      (r) => r.geo.geoId === geo.geoId && r.vintage === "FY2024",
    );
    const ilLatest = incomeLimitRecords.find(
      (r) => r.geo.geoId === geo.geoId && r.vintage === "FY2024",
    );

    if (fmrLatest && ilLatest) {
      const profile = buildCalibrationProfile(
        geo,
        fmrLatest,
        ilLatest,
        chasRecords,
      );
      calibrationProfiles.push(profile);
    }
  }

  calibrationProfiles.sort((a, b) => a.profileId.localeCompare(b.profileId));

  const corpusPayload = {
    corpusId: "national_housing_affordability_corpus_v1",
    schemaVersion: "1.0.0",
    compiledAt: "2026-08-28T18:00:00.000Z",
    compilerVersion: "1.0.0",
    geographicCoverage,
    fmrRecords,
    incomeLimitRecords,
    chasRecords,
    calibrationProfiles,
  };

  const corpusSha256 = computeSha256(corpusPayload);
  const compiledCorpus: CompiledHousingCorpus = {
    ...corpusPayload,
    corpusSha256,
  };

  // Write to output if specified or default
  const outputFile =
    options?.outputFile ??
    resolve(baseDir, "corpus/normalized_housing_corpus.json");
  const outDir = dirname(outputFile);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  writeFileSync(
    outputFile,
    canonicalJsonStringify(compiledCorpus) + "\n",
    "utf-8",
  );

  return compiledCorpus;
}
