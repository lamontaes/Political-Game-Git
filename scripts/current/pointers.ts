// The scanner behind tests/guards/current-pointers.test.ts: which paths the
// repository's documents, rules, skills and code comments name, and which of
// them are not in the repository. Run with --write to set the guard's counts:
// node --import tsx scripts/current/pointers.ts --write
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Current } from "./write";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const data = JSON.parse(
  readFileSync(path.join(ROOT, "docs/current.json"), "utf8"),
) as Current;

/** Every tracked file, and every folder that holds one. */
export const tracked = execFileSync("git", ["ls-files", "-z"], {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 256 * 1024 * 1024,
})
  .split("\0")
  .filter(Boolean);
const files = new Set(tracked);
const folders = new Set<string>();
for (const file of tracked) {
  const parts = file.split("/");
  for (let n = 1; n < parts.length; n++)
    folders.add(parts.slice(0, n).join("/"));
}
export const exists = (p: string): boolean =>
  files.has(p) || folders.has(p.replace(/\/$/, ""));

/** The folders a pointer may start with: the repository's own top folders. */
const TOPS = [...new Set(tracked.map((file) => file.split("/")[0]!))].filter(
  (top) => folders.has(top),
);
const TOP = TOPS.map((top) => top.replace(/\./g, "\\.")).join("|");
const BACKTICKED = /`([^`\s]+)`( \(new\)| \(removed\))?/g;
/** The mark after a path that is known to be gone: its row on the replaced list says where it went. */
export const REMOVED_MARK = " (removed)";
const BARE = new RegExp(
  `(?<![\\w./-])((?:${TOP})/[\\w@./-]+\\.[a-z]{2,5})(?![\\w/-])`,
  "g",
);
const STARTS = new RegExp(`^(?:${TOP})/`);

/** A word as a repository path, or null when it is not one or is a pattern. */
export function asPath(word: string): string | null {
  const trimmed = word
    .replace(/[.,;:)]+$/, "")
    .replace(/#.*$/, "")
    .replace(/:\d+(?:[-:,]\d+)*$/, "")
    .replace(/\/$/, "");
  if (!STARTS.test(trimmed)) return null;
  if (/[<>*{}$[\]|]|\.\.\./.test(trimmed)) return null;
  return trimmed;
}

/** The paths a text names. In code, only comments are read, and a bare path with an extension counts. */
export function pathsNamed(text: string, code: boolean): string[] {
  const read = code
    ? text
        .split("\n")
        .filter((line) => /^\s*(\/\/|\/\*|\*)/.test(line))
        .join("\n")
    : text;
  const out = new Set<string>();
  for (const m of read.matchAll(BACKTICKED)) {
    const p = asPath(m[1]!);
    if (!p) continue;
    // " (new)" is a file an item will create. " (removed)" is a path the
    // replaced list covers: a reader is told it is gone and where to look.
    if (m[2] === " (new)") continue;
    if (m[2] === REMOVED_MARK && replacedNow(p) !== null) continue;
    out.add(p);
  }
  if (code)
    for (const m of read.matchAll(BARE)) {
      const p = asPath(m[1]!);
      if (!p) continue;
      const marked = read.startsWith(REMOVED_MARK, m.index + m[0].length);
      if (marked && replacedNow(p) !== null) continue;
      out.add(p);
    }
  return [...out];
}

const isRecord = (file: string): boolean =>
  data.records.some((r) => (r.endsWith("/") ? file.startsWith(r) : file === r));
export const CODE = /\.(ts|tsx|mjs|js|cjs)$/;
export const scanned = tracked.filter(
  (file) =>
    !isRecord(file) &&
    (file.endsWith(".md") ||
      (CODE.test(file) && /^(src|scripts|tests)\//.test(file))),
);

/** The area a file is counted in: docs by its folder, everything else by its top folder. */
export function areaOf(file: string): string {
  const parts = file.split("/");
  if (parts.length === 1) return "(top)";
  return parts[0] === "docs" && parts.length > 2
    ? `docs/${parts[1]}`
    : parts[0]!;
}

/** What stands in a replaced path's place, or null when the path is not on the replaced list. */
export function replacedNow(p: string): string | null {
  return (
    data.replaced.find((row) => p === row.old || p.startsWith(`${row.old}/`))
      ?.now ?? null
  );
}

/** For each area, the pointers that name nothing in the repository. */
export function deadPointers(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const file of scanned) {
    const text = readFileSync(path.join(ROOT, file), "utf8");
    for (const p of pathsNamed(text, CODE.test(file))) {
      if (exists(p)) continue;
      const now = replacedNow(p);
      (out[areaOf(file)] ??= []).push(
        `${file} names ${p}${now ? ` (replaced: ${now})` : ""}`,
      );
    }
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const found = deadPointers();
  const areas = Object.fromEntries(
    Object.keys(found)
      .sort()
      .map((area) => [area, found[area]!.length]),
  );
  const total = Object.values(areas).reduce((sum, n) => sum + n, 0);
  if (process.argv.includes("--write")) {
    writeFileSync(
      path.join(ROOT, "tests/guards/current-pointers-baseline.json"),
      `${JSON.stringify(
        {
          about:
            "For each area of the repository, how many pointers in its documents, rules, skills and code comments name a path that is not in the repository. tests/guards/current-pointers.test.ts holds each count: it may only go down, and an area not named here may hold none. Written by `node --import tsx scripts/current/pointers.ts --write`; write it only to lower a count.",
          total,
          areas,
        },
        null,
        2,
      )}\n`,
    );
    console.log(`Wrote the counts: ${total} pointers name nothing.`);
  } else {
    for (const [area, list] of Object.entries(found))
      for (const line of list) console.log(`${area}: ${line}`);
    console.log(`${total} pointers name nothing.`);
  }
}
