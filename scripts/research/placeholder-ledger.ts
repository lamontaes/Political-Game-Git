/**
 * Writes data/research/powers-catalog/placeholder-ledger.json: every line in
 * src that says a number is not researched (PLACEHOLDER, BLANKET, or
 * "unresearched" / "not researched"; tests, generated data and fixtures
 * excluded), the path it sits on (money, law, government or other) and the
 * research question that would settle it. Spec 12 of "04 SYSTEM SPECS": each marker on
 * a money or law path becomes a catalog row marked UNKNOWN with its question.
 *
 *   node --import tsx scripts/research/placeholder-ledger.ts
 *   node --import tsx scripts/research/placeholder-ledger.ts --check
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { format, resolveConfig } from "prettier";

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
  const byKind: Record<string, number> = {};
  for (const marker of markers) {
    byPath[marker.path] = (byPath[marker.path] ?? 0) + 1;
    for (const kind of marker.kinds) byKind[kind] = (byKind[kind] ?? 0) + 1;
  }
  const questions = new Set(
    markers
      .filter((marker) => marker.path === "money" || marker.path === "law")
      .map((marker) => marker.researchQuestionId ?? `unfiled:${marker.file}`),
  );
  return {
    about:
      "Every line in src (outside tests, generated data and fixtures) marked PLACEHOLDER, BLANKET, unresearched or not researched, with the path it sits on and the research question that would settle it. A marker on the money or law path is a catalog row whose value is UNKNOWN until that question is answered. researchQuestionId null means no question is filed yet; researchQuestionFiled says whether docs/research/requests holds it. Files a plain search finds that are not game values are named, with a reason, in scripts/research/placeholder-scan.ts.",
    generatedBy: "scripts/research/placeholder-ledger.ts",
    pathRule: placeholderPathFor.rule,
    counts: {
      markers: markers.length,
      byKind,
      byPath,
      withoutQuestion: markers.filter((m) => m.researchQuestionId === null)
        .length,
      questionNotFiled: markers.filter(
        (m) => m.researchQuestionId !== null && !m.researchQuestionFiled,
      ).length,
      moneyOrLawQuestions: questions.size,
    },
    markers,
  };
}

const ledger = build();
// The committed file is formatted the way `prettier --check .` wants it, so
// the check below compares the formatted text, not the raw JSON.
const text = await format(JSON.stringify(ledger, null, 2), {
  ...(await resolveConfig(LEDGER)),
  filepath: LEDGER,
});
if (process.argv.includes("--check")) {
  const held = readFileSync(LEDGER, "utf8");
  if (held !== text) {
    console.error(
      "placeholder-ledger.json is stale; run node --import tsx scripts/research/placeholder-ledger.ts",
    );
    process.exit(1);
  }
  console.log(
    `placeholder ledger current: ${ledger.counts.markers} markers, ${ledger.counts.withoutQuestion} name no research question`,
  );
} else {
  writeFileSync(LEDGER, text);
  console.log(
    `wrote ${ledger.counts.markers} markers: ${JSON.stringify(ledger.counts.byKind)} ${JSON.stringify(ledger.counts.byPath)}; ${ledger.counts.withoutQuestion} name no research question`,
  );
}
