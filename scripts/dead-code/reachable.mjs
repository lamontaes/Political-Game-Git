import process from "node:process";
import console from "node:console";
// Walks static and dynamic imports (ts, tsx, mjs, js, json) from the new game's
// entry points and prints what is reachable. Also follows quoted repo paths
// that reachable code names as strings (data files).
// Usage: node scripts/dead-code/reachable.mjs [--json out.json]
import {
  readFileSync,
  existsSync,
  statSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const root = process.cwd();
const EXTS = [".ts", ".tsx", ".mts", ".mjs", ".js", ".json", ".css"];
const SKIP = new Set(["node_modules", ".git", "dist", "test-results"]);
const ENTRY_DIRS = [
  "src/bench",
  "src/core2",
  "src/director",
  "src/release",
  "src/rules",
  "tests/golden-path",
  "scripts/release",
];
const ENTRY_FILES = ["tooling/root-tsconfig-guard.ts"];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n)) continue;
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(relative(root, p));
  }
  return out;
}

function tryFile(base) {
  const cands = [
    base,
    ...EXTS.map((e) => base + e),
    ...EXTS.map((e) => join(base, "index" + e)),
  ];
  // .js specifier mapped to .ts
  if (base.endsWith(".js"))
    cands.push(base.slice(0, -3) + ".ts", base.slice(0, -3) + ".tsx");
  if (base.endsWith(".mjs")) cands.push(base.slice(0, -4) + ".mts");
  for (const c of cands) {
    if (existsSync(c) && statSync(c).isFile())
      return relative(root, resolve(c));
  }
  return null;
}

const IMPORT_RE =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*|\bnew URL\(\s*)["'`]([^"'`\n]+)["'`]/g;
const PATH_STR_RE =
  /["'`]((?:\.\.?\/)?(?:src|data|art|public|docs|scripts|tests|fixtures)\/[^"'`\n$]+?\.[a-z]{2,5})["'`]/g;

const DATA = /\.(json|csv|txt|md|png|jpg|jpeg|webp|svg|mjs|css)$/;
function refs(file) {
  if (file.endsWith(".json")) return new Set();
  const text = readFileSync(file, "utf8");
  const found = new Set();
  const dir = dirname(file);
  for (const m of text.matchAll(IMPORT_RE)) {
    const spec = m[1];
    if (spec.startsWith(".")) {
      const r = tryFile(resolve(dir, spec));
      if (r) found.add(r);
    }
  }
  for (const m of text.matchAll(PATH_STR_RE)) {
    const spec = m[1].replace(/^\.\.?\//, "");
    const r = tryFile(resolve(root, spec)) ?? tryFile(resolve(dir, m[1]));
    if (r && DATA.test(r)) found.add(r);
  }
  // import.meta.glob patterns
  for (const m of text.matchAll(
    /import\.meta\.glob\(\s*["'`]([^"'`]+)["'`]/g,
  )) {
    const g = m[1];
    const base = resolve(dir, g.replace(/\*.*$/, ""));
    if (existsSync(base) && statSync(base).isDirectory())
      for (const f of walk(relative(root, base))) found.add(f);
  }
  return found;
}

const CODE = /\.(ts|tsx|mts|mjs|js|json|css|html)$/;
const entries = new Set();
for (const d of ENTRY_DIRS) for (const f of walk(d)) entries.add(f);
for (const f of ENTRY_FILES) if (existsSync(f)) entries.add(f);
// html entries of the bench
for (const f of walk("src/bench")) if (f.endsWith(".html")) entries.add(f);

const seen = new Set();
const stack = [...entries];
const via = new Map();
while (stack.length) {
  const f = stack.pop();
  if (seen.has(f)) continue;
  seen.add(f);
  if (!CODE.test(f) && !f.endsWith(".html")) continue;
  if (f.endsWith(".json") && statSync(f).size > 5_000_000) continue;
  let rs;
  try {
    rs = refs(f);
  } catch {
    continue;
  }
  for (const r of rs)
    if (!seen.has(r)) {
      if (!via.has(r)) via.set(r, f);
      stack.push(r);
    }
}

// tests travel with the file they test: foo.test.ts reachable if foo.ts reachable
const all = walk("src");
const testOf = (f) => f.replace(/\.test\.(tsx?|mjs)$/, "");
for (const f of all) {
  if (/\.test\.(tsx?|mjs)$/.test(f)) {
    const stem = testOf(f);
    if (EXTS.some((e) => seen.has(stem + e))) seen.add(f);
  }
}

const OLD = [
  "simulation",
  "presentation",
  "player",
  "authoring",
  "districts",
  "education",
  "environment",
  "maps",
  "source",
  "content",
  "ui",
  "devtools",
  "connectivity",
  "persistence",
  "research",
  "r1-review",
  "fiscal-authority",
  "cli",
];
const byFolder = {};
for (const f of all) {
  const top = f.split("/")[1] ?? f;
  byFolder[top] ??= { total: 0, kept: 0 };
  byFolder[top].total++;
  if (seen.has(f)) byFolder[top].kept++;
}
console.log("| folder | files | reachable | unreachable |\n|---|---|---|---|");
for (const [k, v] of Object.entries(byFolder).sort())
  console.log(`| src/${k} | ${v.total} | ${v.kept} | ${v.total - v.kept} |`);
const keepOld = [...seen].filter((f) =>
  OLD.some((o) => f.startsWith(`src/${o}/`)),
);
if (process.argv.includes("--json")) {
  const out = process.argv[process.argv.indexOf("--json") + 1];
  writeFileSync(
    out,
    JSON.stringify(
      { reachable: [...seen].sort(), via: Object.fromEntries(via) },
      null,
      1,
    ),
  );
}
console.log(`\nold-folder files still reachable: ${keepOld.length}`);

// Delete list (a list only; this script never deletes): unreachable src files,
// plus tests/ and scripts/ files whose imports all land in that set.
if (process.argv.includes("--delete-list")) {
  const out = process.argv[process.argv.indexOf("--delete-list") + 1];
  // Scope: the old engine and old screens. The source pipeline, maps, art and
  // data tooling (src/source, maps, environment, devtools, ...) stay: they build
  // data, not the old game.
  const SCOPE =
    /^src\/(simulation|presentation|player|ui|authoring|content|r1-review|cli|persistence)\/|^src\/(App|main|review|art-desk-entry)\.tsx$|^src\/styles\.css$/;
  const del = new Set(all.filter((f) => !seen.has(f) && SCOPE.test(f)));
  const outside = [];
  for (const f of [...walk("tests"), ...walk("scripts")]) {
    if (!/\.(ts|tsx|mjs|js)$/.test(f) || entries.has(f)) continue;
    let rs;
    try {
      rs = refs(f);
    } catch {
      continue;
    }
    const hits = [...rs].filter((r) => del.has(r));
    const live = [...rs].filter((r) => r.startsWith("src/") && !del.has(r));
    if (
      hits.length &&
      !live.length &&
      !/^(scripts\/(source|maps|skill-ops)|tests\/source)\//.test(f)
    )
      outside.push(f);
  }
  writeFileSync(
    out,
    JSON.stringify({ src: [...del].sort(), outside: outside.sort() }, null, 1),
  );
  console.log(
    `delete list: ${del.size} src files, ${outside.length} tests/scripts files`,
  );
}
