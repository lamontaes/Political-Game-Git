/**
 * The player-wording check.
 *
 *   npm run wording:check      compare with the committed baseline
 *   npm run wording:baseline   rewrite the baseline after a deliberate change
 *
 * Two things a player must not read, counted in player-facing source:
 *
 * 1. Banned phrases: internal or bookkeeping language the owner ruled out
 *    (Claude CTO, September 27, 2026), such as "on the record", "not modeled"
 *    or "FMR". Counted in strings and JSX text under src/, never in comments,
 *    identifiers or tests.
 * 2. Hand-written sentences in player screens: a full sentence typed directly
 *    into a component under src/player instead of coming from the English
 *    engine. Counted per file.
 *
 * Main already carries both, so the check is a ratchet. The baseline records
 * every current count; any count that differs fails. A new phrase or a new
 * hand-written sentence fails, and a fix shrinks the baseline in the same
 * change, so the numbers only go down.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { codeProseRanges } from "../prose-eval/prose-ranges";

export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
export const BASELINE_PATH = path.join(
  ROOT,
  "scripts",
  "english-check",
  "wording-baseline.json",
);

/** The owner's list. Matched case-insensitively on word boundaries. */
export const BANNED_PHRASES: readonly string[] = [
  "on the record",
  "reported",
  "tentative hold",
  "no balance on record",
  "not modeled",
  "game-authored",
  "is not represented",
  "supported destinations",
  "this save's",
  "reading this does not",
  "when the game supports it",
  "fiscal year",
  "GEOID",
  "FMR",
];

export interface WordingCounts {
  /** `file :: phrase` -> occurrences. */
  readonly banned: Readonly<Record<string, number>>;
  /** file -> hand-written sentences in a player screen. */
  readonly handWritten: Readonly<Record<string, number>>;
}

/**
 * Source a player never reads: authoring and review tools, developer screens,
 * source-data ingestion, research and command-line utilities.
 */
const NOT_PLAYER_FACING = [
  "src/authoring/",
  "src/cli/",
  "src/devtools/",
  "src/r1-review/",
  "src/research/",
  "src/source/",
  "src/ui/",
];

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files", "src"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(
      (file) =>
        /\.(ts|tsx)$/.test(file) &&
        !/\.test\.tsx?$/.test(file) &&
        !file.endsWith(".d.ts") &&
        !NOT_PLAYER_FACING.some((prefix) => file.startsWith(prefix)),
    );
}

function phrasePattern(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "gi");
}

const PATTERNS = BANNED_PHRASES.map(
  (phrase) => [phrase, phrasePattern(phrase)] as const,
);

/** A sentence: four or more words ending in . ? or ! */
const SENTENCE = /(?:^|[.?!]\s+)([A-Z][^.?!]*?(?:\s+\S+){3,}[.?!])/g;

function playerText(source: string, file: string): string[] {
  return codeProseRanges(source, file)
    .filter((range) => range.kind !== "comment")
    .map((range) => source.slice(range.start, range.end));
}

export function countWording(): WordingCounts {
  const banned: Record<string, number> = {};
  const handWritten: Record<string, number> = {};
  for (const file of trackedFiles()) {
    const source = readFileSync(path.join(ROOT, file), "utf8");
    const texts = playerText(source, file);
    for (const text of texts)
      for (const [phrase, pattern] of PATTERNS) {
        const hits = text.match(pattern)?.length ?? 0;
        if (hits) {
          const key = `${file} :: ${phrase}`;
          banned[key] = (banned[key] ?? 0) + hits;
        }
      }
    if (file.startsWith("src/player/") && file.endsWith(".tsx")) {
      const sentences = texts.reduce(
        (total, text) => total + (text.match(SENTENCE)?.length ?? 0),
        0,
      );
      if (sentences) handWritten[file] = sentences;
    }
  }
  return { banned: sorted(banned), handWritten: sorted(handWritten) };
}

function sorted(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function readBaseline(): WordingCounts {
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as WordingCounts;
}

/** Every difference between two counts, described for a person. */
export function wordingDifferences(
  baseline: WordingCounts,
  current: WordingCounts,
): string[] {
  const problems: string[] = [];
  for (const kind of ["banned", "handWritten"] as const) {
    const keys = new Set([
      ...Object.keys(baseline[kind]),
      ...Object.keys(current[kind]),
    ]);
    for (const key of [...keys].sort()) {
      const before = baseline[kind][key] ?? 0;
      const now = current[kind][key] ?? 0;
      if (now > before)
        problems.push(
          kind === "banned"
            ? `new banned phrase: ${key} (${before} -> ${now})`
            : `new hand-written sentence in a player screen: ${key} (${before} -> ${now}); word it through the English engine`,
        );
      else if (now < before)
        problems.push(
          `fewer than the baseline records: ${key} (${before} -> ${now}); run npm run wording:baseline to lock the improvement in`,
        );
    }
  }
  return problems;
}

function main() {
  const current = countWording();
  if (process.argv.includes("--write")) {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
    const banned = Object.values(current.banned).reduce((a, b) => a + b, 0);
    const hand = Object.values(current.handWritten).reduce((a, b) => a + b, 0);
    console.log(
      `Wrote ${path.relative(ROOT, BASELINE_PATH)}: ${banned} banned-phrase uses, ${hand} hand-written sentences in player screens.`,
    );
    return;
  }
  const problems = wordingDifferences(readBaseline(), current);
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("wording:check OK");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
