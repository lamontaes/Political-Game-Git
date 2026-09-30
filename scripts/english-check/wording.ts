/**
 * The player-wording check.
 *
 *   npm run wording:check      compare with the committed baseline
 *   npm run wording:baseline   rewrite the baseline after a deliberate change
 *
 * Three counts in player-facing source:
 *
 * 1. Banned phrases: internal or bookkeeping language the owner ruled out
 *    (Claude CTO, September 27, 2026), such as "on the record", "not modeled"
 *    or "FMR". Counted in strings and JSX text under src/, never in comments,
 *    identifiers or tests.
 * 2. Hand-written sentences in player screens: a full sentence typed directly
 *    into a component under src/player instead of coming from the English
 *    engine. Counted per file.
 * 3. Awkward phrase structures, with specific repair suggestions. These also
 *    accept assembled screen text through findUnnaturalPhrasing; source alone
 *    cannot catch every combination of dynamically supplied fragments.
 *
 * Existing counts are debt, so the check is a ratchet. The baseline records
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
  // British spellings and words: the game is written in American English.
  // Words that are also real place names (Centre County, Rota, a High Street)
  // are left out, and "rota" is matched only as "the rota" or "a rota".
  // (Lamontae, September 29: "this is stuff that the English engine should
  // catch automatically").
  "the rota",
  "a rota",
  "whilst",
  "amongst",
  "fortnight",
  "queue",
  "queued",
  "on holiday",
  "colour",
  "favour",
  "favours",
  "favourite",
  "neighbour",
  "neighbours",
  "neighbourhood",
  "programme",
  "licence",
  "cheque",
  "organisation",
  "organise",
  "realise",
  "recognise",
  "apologise",
  "behaviour",
  "labour",
  "honour",
  "defence",
  "offence",
  "council tax",
  "car park",
  "petrol",
  "postcode",
  "mobile phone",
  "timetable",
  // Stilted phrasing a person would not say: plain words instead.
  "make the journey",
  "carry out activity",
  "journey to the",
  "proceed to",
  "commence",
  "utilise",
  "utilize",
];

export interface WordingCounts {
  /** `file :: phrase` -> occurrences. */
  readonly banned: Readonly<Record<string, number>>;
  /** file -> hand-written sentences in a player screen. */
  readonly handWritten: Readonly<Record<string, number>>;
  /** `file :: rule` -> awkward phrase structures, separate from banned words. */
  readonly phrasing?: Readonly<Record<string, number>>;
}

export interface PhrasingFinding {
  readonly rule: string;
  readonly phrase: string;
  readonly suggestion: string;
}

/**
 * Examples came from existing player copy, not a dictionary of suspect words.
 * Match a construction: "carry out" can be ordinary speech about an order,
 * and formal American floor formulas are legitimate in their own register.
 * These narrow diagnostics cannot judge every sentence; play the screen too.
 */
const PHRASING_RULES = [
  {
    key: "canonical-clock",
    pattern: /\bcanonical\s+time\b/gi,
    suggestion: 'Say "time" or describe whether the clock moves.',
  },
  {
    key: "impersonal-action",
    pattern: /\bthis\s+action\s+(?:waits|works|travels|attends|begins)\b/gi,
    suggestion: 'Say what you do, such as "You leave at 2 p.m."',
  },
  {
    key: "carry-out-choice",
    pattern:
      /\b(?:not\s+yours\s+to\s+carry\s+out|(?:perform|execute|carry\s+out)\s+(?:(?:an?|the|this)\s+)?activit(?:y|ies))\b/gi,
    suggestion: 'Name the action, such as "Go to the meeting" or "Start work".',
  },
  {
    key: "full-travel-interval",
    pattern: /\btravels?\s+for\s+the\s+full\b/gi,
    suggestion:
      'Give the trip duration directly, such as "The trip takes 30 minutes."',
  },
  {
    key: "calendar-bookkeeping",
    pattern: /\bupcoming\s+(?:and|or)\s+ongoing\s+entr(?:y|ies)\b/gi,
    suggestion: 'Use "scheduled activities" or name the appointments.',
  },
  {
    key: "party-member-count",
    pattern:
      /\b\d+\s+(?:(?:Republican|Democratic)\s+Party|No\s+party)\b(?!\s+(?:candidates?|members?|delegates?|seats?|officials?)\b)/gi,
    suggestion:
      'Count people, such as "58 Republicans", rather than counting a party name.',
  },
] as const;

/** Whitespace in JSX and wrapped source must not hide the same construction. */
export function findUnnaturalPhrasing(
  text: string,
): readonly PhrasingFinding[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  return PHRASING_RULES.flatMap(({ key, pattern, suggestion }) =>
    [...normalized.matchAll(pattern)].map((match) => ({
      rule: key,
      phrase: match[0],
      suggestion,
    })),
  );
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

/** Also used by regression examples to check comments and identifiers stay out. */
export function countSourceWording(
  source: string,
  file: string,
): WordingCounts {
  const banned: Record<string, number> = {};
  const handWritten: Record<string, number> = {};
  const phrasing: Record<string, number> = {};
  const texts = playerText(source, file);
  for (const text of texts) {
    for (const [phrase, pattern] of PATTERNS) {
      const hits = text.match(pattern)?.length ?? 0;
      if (hits) {
        const key = `${file} :: ${phrase}`;
        banned[key] = (banned[key] ?? 0) + hits;
      }
    }
    for (const finding of findUnnaturalPhrasing(text)) {
      const key = `${file} :: ${finding.rule}`;
      phrasing[key] = (phrasing[key] ?? 0) + 1;
    }
  }
  if (file.startsWith("src/player/") && file.endsWith(".tsx")) {
    const sentences = texts.reduce(
      (total, text) => total + (text.match(SENTENCE)?.length ?? 0),
      0,
    );
    if (sentences) handWritten[file] = sentences;
  }
  return { banned, handWritten, phrasing };
}

export function countWording(): WordingCounts {
  const banned: Record<string, number> = {};
  const handWritten: Record<string, number> = {};
  const phrasing: Record<string, number> = {};
  for (const file of trackedFiles()) {
    const source = readFileSync(path.join(ROOT, file), "utf8");
    const counts = countSourceWording(source, file);
    Object.assign(banned, counts.banned);
    Object.assign(handWritten, counts.handWritten);
    Object.assign(phrasing, counts.phrasing);
  }
  return {
    banned: sorted(banned),
    handWritten: sorted(handWritten),
    phrasing: sorted(phrasing),
  };
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
  for (const kind of ["banned", "handWritten", "phrasing"] as const) {
    const previous = baseline[kind] ?? {};
    const actual = current[kind] ?? {};
    const keys = new Set([...Object.keys(previous), ...Object.keys(actual)]);
    for (const key of [...keys].sort()) {
      const before = previous[key] ?? 0;
      const now = actual[key] ?? 0;
      if (now > before)
        problems.push(
          kind === "banned"
            ? `new banned phrase: ${key} (${before} -> ${now})`
            : kind === "phrasing"
              ? `new unnatural phrasing: ${key} (${before} -> ${now}); ${PHRASING_RULES.find((rule) => key.endsWith(` :: ${rule.key}`))?.suggestion ?? "Review the assembled sentence."}`
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
    const phrasing = Object.values(current.phrasing ?? {}).reduce(
      (a, b) => a + b,
      0,
    );
    console.log(
      `Wrote ${path.relative(ROOT, BASELINE_PATH)}: ${banned} banned-phrase uses, ${hand} hand-written sentences in player screens, ${phrasing} unnatural phrase structures.`,
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
