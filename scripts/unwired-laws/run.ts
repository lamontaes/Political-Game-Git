import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  lawEffectPaths,
  unwiredQuestions,
} from "../../src/simulation/governing/law-effect-paths";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";

/**
 * `npm run unwired-laws`: every policy question in the catalog that no sized,
 * built path reaches, by category, and whether that matches the allowlist.
 * `npm run unwired-laws -- --update` drops questions that are now wired from
 * the allowlist; it never adds one, so the list can only shrink.
 */

export const ALLOWLIST_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "allowlist.json",
);

export interface UnwiredAllowlist {
  readonly note: string;
  readonly questions: readonly string[];
}

export function readAllowlist(): UnwiredAllowlist {
  return JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8")) as UnwiredAllowlist;
}

export function compareWithAllowlist(
  unwired: readonly string[],
  allowed: readonly string[],
): { readonly added: readonly string[]; readonly nowWired: readonly string[] } {
  const unwiredSet = new Set(unwired);
  const allowedSet = new Set(allowed);
  return {
    added: unwired.filter((key) => !allowedSet.has(key)),
    nowWired: allowed.filter((key) => !unwiredSet.has(key)),
  };
}

function main(): void {
  const catalog = createProductionPolicyCatalog();
  const unwired = unwiredQuestions(catalog);
  const wiredCount = new Set(lawEffectPaths().map((path) => path.questionKey))
    .size;
  const byDomain = new Map<string, typeof unwired>();
  for (const question of unwired)
    byDomain.set(question.domain, [
      ...(byDomain.get(question.domain) ?? []),
      question,
    ]);
  console.log(
    `${unwired.length} of ${catalog.propositionOrder.length} policy questions have no sized, built effect path (${wiredCount} questions have one).`,
  );
  for (const [domain, questions] of byDomain) {
    console.log(`\n${domain} (${questions.length})`);
    for (const question of questions)
      console.log(
        `- ${question.name} (${question.key})${question.linkStatuses.length ? `: outcome-web links ${question.linkStatuses.join(", ")}` : ": no outcome-web link"}`,
      );
  }
  const allowlist = readAllowlist();
  const { added, nowWired } = compareWithAllowlist(
    unwired.map((question) => question.key),
    allowlist.questions,
  );
  if (process.argv.includes("--update")) {
    if (nowWired.length) {
      writeFileSync(
        ALLOWLIST_PATH,
        `${JSON.stringify({ ...allowlist, questions: allowlist.questions.filter((key) => !nowWired.includes(key)) }, null, 2)}\n`,
      );
      console.log(
        `\nRemoved ${nowWired.length} now-wired question(s) from the allowlist.`,
      );
    }
  } else if (nowWired.length) {
    console.log(
      `\n${nowWired.length} allowlisted question(s) are wired now; run npm run unwired-laws -- --update.`,
    );
  }
  if (added.length) {
    console.error(
      `\n${added.length} question(s) are unwired and not on the allowlist; wire them: ${added.join(", ")}`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
