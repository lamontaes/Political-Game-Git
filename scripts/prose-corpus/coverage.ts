import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { scanLiterals, type ScannedLiteral } from "./scan";
import type { ProseInventory } from "./inventory";

/**
 * Whether the inventory actually saw everything, checked independently of it.
 *
 * The old #92 corpus declared complete coverage by construction: it inventoried
 * what its extractors extracted and reported that as the whole game. Entire
 * surface families were missing and the report still said 100%. So this check
 * does not ask the adapters what they found. It walks the production source
 * itself, pulls every string literal out of the syntax tree, and asks of each
 * one whether the inventory has it.
 *
 * The point is not to reach 100% by widening the net until debug strings and
 * identifiers count as prose. It is to end with a number of candidates that a
 * person still has to classify, reported honestly, plus the exclusions and the
 * reason for each. A coverage report whose NEEDS_CLASSIFICATION count is zero
 * only because the classifier was generous is the old failure wearing a new
 * number.
 */

export type CoverageVerdict =
  | "INVENTORIED"
  | "INTENTIONALLY_NON_PLAYER_FACING"
  | "DIAGNOSTIC_OR_TEST"
  | "NEEDS_CLASSIFICATION";

export interface CoverageCandidate {
  readonly sourcePath: string;
  readonly enclosingSymbol: string;
  readonly line: number;
  readonly text: string;
  readonly verdict: CoverageVerdict;
  /** Why it is excluded, for everything that is not INVENTORIED. */
  readonly reason: string;
}

export interface CoverageReport {
  readonly scannedFiles: number;
  readonly totalLiterals: number;
  readonly candidates: readonly CoverageCandidate[];
  readonly counts: Readonly<Record<CoverageVerdict, number>>;
  /** Directories and files deliberately not scanned, with the reason. */
  readonly exclusions: readonly { path: string; reason: string }[];
}

/**
 * Source trees this check does not walk, and why.
 *
 * Each of these is excluded because of what it *is*, not because scanning it
 * was inconvenient. A reviewer disagreeing with one of these lines is
 * disagreeing with a stated claim rather than discovering an omission.
 */
export const SCAN_EXCLUSIONS: readonly { path: string; reason: string }[] = [
  {
    path: "src/simulation/municipal-governments.generated.ts",
    reason:
      "Generated municipal source projection and provenance metadata, not authored prose. Authored municipal panels, histories and refusals are separately inventoried computed surfaces.",
  },
  {
    path: "src/source",
    reason:
      "The source substrate is cited evidence about the real world — statute text, agency tables, citations. It is not authored player prose and reaches the world only through a named one-way adapter.",
  },
  {
    path: "src/authoring",
    reason:
      "Authoring-time scene and asset tooling. Its strings describe art pipeline state to a developer, not a life to a player.",
  },
  {
    path: "src/devtools",
    reason:
      "Developer diagnostics. Reachable only from the developer view, which ordinary play never opens.",
  },
  {
    path: "src/cli",
    reason: "Headless command output for developers and CI.",
  },
  {
    path: "src/release",
    reason:
      "Build identity: the accepted release version and the source revision the bundle came from. Its strings are a version number and a commit hash, not authored prose, and the only player-visible form of them is a quiet vX.Y.Z the UI composes.",
  },
  {
    path: "src/simulation/national-places.generated.ts",
    reason:
      "Generated place-name data compiled from the Census places corpus. Names of real localities are sourced facts, not authored prose.",
  },
];

/**
 * Files whose literals are machine vocabulary or sourced evidence, not prose.
 *
 * Every entry states what the file *is*. A reviewer who disagrees with one is
 * disagreeing with a claim written down here, which is the point: the old
 * corpus excluded things silently and its coverage number meant nothing.
 */
const NON_PLAYER_FACING_FILES: readonly { match: string; reason: string }[] = [
  {
    match: "src/simulation/taxonomy",
    reason: "The dotted content-key vocabulary itself.",
  },
  {
    match: "src/simulation/canonical-json",
    reason: "Serialization machinery.",
  },
  {
    match: "src/simulation/ids",
    reason: "Identifier construction.",
  },
  {
    match: "src/simulation/legislature-rule-packs.ts",
    reason:
      "Compiled legal instrument text: chamber rule titles, constitutional section citations and their summaries, each carrying its own citation and retrieval date. This is sourced evidence about a real legislature, not authored prose. What a player reads about procedure is composed by the measure briefing, which is inventoried separately.",
  },
  {
    match: "src/simulation/municipal-election-rule-packs.ts",
    reason:
      "Compiled municipal election rules, cited to their instruments. Sourced evidence rather than authored prose.",
  },
  {
    match: "src/simulation/executive-governing-kernel-bank.ts",
    reason:
      "The 92H executive-governing workflow inventory. Nothing under src/player or src/presentation imports it in current main, so no player surface renders these workflow and kernel names.",
  },
  {
    match: "src/simulation/judicial-gameplay-kernel-bank.ts",
    reason:
      "The 92G judicial workflow inventory, reached only by the judicial kernel compiler. No player surface renders these names in current main.",
  },
  {
    match: "src/environment/",
    reason:
      "Scene-authoring and environment-spec machinery. Its strings are validation messages and asset identifiers for the art pipeline, never scene prose — baked art carries no simulation-owned text.",
  },
  {
    match: "src/presentation/pose-families.ts",
    reason: "Pose and landmark geometry validation for the art pipeline.",
  },
  {
    match: "src/presentation/character-components.ts",
    reason:
      "Character component assembly for the art pipeline; layer and slot vocabulary.",
  },
];

/**
 * Enclosing symbols whose literals are messages to a developer.
 *
 * A validator that pushes its complaints into an array rather than throwing
 * still produces developer text, and the direct-throw test alone misses it.
 * Matching the symbol is narrow enough to stay defensible and catches the
 * whole family.
 */
const DEVELOPER_MESSAGE_SYMBOLS =
  /^(validate|assert|require|expect|check)[A-Z]/;

function isTestPath(path: string): boolean {
  return (
    path.includes(".test.") ||
    path.includes("/fixtures/") ||
    path.endsWith(".d.ts")
  );
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (SCAN_EXCLUSIONS.some((exclusion) => full === exclusion.path)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!full.endsWith(".ts") && !full.endsWith(".tsx")) continue;
    out.push(full);
  }
}

/**
 * Does this literal read like a sentence a player could see?
 *
 * Deliberately generous in the direction of *more* candidates: a string that
 * might be prose is a candidate needing classification, which is a question
 * for a person, whereas a string wrongly dismissed is an omission nobody ever
 * sees again. Two words and a lowercase letter is the floor, because option
 * labels are short ("Say nothing").
 */
function couldBeProse(literal: ScannedLiteral): boolean {
  const text = literal.text.trim();
  if (text.length < 6) return false;
  if (!/[a-z]/.test(text)) return false;
  if (!/\s/.test(text)) return false;
  // Dotted content keys, css, urls, selectors, format strings.
  if (/^[a-z0-9.\-_]+$/.test(text)) return false;
  if (/^https?:\/\//.test(text)) return false;
  if (/^[.#][a-zA-Z]/.test(text)) return false;
  if (/^\{[^}]*\}$/.test(text)) return false;
  return true;
}

function classify(
  literal: ScannedLiteral,
  inventoried: ReadonlySet<string>,
): CoverageCandidate {
  const text = literal.text;
  const base = {
    sourcePath: literal.sourcePath,
    enclosingSymbol: literal.enclosingSymbol,
    line: literal.line,
    text,
  };
  if (inventoried.has(normalizeForMatch(text))) {
    return {
      ...base,
      verdict: "INVENTORIED",
      reason: "Present in the prose inventory.",
    };
  }
  if (isTestPath(literal.sourcePath)) {
    return {
      ...base,
      verdict: "DIAGNOSTIC_OR_TEST",
      reason: "Declared in a test or fixture, which no player reaches.",
    };
  }
  const nonFacing = NON_PLAYER_FACING_FILES.find((entry) =>
    literal.sourcePath.startsWith(entry.match),
  );
  if (nonFacing) {
    return {
      ...base,
      verdict: "INTENTIONALLY_NON_PLAYER_FACING",
      reason: nonFacing.reason,
    };
  }
  if (literal.isThrownError) {
    return {
      ...base,
      verdict: "INTENTIONALLY_NON_PLAYER_FACING",
      reason:
        "The message of a thrown developer error. Play fails closed rather than showing it.",
    };
  }
  if (literal.isKeyPosition) {
    return {
      ...base,
      verdict: "INTENTIONALLY_NON_PLAYER_FACING",
      reason:
        "A key, identifier, tag or citation field rather than something read.",
    };
  }
  if (DEVELOPER_MESSAGE_SYMBOLS.test(literal.enclosingSymbol)) {
    return {
      ...base,
      verdict: "INTENTIONALLY_NON_PLAYER_FACING",
      reason: `A validation message composed in ${literal.enclosingSymbol}. Play fails closed rather than showing it.`,
    };
  }
  if (literal.propertyName === "reason" || literal.propertyName === "note") {
    return {
      ...base,
      verdict: "INTENTIONALLY_NON_PLAYER_FACING",
      reason:
        "A declared reason or note explaining a gate to a reviewer, not shown as scene prose.",
    };
  }
  return {
    ...base,
    verdict: "NEEDS_CLASSIFICATION",
    reason:
      "Reads like a sentence, sits in a production module, and no adapter claims it. A person must decide whether a player sees it.",
  };
}

/** Whitespace-collapsed, so formatting differences do not read as omissions. */
export function normalizeForMatch(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function buildCoverageReport(
  inventory: ProseInventory,
  roots: readonly string[] = ["src"],
): CoverageReport {
  const files: string[] = [];
  for (const root of roots) walk(root, files);

  const inventoried = new Set(
    inventory.records.map((record) => normalizeForMatch(record.text)),
  );

  const candidates: CoverageCandidate[] = [];
  let totalLiterals = 0;
  for (const file of files) {
    for (const literal of scanLiterals(file)) {
      totalLiterals += 1;
      if (!couldBeProse(literal)) continue;
      candidates.push(classify(literal, inventoried));
    }
  }

  candidates.sort((left, right) => {
    if (left.sourcePath !== right.sourcePath) {
      return left.sourcePath < right.sourcePath ? -1 : 1;
    }
    if (left.line !== right.line) return left.line - right.line;
    return left.text < right.text ? -1 : left.text > right.text ? 1 : 0;
  });

  const counts: Record<CoverageVerdict, number> = {
    INVENTORIED: 0,
    INTENTIONALLY_NON_PLAYER_FACING: 0,
    DIAGNOSTIC_OR_TEST: 0,
    NEEDS_CLASSIFICATION: 0,
  };
  for (const candidate of candidates) counts[candidate.verdict] += 1;

  return {
    scannedFiles: files.length,
    totalLiterals,
    candidates,
    counts,
    exclusions: SCAN_EXCLUSIONS,
  };
}
