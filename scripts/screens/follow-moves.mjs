/* global console, process */
/**
 * Screens item 6 (SC3 of docs/coordination/refactor/screens-2026-11-27.md): after Story takes the screens' word
 * files, every import of them points at where they went. Re-runnable on any state:
 *
 *   node scripts/screens/follow-moves.mjs          rewrite the imports
 *   node scripts/screens/follow-moves.mjs --check  list what it would rewrite, write nothing
 *   --base <ref>  a ref from before the move (default origin/main), where git finds each file's rename
 *
 * For each file in MOVED that is no longer at src/bench/<name>.ts, the script finds the one src file of that
 * name, then rewrites every relative import, re-export and dynamic import of the old path (in src, tests,
 * scripts and desktop) to the new one. A name with two candidates stops the script. The word files stay Story's:
 * this edits only the lines that import them.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const check = process.argv.includes("--check");
// The screens' word files (the CTO's 12:36 a.m. line, Nov 27): Story takes them under its E1 and E4.
const MOVED = [
  "printed-words",
  "archive-words",
  "race-words",
  "words",
  "guide-terms",
];
const FROM = "src/bench";

const tracked = execFileSync(
  "git",
  ["ls-files", "src", "tests", "scripts", "desktop"],
  { cwd: ROOT, encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean);
const moves = new Map(); // old path without extension -> new path without extension
const baseIndex = process.argv.indexOf("--base");
const BASE = baseIndex >= 0 ? process.argv[baseIndex + 1] : "origin/main";
// Where git saw each file go, against the base (a move with its history); the working tree counts too.
const renames = new Map();
for (const line of execFileSync(
  "git",
  ["diff", "-M", "--name-status", BASE, "--", "src"],
  { cwd: ROOT, encoding: "utf8" },
).split("\n")) {
  const [status, from, to] = line.split("\t");
  if (status?.startsWith("R") && to) renames.set(from, to);
}
for (const name of MOVED) {
  const old = `${FROM}/${name}`;
  if (existsSync(path.join(ROOT, `${old}.ts`))) continue;
  // The rename git recorded, else the one src file of that name (two of that name stop the script).
  const found = renames.has(`${old}.ts`)
    ? [renames.get(`${old}.ts`)]
    : tracked.filter(
        (f) => f.startsWith("src/") && new RegExp(`/${name}\\.ts$`).test(f),
      );
  if (found.length !== 1)
    throw new Error(
      `${name}.ts left ${FROM}, and ${found.length} files of that name exist: ${found.join(", ")}. Say where it went with --base <ref> (a ref from before the move).`,
    );
  moves.set(old, found[0].replace(/\.ts$/, ""));
}
if (!moves.size) {
  console.log("Nothing moved: every word file is still in src/bench.");
  process.exit(0);
}

const relative = (from, to) => {
  const r = path.posix.relative(path.posix.dirname(from), to);
  return r.startsWith(".") ? r : `./${r}`;
};
let rewrites = 0;
const changed = [];
for (const file of tracked.filter((f) => /\.(ts|tsx|mjs|mts)$/.test(f))) {
  const text = readFileSync(path.join(ROOT, file), "utf8");
  if (![...moves.keys()].some((old) => text.includes(path.posix.basename(old))))
    continue;
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  const edits = [];
  const consider = (literal) => {
    if (
      !literal ||
      !ts.isStringLiteralLike(literal) ||
      !literal.text.startsWith(".")
    )
      return;
    const resolved = path.posix
      .normalize(path.posix.join(path.posix.dirname(file), literal.text))
      .replace(/\.(ts|js|mjs)$/, "");
    const to = moves.get(resolved);
    if (!to) return;
    const extension = /\.(ts|js|mjs)$/.exec(literal.text)?.[0] ?? "";
    edits.push([
      literal.getStart() + 1,
      literal.getEnd() - 1,
      relative(file, to) + extension,
    ]);
  };
  const walk = (n) => {
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier
    )
      consider(n.moduleSpecifier);
    else if (
      ts.isCallExpression(n) &&
      n.expression.kind === ts.SyntaxKind.ImportKeyword
    )
      consider(n.arguments[0]);
    else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument))
      consider(n.argument.literal);
    n.forEachChild(walk);
  };
  walk(tree);
  if (!edits.length) continue;
  rewrites += edits.length;
  console.log(`${file}: ${edits.length}`);
  if (check) continue;
  let next = text;
  for (const [a, b, replacement] of edits.sort((x, y) => y[0] - x[0]))
    next = next.slice(0, a) + replacement + next.slice(b);
  writeFileSync(path.join(ROOT, file), next);
  changed.push(file);
}
console.log(
  `${[...moves].map(([o, n]) => `${o} -> ${n}`).join("; ")}: ${rewrites} import${rewrites === 1 ? "" : "s"} ${check ? "to rewrite" : "rewritten"}.`,
);
if (changed.length)
  execFileSync("npx", ["prettier", "--write", ...changed], {
    cwd: ROOT,
    stdio: "ignore",
  });
