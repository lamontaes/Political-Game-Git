/**
 * Who reads a research data file.
 *
 * A data file counts as read when a non-test code file names it: an import or
 * re-export (`import x from "../../data/research/a.json" with { type: "json" }`),
 * a dynamic import or require, a `new URL(..., import.meta.url)`, or a quoted
 * repository path to it (`readFileSync("data/research/a.json")`). A quoted
 * path to a directory under data/research counts for every JSON file inside it,
 * since scripts read sample folders whole. Shared by the audit autoscan and the
 * research-data-has-reader guard, so both answer the same way.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const CODE_FILE = /\.(?:ts|tsx|mts|js|mjs|cjs)$/;
const SKIPPED_DIRS = new Set(["node_modules", "fixtures", "__fixtures__"]);
/** The checkers name data/research themselves; that is not reading it. */
const CHECKER_DIR = "scripts/audit/";

/** A test, spec or fixture: no player or script ever runs it. */
export function isTestPath(path: string): boolean {
  return (
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path) ||
    /(?:^|\/)(?:fixtures|__fixtures__|__tests__)\//.test(path) ||
    path.startsWith("tests/")
  );
}

function toRepoPath(absolute: string): string {
  return relative(REPO_ROOT, absolute).split(sep).join("/");
}

/** Every non-test code file under the given repository folders. */
export function codeFiles(roots: readonly string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) walk(join(dir, entry.name));
      } else if (CODE_FILE.test(entry.name)) {
        const path = toRepoPath(join(dir, entry.name));
        if (!isTestPath(path) && !path.startsWith(CHECKER_DIR)) out.push(path);
      }
    }
  };
  for (const root of roots) walk(join(REPO_ROOT, root));
  return out.sort();
}

/** Every JSON file under a repository folder, repository-relative. */
export function jsonFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name));
      else if (entry.name.endsWith(".json"))
        out.push(toRepoPath(join(dir, entry.name)));
    }
  };
  walk(join(REPO_ROOT, root));
  return out.sort();
}

export interface DataReader {
  readonly file: string;
  readonly line: number;
  readonly how: "import" | "path" | "directory";
}

const SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bnew\s+URL\s*\(\s*)["'`]([^"'`\n]+)["'`]/g;
const QUOTED = /["'`]([^"'`\n]*data\/research[^"'`\n]*)["'`]/g;

/**
 * The text with comments blanked out (newlines kept, so line numbers hold):
 * a path quoted in a doc comment is a citation, not a read.
 */
export function withoutComments(text: string): string {
  let out = "";
  let quote: string | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (quote) {
      out += char;
      if (char === "\\") {
        out += text[i + 1] ?? "";
        i += 1;
      } else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      out += char;
      continue;
    }
    if (char === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") {
        out += " ";
        i += 1;
      }
      out += text[i] ?? "";
      continue;
    }
    if (char === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end < 0 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop - 1;
      continue;
    }
    out += char;
  }
  return out;
}

/** A quoted path that only cites a source: a `#` anchor, or a source field. */
function isCitation(text: string, index: number, reference: string): boolean {
  if (reference.includes("#")) return true;
  const lineStart = text.lastIndexOf("\n", index) + 1;
  return /\b(?:source|citation|evidence|provenance|where)\w*\s*:\s*\[?\s*$/i.test(
    text.slice(lineStart, index),
  );
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

/** The repository path a quoted reference names, if it is under data/research. */
function researchPathOf(reference: string, fromFile: string): string | null {
  const cleaned = reference.split(/[?#]/)[0]!.replace(/\/+$/, "");
  if (cleaned.startsWith(".")) {
    const resolved = posix.normalize(
      posix.join(posix.dirname(fromFile), cleaned),
    );
    return resolved.startsWith("data/research") ? resolved : null;
  }
  const at = cleaned.indexOf("data/research");
  if (at < 0) return null;
  let path = cleaned.slice(at);
  const hole = path.indexOf("${");
  // A template hole means the file is chosen at run time from that folder.
  if (hole >= 0) path = path.slice(0, hole).replace(/\/[^/]*$/, "");
  return path.replace(/\/+$/, "");
}

/**
 * For every file under data/research, the non-test code files that read it.
 * `roots` are the code folders searched (the guard uses src and scripts).
 */
export function researchReaders(
  roots: readonly string[],
): ReadonlyMap<string, readonly DataReader[]> {
  const dataFiles = jsonFiles("data/research");
  const readers = new Map<string, DataReader[]>(
    dataFiles.map((file) => [file, []]),
  );
  const add = (data: string, reader: DataReader): void => {
    if (readers.has(data)) {
      readers.get(data)!.push(reader);
      return;
    }
    // A directory, or a template path chosen at run time inside one.
    const dir = join(REPO_ROOT, data);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
    for (const file of dataFiles)
      if (file.startsWith(`${data}/`))
        readers.get(file)!.push({ ...reader, how: "directory" });
  };
  for (const file of codeFiles(roots)) {
    const text = withoutComments(readFileSync(join(REPO_ROOT, file), "utf8"));
    if (!text.includes("data/research") && !text.includes(".json")) continue;
    const seen = new Set<string>();
    for (const match of text.matchAll(SPECIFIER)) {
      const data = researchPathOf(match[1]!, file);
      if (!data || seen.has(data)) continue;
      seen.add(data);
      add(data, { file, line: lineOf(text, match.index!), how: "import" });
    }
    for (const match of text.matchAll(QUOTED)) {
      if (isCitation(text, match.index!, match[1]!)) continue;
      const data = researchPathOf(match[1]!, file);
      if (!data || seen.has(data)) continue;
      seen.add(data);
      add(data, { file, line: lineOf(text, match.index!), how: "path" });
    }
  }
  return readers;
}
