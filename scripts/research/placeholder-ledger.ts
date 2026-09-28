/**
 * Writes data/research/powers-catalog/placeholder-ledger.json: every
 * PLACEHOLDER marker in src/simulation and src/presentation (tests excluded),
 * the path it sits on (money, law, government or other) and the research
 * question that would settle it. Spec 12 of "04 SYSTEM SPECS": each marker on
 * a money or law path becomes a catalog row marked UNKNOWN with its question.
 *
 *   node --import tsx scripts/research/placeholder-ledger.ts
 *   node --import tsx scripts/research/placeholder-ledger.ts --check
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  placeholderPathFor,
  scanPlaceholders,
  type PlaceholderLedger,
} from "./placeholder-scan";

const root = resolve(import.meta.dirname, "../..");
export const LEDGER = resolve(
  root,
  "data/research/powers-catalog/placeholder-ledger.json",
);

function build(): PlaceholderLedger {
  const markers = scanPlaceholders(root);
  const byPath: Record<string, number> = {};
  for (const marker of markers)
    byPath[marker.path] = (byPath[marker.path] ?? 0) + 1;
  const questions = new Set(
    markers
      .filter((marker) => marker.path === "money" || marker.path === "law")
      .map((marker) => marker.researchQuestionId ?? `unfiled:${marker.file}`),
  );
  return {
    about:
      "Every PLACEHOLDER marker in src/simulation and src/presentation, outside tests, with the path it sits on and the research question that would settle it. A marker on the money or law path is a catalog row whose value is UNKNOWN until that question is answered. researchQuestionId null means no question is filed yet; researchQuestionFiled says whether docs/research/requests holds it.",
    generatedBy: "scripts/research/placeholder-ledger.ts",
    pathRule: placeholderPathFor.rule,
    counts: {
      markers: markers.length,
      byPath,
      moneyOrLawQuestions: questions.size,
    },
    markers,
  };
}

const ledger = build();
const text = `${JSON.stringify(ledger, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const held = readFileSync(LEDGER, "utf8");
  if (held !== text) {
    console.error(
      "placeholder-ledger.json is stale; run node --import tsx scripts/research/placeholder-ledger.ts",
    );
    process.exit(1);
  }
  console.log(`placeholder ledger current: ${ledger.counts.markers} markers`);
} else {
  writeFileSync(LEDGER, text);
  console.log(
    `wrote ${ledger.counts.markers} markers: ${JSON.stringify(ledger.counts.byPath)}`,
  );
}
