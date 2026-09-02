/**
 * CLI Query Tool for BLS LAUS Corpus
 */

import fs from "node:fs";
import path from "node:path";
import { buildBriefingCard } from "../../src/laus_corpus/briefing_adapter.ts";
import { queryCorpus } from "../../src/laus_corpus/query.ts";
import type { LausCompiledCorpus, LausQueryFilter } from "../../src/laus_corpus/types.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const COMPILED_PATH = path.join(REPO_ROOT, "data/laus/compiled/laus-compiled-corpus.json");

export function runQuery(args: string[] = process.argv.slice(2)): void {
  if (!fs.existsSync(COMPILED_PATH)) {
    console.error(`Compiled corpus not found at ${COMPILED_PATH}. Run compile first.`);
    process.exit(1);
  }

  const compiled: LausCompiledCorpus = JSON.parse(fs.readFileSync(COMPILED_PATH, "utf-8"));
  const filter: LausQueryFilter = {};

  for (const arg of args) {
    if (arg.startsWith("--area=")) filter.areaCode = arg.slice(7);
    if (arg.startsWith("--fips=")) {
      const fips = arg.slice(7);
      if (fips.length === 2) filter.stateFips = fips;
      if (fips.length === 5) filter.countyFips = fips;
    }
    if (arg.startsWith("--year=")) filter.year = parseInt(arg.slice(7), 10);
    if (arg.startsWith("--period=")) filter.period = arg.slice(9);
    if (arg.startsWith("--measure=")) filter.measureCode = arg.slice(10);
    if (arg.startsWith("--seasonal=")) filter.seasonal = arg.slice(11).toUpperCase() as "S" | "U";
  }

  const result = queryCorpus(compiled, filter);
  console.log(`Matched ${result.totalMatchedObservations} observations across ${result.areas.length} areas.`);

  for (const area of result.areas.slice(0, 5)) {
    console.log(`\nArea: ${area.areaText} (${area.areaCode})`);
    const card = buildBriefingCard(
      compiled,
      area.areaCode,
      (filter.year as number) || 1990,
      (filter.period as string) || "M01",
      filter.seasonal || "U",
    );
    console.log(`  ${card.headline}`);
    console.log(`  Period: ${card.periodLabel}`);
    console.log(`  Unemployment Rate: ${card.unemploymentRateText} (${card.seasonalAdjustmentText})`);
    console.log(`  Labor Force: ${card.laborForceText} | Employment: ${card.employmentText} | Unemployment: ${card.unemploymentText}`);
    console.log(`  Status: ${card.statusText} | Reconciliation: ${card.reconciliationNote}`);
  }
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("cli-query")) {
  runQuery();
}
