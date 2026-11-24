import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  BRITISH_IDIOM,
  PLAYER_VOCABULARY,
  queueIdiom,
} from "../../../scripts/prose-eval/british-idiom.mjs";
import { britishSpellings } from "../../../scripts/prose-eval/american-spelling";
import { ALLOWED_PHRASES, isAllowedFile, KNOWN_HITS } from "./allowlist";

/**
 * The game is set in the United States, and every word a player reads must be
 * American English. British forms keep slipping into copy, so this guard scans
 * everything a player can read and fails, naming file:line, when one appears.
 *
 * What is scanned:
 *  - every string literal and template literal in src/**\/*.ts and *.tsx
 *    (test files are skipped: their own fixtures are not player text), and
 *  - every string value in data/**\/*.json, except data/source/, which holds
 *    verbatim federal source corpora (about 850 MB of agency records that are
 *    never shown as written, and would blow the time budget).
 *
 * Identifiers and JSON keys are not scanned: only quoted values are.
 *
 * The words come from the one American English engine in scripts/prose-eval:
 * its spelling table (american-spelling.ts) and its vocabulary lists
 * (british-idiom.mjs). Real names and quotations that look British are in
 * ./allowlist.ts. The rest of the family: spelling-dates-units.test.ts reads
 * every tracked file, place-and-presence.test.ts bans lines that restate the
 * screen, and player-text.test.ts bans developer text in player strings.
 */

/** The broad "queue" idiom is for reports; player text uses the narrow one. */
const RULES = [
  ...BRITISH_IDIOM.filter(({ pattern }) => pattern !== queueIdiom),
  ...PLAYER_VOCABULARY,
];

const ROOT = path.resolve(__dirname, "../../..");

function walk(
  dir: string,
  accept: (file: string) => boolean,
  out: string[],
): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const info = statSync(full);
    if (info.isDirectory()) walk(full, accept, out);
    else if (accept(full)) out.push(full);
  }
  return out;
}

interface Literal {
  readonly text: string;
  readonly line: number;
  /** A `british-spelling-ok:` comment sits just above this literal. */
  readonly marked: boolean;
}

/** Comment that keeps a literal as quoted by committed reports; needs a reason. */
const MARKER = "british-spelling-ok:";

/**
 * Every string literal and template literal in a source file, with its line.
 * A small hand-written scan rather than one big regex: a single regex over a
 * multi-kilobyte template literal overflows the stack. Comments are skipped.
 */
function stringLiterals(source: string): Literal[] {
  const found: Literal[] = [];
  let line = 1;
  let markerLine = -10;
  let i = 0;
  const n = source.length;
  while (i < n) {
    const c = source[i]!;
    const next = source[i + 1];
    if (c === "\n") {
      line += 1;
      i += 1;
    } else if (c === "/" && next === "/") {
      const start = i;
      while (i < n && source[i] !== "\n") i += 1;
      if (source.slice(start, i).includes(MARKER)) markerLine = line;
    } else if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") line += 1;
        i += 1;
      }
      i += 2;
    } else if (c === '"' || c === "'" || c === "`") {
      const startLine = line;
      let text = "";
      i += 1;
      while (i < n && source[i] !== c) {
        if (source[i] === "\\") {
          text += source[i + 1] ?? "";
          if (source[i + 1] === "\n") line += 1;
          i += 2;
          continue;
        }
        if (source[i] === "\n") {
          if (c !== "`") break; // unterminated: it was an apostrophe, not a string
          line += 1;
        }
        text += source[i];
        i += 1;
      }
      i += 1;
      found.push({
        text,
        line: startLine,
        marked: startLine - markerLine <= 3 && startLine >= markerLine,
      });
    } else {
      i += 1;
    }
  }
  return found;
}

interface Hit {
  readonly where: string;
  readonly word: string;
  readonly instead: string;
  readonly text: string;
}

/**
 * A literal with no whitespace and a separator in it (`civic.organise-it`,
 * `source-colour`, a URL), or a single lowercase or all-caps token (`queued`,
 * `WARD`), is a code token or an enum value, not something a player reads.
 * A single Capitalized word ("Programme") still counts as a label.
 */
function isCodeToken(text: string): boolean {
  if (/\s/.test(text)) return false;
  if (/[-._:/@#$\\{}[\]()=]/.test(text)) return true;
  return (
    /^[a-z][a-z0-9]*$/.test(text) ||
    /^[A-Z0-9]+$/.test(text) ||
    /^[a-z]+[A-Z]\w*$/.test(text)
  );
}

/** Remove `${...}` template expressions, which are code, keeping line count. */
function stripExpressions(text: string): string {
  let out = "";
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (depth === 0 && text[i] === "$" && text[i + 1] === "{") {
      depth = 1;
      i += 1;
      out += " ";
    } else if (depth > 0) {
      if (text[i] === "{") depth += 1;
      else if (text[i] === "}") depth -= 1;
    } else {
      out += text[i];
    }
  }
  return out;
}

function scanText(
  relative: string,
  where: string,
  text: string,
  hits: Hit[],
): void {
  // Template-literal expressions, {{placeholders}} and {role:slots} are code.
  let cleaned = stripExpressions(text)
    .replace(/\{\{[^}]*\}\}/g, " ")
    .replace(/\{[a-z][\w-]*:[^}]*\}/g, " ");
  if (isCodeToken(text) || isCodeToken(cleaned.trim())) return;
  for (const allowed of ALLOWED_PHRASES)
    cleaned = cleaned.replace(allowed.pattern, " ");
  for (const rule of RULES) {
    const match = rule.pattern.exec(cleaned);
    if (match && !isAllowedFile(relative, match[0])) {
      hits.push({ where, word: match[0], instead: rule.instead, text });
    }
  }
  for (const finding of britishSpellings(cleaned))
    if (
      !isAllowedFile(relative, finding.british) &&
      // One hit per word: a vocabulary rule may already have named it.
      !hits.some(
        (hit) =>
          hit.where === where &&
          hit.word.toLowerCase().includes(finding.british.toLowerCase()),
      )
    )
      hits.push({
        where,
        word: finding.british,
        instead: finding.american,
        text,
      });
}

function scanSource(file: string, hits: Hit[]): void {
  const relative = path.relative(ROOT, file);
  for (const literal of stringLiterals(readFileSync(file, "utf8"))) {
    if (literal.text.length < 3 || literal.marked) continue;
    scanText(relative, `${relative}:${literal.line}`, literal.text, hits);
  }
}

function scanJson(file: string, hits: Hit[]): void {
  const relative = path.relative(ROOT, file);
  const visit = (value: unknown, where: string): void => {
    if (typeof value === "string")
      scanText(relative, `${relative}${where}`, value, hits);
    else if (Array.isArray(value))
      value.forEach((item, index) => visit(item, `${where}[${index}]`));
    else if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value))
        visit(item, `${where}.${key}`);
    }
  };
  visit(JSON.parse(readFileSync(file, "utf8")), "");
}

function playerFacingHits(): Hit[] {
  const hits: Hit[] = [];
  const sources = walk(
    path.join(ROOT, "src"),
    (file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file),
    [],
  );
  for (const file of sources) scanSource(file, hits);
  // data/source holds verbatim federal source corpora (about 850 MB of agency
  // records), which are never shown as written and would break the time budget.
  const data = walk(
    path.join(ROOT, "data"),
    (file) =>
      file.endsWith(".json") &&
      !file.includes(`${path.sep}data${path.sep}source${path.sep}`),
    [],
  );
  for (const file of data) scanJson(file, hits);
  return hits;
}

describe("Player-facing text is American English", () => {
  const hits = playerFacingHits();
  const fileOf = (hit: Hit) =>
    hit.where.replace(/(\.json|\.tsx?)[:.[].*$/, "$1");

  it("adds no British form beyond the known list, which only shrinks", () => {
    const byFile = new Map<string, Hit[]>();
    for (const hit of hits)
      byFile.set(fileOf(hit), [...(byFile.get(fileOf(hit)) ?? []), hit]);
    const report: string[] = [];
    for (const [file, found] of byFile) {
      const known = KNOWN_HITS[file] ?? 0;
      if (found.length <= known) continue;
      report.push(
        `${file}: ${found.length} British forms, ${known} known. Reword the new one:`,
      );
      for (const hit of found) {
        const at = hit.text.toLowerCase().indexOf(hit.word.toLowerCase());
        const excerpt = hit.text
          .slice(Math.max(0, at - 40), at + 60)
          .replace(/\s+/g, " ");
        report.push(
          `  ${hit.where}  "${hit.word}" -> ${hit.instead}  ...${excerpt}...`,
        );
      }
    }
    expect(report, "British forms found in player-facing text").toEqual([]);
  });

  it("lowers a known count as soon as a line is fixed", () => {
    const stale = Object.entries(KNOWN_HITS)
      .map(
        ([file, known]) =>
          [
            file,
            known,
            hits.filter((hit) => fileOf(hit) === file).length,
          ] as const,
      )
      .filter(([, known, found]) => found < known)
      .map(
        ([file, known, found]) =>
          `${file}: lower ${known} to ${found} in tests/guards/english/allowlist.ts`,
      );
    expect(stale).toEqual([]);
  });
});

describe("The American English rules themselves", () => {
  const flagged = (text: string): string[] => {
    const hits: Hit[] = [];
    scanText("fixture.ts", "fixture.ts:1", text, hits);
    return hits.map((hit) => hit.word.toLowerCase());
  };

  it.each([
    ["The councillor spoke.", "councillor"],
    // british-spelling-ok: these are the deliberately wrong forms the guard rejects.
    ["We organise a rally.", "organise"],
    // british-spelling-ok: these are the deliberately wrong forms the guard rejects.
    ["A new colour scheme.", "colour"],
    // british-spelling-ok: these are the deliberately wrong forms the guard rejects.
    ["Your neighbour waves.", "neighbour"],
    // british-spelling-ok: these are the deliberately wrong forms the guard rejects.
    ["Cut the programme.", "programme"],
    // british-spelling-ok: these are the deliberately wrong forms the guard rejects.
    ["Renew your licence.", "licence"],
    ["Back in a fortnight.", "fortnight"],
    ["You wait in a long queue.", "long queue"],
    ["She rents a flat above the shop.", "flat above"],
    ["He is on holiday.", "on holiday"],
    // british-spelling-ok: this is the deliberately wrong form the guard rejects.
    ["Ask your mum.", "mum"],
    ["The local authority decides.", "local authority"],
    ["The minister resigned.", "minister"],
    ["Stand for office.", "stand for office"],
    // The phrasings that once shipped, from the dialogue and questionnaire audits.
    ["is bringing the bins back in", "the bins"],
    ["the borough councillor said so", "councillor"],
  ])("catches %s", (text, word) => {
    expect(flagged(text)).toHaveLength(1);
    expect(flagged(text)[0]).toContain(word.toLowerCase());
  });

  it.each([
    "The council member spoke.",
    "We organize a rally.",
    "A flat rate and a flat floor.",
    "The work queue is long.",
    "Congress observes a legal holiday on Monday.",
    "The church minister gave the blessing.",
    "Sales tax holidays return in August.",
    "Run for office.",
    "Ward is a family name only in the name files.".replace("Ward", "Aware"),
    "The aftermath of the flatMap discussion.",
  ])("leaves American text alone: %s", (text) => {
    expect(flagged(text)).toEqual([]);
  });
});
