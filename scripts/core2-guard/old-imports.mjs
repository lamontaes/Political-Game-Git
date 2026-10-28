/* global console, process */
// Lists what still keeps the old engine folders (src/simulation, src/presentation) alive:
// every file outside them that imports one (directly), grouped by folder, and how many of the old
// files are reachable from the files outside. A file in the old folders that nothing outside
// reaches is deletable. Usage: node scripts/core2-guard/old-imports.mjs [--dead] [--fail]
//   --dead  also print the unreachable old files
//   --fail  exit 1 while any old file is reachable from outside (the item's done line)
// Every run also refuses a new importer: a file outside the old folders that imports one and is
// not listed in old-imports-baseline.json fails the run (owner, Oct 28: no new twin of what the
// new core does). A listed file that stops importing must leave the list, so it only shrinks.
//   --write-baseline  rewrite the list from the tree (only to shrink it)
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ts = createRequire(import.meta.url)("typescript");
const OLD = ["src/simulation/", "src/presentation/"];
const files = execSync("git ls-files", { maxBuffer: 1e9 })
  .toString()
  .split("\n")
  .filter(Boolean);
const set = new Set(files);
const exts = [
  "",
  ".ts",
  ".tsx",
  ".mts",
  ".js",
  ".mjs",
  ".json",
  "/index.ts",
  "/index.tsx",
  "/index.js",
];
const isOld = (file) => OLD.some((dir) => file.startsWith(dir));

function resolve(from, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(from), spec),
  );
  for (const stem of [base, base.replace(/\.(js|mjs)$/, "")])
    for (const ext of exts) if (set.has(stem + ext)) return stem + ext;
  return null;
}

const edges = new Map();
for (const file of files.filter((f) => /\.(ts|tsx|mts|mjs|js|cjs)$/.test(f))) {
  const source = readFileSync(file, "utf8");
  const found = ts
    .preProcessFile(source, true, true)
    .importedFiles.map((i) => i.fileName);
  for (const m of source.matchAll(/["'`](\.\.?\/[^"'`\n]*)["'`]/g))
    found.push(m[1]);
  edges.set(file, [
    ...new Set(found.map((spec) => resolve(file, spec)).filter(Boolean)),
  ]);
}

const outside = files.filter((f) => !isOld(f));
const reached = new Set(outside);
const stack = outside.filter((f) => edges.has(f));
while (stack.length) {
  for (const next of edges.get(stack.pop()) ?? [])
    if (!reached.has(next)) {
      reached.add(next);
      stack.push(next);
    }
}

const old = files.filter(isOld);
const dead = old.filter((f) => !reached.has(f));
const direct = new Map();
for (const file of outside)
  for (const next of edges.get(file) ?? [])
    if (isOld(next)) {
      const group = file.split("/").slice(0, 2).join("/");
      direct.set(group, (direct.get(group) ?? new Set()).add(file));
    }
console.log(
  `old files ${old.length}; reachable from outside ${old.length - dead.length}; unreachable ${dead.length}`,
);
console.log("files outside the old folders that import them, by folder:");
for (const [group, importers] of [...direct].sort(
  (a, b) => b[1].size - a[1].size,
))
  console.log(`  ${group}: ${importers.size}`);
if (process.argv.includes("--dead")) console.log(dead.join("\n"));

const baselinePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "old-imports-baseline.json",
);
const importers = [...direct.values()].flatMap((s) => [...s]).sort();
if (process.argv.includes("--write-baseline"))
  writeFileSync(baselinePath, JSON.stringify(importers, null, 2) + "\n");
const baseline = new Set(JSON.parse(readFileSync(baselinePath, "utf8")));
const added = importers.filter((f) => !baseline.has(f));
const gone = [...baseline].filter((f) => !importers.includes(f));
for (const f of added)
  console.log(
    `NEW old-engine importer: ${f}. Use src/core2 (or port what it needs there); never add an importer.`,
  );
for (const f of gone)
  console.log(
    `${f} no longer imports the old folders: drop it from scripts/core2-guard/old-imports-baseline.json.`,
  );
if (added.length || gone.length) process.exitCode = 1;
if (process.argv.includes("--fail") && old.length - dead.length > 0)
  process.exit(1);
