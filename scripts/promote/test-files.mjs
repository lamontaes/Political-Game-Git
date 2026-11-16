#!/usr/bin/env node
/* global console, process */
// The one rule for "a test file" (owner, Nov 15, 2026: "I just don't think test
// files should be on main"). The promote step (scripts/promote/promote.mjs) copies
// the work branch to main with every path this script lists removed.
//
// What counts:
//   1. A test by name or place: `*.test.*`, `*.spec.*`, `*.node-test.*`,
//      `*.browser.mjs`, and everything under `tests/` and `desktop/tests/`.
//   2. A test-only helper: a code file (not named like a test) that has at least
//      one referrer, and every referrer is a test file or another test-only helper.
//      A reference is an import, a dynamic import, `new URL(...)` or a path string
//      in code. `*-test-kit.ts`, `gov-test-clock.ts` and the like fall out of this.
//   3. A test fixture or baseline: a data file whose path says so (`fixtures/`,
//      `baseline`, `snapshot`) that only test files read.
//   4. The edge: a file the game side reaches is NOT a test file, even if its name
//      says test. The game side is every file that is not a test or test-only, plus
//      the entry points named in package.json files, workflows, config files and the
//      instruction files (AGENTS.md, skills, rules): a script someone runs by name
//      is tooling, not a test. `--kept` lists the test-named files this saves.
//   5. KEEP below: judged by hand; each line says why.
//
// Usage:
//   node scripts/promote/test-files.mjs                the paths, then the count by top folder (stderr)
//   node scripts/promote/test-files.mjs --paths        only the paths (what promote reads)
//   node scripts/promote/test-files.mjs --kept         test-named files kept, with who reaches each
//   node scripts/promote/test-files.mjs --root <dir>   read another checkout (default: the current one)
//
// Plain Node, no dependencies, so it runs before an install.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Judged by hand. A path here is never listed, whatever the rule says.
export const KEEP = new Map([
  [
    "desktop/scripts/smoke-test.mjs",
    "release-package.yml plays the packaged app with it; the apps are built from main",
  ],
  // The rule and the step that uses it are the game side's tooling, though the
  // rule's name says "test".
  ["scripts/promote/test-files.mjs", "the rule itself; promote.mjs imports it"],
]);

// Docs hold reproduction files and handoffs that quote tests; they are prose
// and stay (a pointer from a doc to a path must keep working).
const TEST_NAME =
  /(^|\/)[^/]*\.(test|spec|node-test)\.[cm]?[jt]sx?$|\.browser\.mjs$|(^|\/)test_[^/]*\.py$|(^|\/)[^/]*_test\.py$|(^|\/)[^/]*-test\.[cm]?js$/;
const TEST_FOLDER = /^(tests|desktop\/tests)\//;
const CODE_EXT = /\.(?:[cm]?[jt]sx?|html)$/;
const SCOPE = /^(src|scripts|data|tests|desktop|tooling)\//;
const FIXTURE_NAME =
  /(^|\/)(fixtures?|__fixtures__|__snapshots__)\/|baseline|snapshot/i;
const DATA_EXT = /\.(json|ya?ml|txt|csv|md|html)$/;
// A helper must say it is for tests: a name that says so (a kit, a fixture, a
// support file, a test clock, a world a test draws), a fixtures folder, or an
// import of a test runner. A game module that only its own test imports is the
// thing under test, not a test helper, and stays.
const HELPER_NAME = /(test|kit|fixture|support|harness|setup|world-with)/i;
const RUNNER_IMPORT =
  /from\s+["'](?:vitest|node:test|@playwright\/test|playwright)["']/;
const EXTS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
];
const STRING_RE = /(["'`])((?:\\.|(?!\1)[^\\\n]){2,300})\1/g;
const TOKEN_RE =
  /[A-Za-z0-9_@~./-]*[A-Za-z0-9_-]\.[A-Za-z0-9]{1,5}\b|[A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+/g;

// Files that start things or say how to run them. A reference from one of these
// to a test-named file never saves it (the strings stay; the promote step
// rewrites the scripts), but a reference to anything else is a game-side use.
function isConfig(f) {
  return (
    /(^|\/)package\.json$/.test(f) ||
    /^tsconfig[^/]*\.json$/.test(f) ||
    /(^|\/)tsconfig\.json$/.test(f) ||
    f === "vite.config.ts" ||
    f === "eslint.config.js" ||
    f.startsWith(".github/workflows/")
  );
}
// Instruction files: a script named here is tooling someone runs by name.
function isInstruction(f) {
  return (
    f === "AGENTS.md" ||
    f === "CLAUDE.md" ||
    f === "ARCHITECTURE.md" ||
    f.startsWith(".agents/") ||
    f.startsWith(".claude/") ||
    f.startsWith(".github/") ||
    f === "docs/pool/README.md" ||
    f === "docs/pool/START-A-BUILDER.md" ||
    f === "docs/pool/START-A-MERGER.md"
  );
}

export function isTestByName(f) {
  if (f.startsWith("docs/")) return false;
  return TEST_NAME.test(f) || TEST_FOLDER.test(f);
}

export function listTrackedFiles(root) {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  })
    .split("\0")
    .filter(Boolean);
}

export function analyze(root, files = listTrackedFiles(root)) {
  const fileSet = new Set(files);
  const byBase = new Map();
  for (const f of files) {
    if (!SCOPE.test(f) || !DATA_EXT.test(f) || !FIXTURE_NAME.test(f)) continue;
    const b = path.posix.basename(f);
    if (!byBase.has(b)) byBase.set(b, []);
    byBase.get(b).push(f);
  }

  function resolveSpec(from, spec, bare) {
    const out = [];
    const bases = [];
    const dir = path.posix.dirname(from);
    if (spec.startsWith("./") || spec.startsWith("../")) {
      bases.push(path.posix.normalize(path.posix.join(dir, spec)));
    } else if (/^[A-Za-z0-9_.-]+\//.test(spec) && !spec.startsWith("node:")) {
      bases.push(path.posix.normalize(spec));
      bases.push(path.posix.normalize(path.posix.join(dir, spec)));
    } else if (bare) {
      bases.push(path.posix.normalize(path.posix.join(dir, spec)));
    }
    for (const b0 of bases) {
      const b = b0.replace(/^\/+/, "");
      const noExt = b.replace(/\.(?:[cm]?js|jsx)$/, "");
      const cands = [b];
      for (const e of EXTS) cands.push(b + e, noExt + e, b + "/index" + e);
      for (const c of cands) if (fileSet.has(c)) out.push(c);
    }
    return out;
  }

  const refs = new Map(); // target -> Set(referrer), any kind of reference
  const imports = new Map(); // target -> Set(referrer), real imports only
  const addRef = (target, from, isImport) => {
    if (target === from) return;
    if (!refs.has(target)) refs.set(target, new Set());
    refs.get(target).add(from);
    if (isImport) {
      if (!imports.has(target)) imports.set(target, new Set());
      imports.get(target).add(from);
    }
  };

  for (const f of files) {
    const code = SCOPE.test(f) && CODE_EXT.test(f);
    const cfg = isConfig(f);
    const instr = isInstruction(f);
    if (!code && !cfg && !instr) continue;
    let text;
    try {
      text = readFileSync(path.join(root, f), "utf8");
    } catch {
      continue;
    }
    if (text.length > 4_000_000) continue;
    const bare = /(^|\/)package\.json$/.test(f);
    const strings = [];
    if (code || cfg) {
      STRING_RE.lastIndex = 0;
      let m;
      while ((m = STRING_RE.exec(text))) {
        // Real import: the quote follows `from`, `import`, `import(`, `require(`
        // or `new URL(`. Anything else is a path string (a runner's argument).
        const before = text.slice(Math.max(0, m.index - 24), m.index);
        const isImport =
          code &&
          /(?:\bfrom|\bimport|\brequire\s*\(|\bnew URL\s*\()\s*\(?\s*$/.test(
            before,
          );
        strings.push(isImport ? { s: m[2], imp: true } : m[2]);
      }
    }
    if (cfg || instr) {
      // Commands and prose: pull path-like words out of the whole text.
      for (const t of text.match(TOKEN_RE) ?? []) strings.push(t);
    }
    for (const item of strings) {
      const s = typeof item === "string" ? item : item.s;
      const imp = typeof item !== "string";
      if (s.length < 3 || s.includes("\n")) continue;
      // Words inside a longer string: a command line with a script path in it.
      const pieces = /\s/.test(s) ? s.split(/\s+/) : [s];
      for (const p of pieces) {
        for (const t of resolveSpec(f, p, bare)) addRef(t, f, imp);
        const last = p.split(/[\\/]/).pop();
        if (last && last.includes(".") && byBase.has(last)) {
          for (const t of byBase.get(last)) addRef(t, f, false);
        }
      }
    }
  }

  const referrers = (f) => refs.get(f) ?? new Set();
  const importers = (f) => imports.get(f) ?? new Set();
  const nameTest = files.filter((f) => isTestByName(f) && !KEEP.has(f));

  // Helpers: non-test-named code (or fixture-named data) files, with referrers,
  // every one a test or another helper. Greatest fixed point, then a file named
  // by a config or instruction file is taken back out.
  const helper = new Set();
  for (const f of files) {
    if (isTestByName(f) || KEEP.has(f) || !SCOPE.test(f)) continue;
    const isCode = CODE_EXT.test(f);
    const isFix = DATA_EXT.test(f) && FIXTURE_NAME.test(f);
    if (!isCode && !isFix) continue;
    if (referrers(f).size === 0) continue;
    if (isCode) {
      let named = HELPER_NAME.test(path.posix.basename(f));
      if (!named) {
        try {
          named = RUNNER_IMPORT.test(readFileSync(path.join(root, f), "utf8"));
        } catch {
          named = false;
        }
      }
      if (!named) continue;
    }
    helper.add(f);
  }
  const testSide = (f) => (isTestByName(f) && !KEEP.has(f)) || helper.has(f);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of [...helper]) {
      for (const from of referrers(f)) {
        if (!testSide(from)) {
          helper.delete(f);
          changed = true;
          break;
        }
      }
    }
  }

  // Test-named files the game side reaches stay. A package script, workflow or
  // config does not count (see isConfig); an instruction file does not count for
  // a test-named file either, since docs mention tests by name all the time.
  const stay = new Map([...KEEP].map(([f, why]) => [f, [why]]));
  const test = new Set(nameTest);
  let more = true;
  while (more) {
    more = false;
    for (const f of [...test]) {
      // Code is saved only by an import; a data file (a baseline) by any read.
      const reach = CODE_EXT.test(f) ? importers(f) : referrers(f);
      const game = [...reach].filter(
        (from) =>
          !isConfig(from) &&
          !isInstruction(from) &&
          !test.has(from) &&
          !helper.has(from) &&
          (stay.has(from) || !isTestByName(from)),
      );
      if (game.length > 0) {
        test.delete(f);
        stay.set(f, game);
        more = true;
      }
    }
    // Whatever a staying file reaches stays too.
    for (const f of [...helper]) {
      for (const from of referrers(f)) {
        if (stay.has(from) || !testSide(from)) {
          helper.delete(f);
          more = true;
          break;
        }
      }
    }
  }
  const all = [...new Set([...test, ...helper])].sort();
  return { tests: [...test].sort(), helpers: [...helper].sort(), all, stay };
}

const top = (f) => (f.includes("/") ? f.slice(0, f.indexOf("/")) : "(root)");

function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--root");
  const root = path.resolve(i >= 0 ? args[i + 1] : process.cwd());
  const { tests, helpers, all, stay } = analyze(root);
  if (args.includes("--kept")) {
    for (const [f, by] of [...stay].sort())
      console.log(`${f}  <-  ${by.slice(0, 3).join(", ")}`);
    return;
  }
  process.stdout.write(all.join("\n") + "\n");
  if (args.includes("--paths")) return;
  const counts = new Map();
  for (const f of all) counts.set(top(f), (counts.get(top(f)) ?? 0) + 1);
  console.error(`Test files by name or place: ${tests.length}`);
  console.error(`Test-only helpers and fixtures: ${helpers.length}`);
  console.error(`Total to remove from main: ${all.length}`);
  console.error(
    `Test-named files kept because the game side reaches them: ${stay.size}`,
  );
  console.error("By top folder:");
  for (const [k, v] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.error(`  ${String(v).padStart(5)}  ${k}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
