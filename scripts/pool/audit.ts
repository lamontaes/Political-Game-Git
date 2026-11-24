// `npm run pool -- audit [--out <file>]`: one JSON row for every open, gated and blocked item. Changes nothing.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseFrontMatter } from "./index";
import { lacks, pathsIn, repoAt, type Repo } from "./standard";

export interface AuditRow {
  id: string;
  status: string;
  /** Whether the item carries `standard: 2` and passes the check is the check's job; this is the marker. */
  standard: boolean;
  /** Required fields and sections the item lacks. */
  lacks: string[];
  /** Paths the item names that no longer exist. */
  missingPaths: string[];
  /** Backticked function or file names that a search of src/, scripts/ and data/ does not find. */
  missingNames: string[];
  lead: string;
  size: string;
  /** Date of the last commit that touched the item, or null outside a git checkout. */
  lastChange: string | null;
}

const SEARCH_DIRS = ["src", "scripts", "data"];
const TEXT = /\.(?:ts|tsx|mts|cts|js|mjs|cjs|json|md|csv|txt|ya?ml)$/;
const SKIP = new Set(["node_modules", ".git"]);

function* textFiles(dir: string): Generator<string> {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) yield* textFiles(p);
    else if (TEXT.test(e)) yield p;
  }
}

/** Which of `names` appear as a whole word in a text file under src/, scripts/ or data/. */
export function namesFound(root: string, names: Set<string>): Set<string> {
  const found = new Set<string>();
  if (!names.size) return found;
  for (const d of SEARCH_DIRS)
    for (const file of textFiles(join(root, d))) {
      let text: string;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      for (const m of text.matchAll(/[A-Za-z_$][\w$]{3,}/g))
        if (names.has(m[0])) found.add(m[0]);
      if (found.size === names.size) return found;
    }
  return found;
}

const FILE_NAME = /^[\w.-]+\.(?:ts|tsx|mjs|js|json|md|yml|yaml)$/;
const FUNCTION_NAME =
  /^(?:[A-Za-z_$][\w$]*\(\)|[a-z][a-z0-9]*[A-Z][\w$]*|[a-z][a-z0-9]*(?:_[a-z0-9]+)+)$/;

/** Backticked names in an item body: function names, and file names without a folder. */
export function namesIn(body: string): {
  functions: string[];
  files: string[];
} {
  const functions = new Set<string>();
  const files = new Set<string>();
  for (const m of body.matchAll(/`([^`\n]+)`/g)) {
    const t = m[1].trim();
    if (FILE_NAME.test(t)) files.add(t);
    else if (FUNCTION_NAME.test(t)) functions.add(t.replace(/\(\)$/, ""));
  }
  return { functions: [...functions], files: [...files] };
}

/** Last commit date of each item file, newest first from one git log. Empty outside a git checkout. */
export function lastChanges(root: string): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(join(root, ".git"))) return out;
  try {
    const log = execFileSync(
      "git",
      [
        "-C",
        root,
        "log",
        "--format=%x00%cI",
        "--name-only",
        "--",
        "docs/pool/items",
      ],
      { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 },
    );
    let date = "";
    for (const line of log.split("\n")) {
      if (line.startsWith("\u0000")) date = line.slice(1);
      else if (line && date && !out.has(line)) out.set(line, date);
    }
  } catch {
    /* no dates */
  }
  return out;
}

const baseNames = (repo: Repo): Set<string> => {
  const names = new Set<string>();
  const walk = (dir: string): void => {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const e of entries) {
      if (SKIP.has(e)) continue;
      names.add(e);
      const p = join(dir, e);
      try {
        if (statSync(p).isDirectory()) walk(p);
      } catch {
        /* skip */
      }
    }
  };
  for (const d of SEARCH_DIRS) walk(join(repo.root, d));
  return names;
};

/** Reads every open, gated and blocked item under `poolDir` and reports one row each. */
export function auditPool(
  poolDir: string,
  opts: { dates?: Map<string, string> } = {},
): AuditRow[] {
  const root = join(poolDir, "..", "..");
  const repo = repoAt(root);
  const dir = join(poolDir, "items");
  const files = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .sort()
    : [];
  const items = files.flatMap((f) => {
    const text = readFileSync(join(dir, f), "utf8");
    const fm = parseFrontMatter(text);
    return fm ? [{ file: f, fm, text }] : [];
  });
  const open = items.filter(({ fm }) =>
    ["open", "blocked"].includes(fm.status),
  );
  const names = open.map(({ text }) =>
    namesIn(text.replace(/^---\r?\n[\s\S]*?\r?\n---/, "")),
  );
  const wanted = new Set(names.flatMap((n) => n.functions));
  const found = namesFound(root, wanted);
  const base = baseNames(repo);
  const dates = opts.dates ?? lastChanges(root);
  return open.map(({ file, fm, text }, k) => {
    const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
    const missingPaths = [
      ...new Set(
        pathsIn(body, repo)
          .filter(
            (p) => p.path.includes("/") && !p.isNew && !repo.exists(p.path),
          )
          .map((p) => p.path),
      ),
    ];
    const missingNames = [
      ...names[k].functions.filter((n) => !found.has(n)),
      ...names[k].files.filter((n) => !base.has(n) && !repo.exists(n)),
    ];
    return {
      id: fm.id ?? file.replace(/\.md$/, ""),
      status: fm.status,
      standard: fm.standard === "2",
      lacks: lacks(fm, text),
      missingPaths,
      missingNames,
      lead: fm.lead ?? "",
      size: fm.size || "M",
      lastChange: dates.get(`docs/pool/items/${file}`) ?? null,
    };
  });
}
