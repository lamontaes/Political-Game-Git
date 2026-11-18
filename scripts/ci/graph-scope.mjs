/* global console, process */
/**
 * Which pull requests need a whole-game check (owner, Nov 18: "There's only
 * certain things that need to run the golden path and stuff. I don't understand
 * why that's happening for literally every single one."; CTO, #9747).
 *
 * A whole-game check (golden path, played year, paired performance, new game)
 * runs for a pull request only when the pull request changes a file that check
 * plays. The set of such files is read from the entry points' own import
 * graph, so it cannot go stale:
 *
 *  - every relative `import`, `export ... from`, `import()` and `require()`
 *    in a code file, with `.js` read as `.ts` and a folder read as its index;
 *  - every string that names a tracked file, or a folder (every file under
 *    it), in a code file or in a small JSON file the walk reaches: the data
 *    files a module reads and the commands the golden path's feature list
 *    runs (`vitest run <files>`, `node --import tsx <file>`);
 *  - a template import (`import(`./x/${y}.ts`)`) names its folder up to the
 *    first `${`, and every file under it counts;
 *  - an `npm run <script>` names the files in that package.json script.
 *
 * Anything it cannot tell fails safe: the check runs. A change to
 * package.json, the lock file, a tsconfig, the Vite config, the check's own
 * workflow or this script always runs it. Tracked files come from
 * `git ls-files`, so a sparse checkout that leaves most files out still
 * resolves them; content is read only where the file is checked out.
 *
 *   node scripts/ci/graph-scope.mjs --entries "a b" [--always "p q"] < changed-files
 *
 * prints `run=true|false` and `reason=...` for $GITHUB_OUTPUT.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CODE = /\.(?:[cm]?[jt]sx?)$/;
const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs", ".cjs", ".json"];
const SMALL_JSON = 300_000;
/** Always-run paths: the toolchain every check builds on. */
export const TOOLCHAIN = [
  "package.json",
  "package-lock.json",
  "vite.config.ts",
  "scripts/ci/graph-scope.mjs",
];

const norm = (p) => p.split(path.sep).join("/");

/** The tracked files of a checkout, from git, so a sparse checkout still resolves. */
export function trackedFiles(root) {
  return new Set(
    execFileSync("git", ["ls-files", "-z"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1 << 30,
    })
      .split("\0")
      .filter(Boolean),
  );
}

/** What a spec (an import path or a string) names, as tracked files, from a file's folder. */
function resolveSpec(spec, from, tracked, byFolder, folders = true) {
  const out = new Set();
  if (
    !spec ||
    spec.length > 300 ||
    /[\s*{}<>|;&]/.test(spec.replace(/\$\{[^}]*\}.*/s, ""))
  )
    return out;
  const cut = spec.indexOf("${");
  const prefix = cut === -1 ? spec : spec.slice(0, cut);
  const bases = [];
  if (prefix.startsWith("./") || prefix.startsWith("../"))
    bases.push(norm(path.posix.join(path.posix.dirname(from), prefix)));
  else if (
    prefix.includes("/") &&
    !prefix.startsWith("@") &&
    !/^[a-z]+:/i.test(prefix)
  )
    bases.push(norm(path.posix.normalize(prefix)));
  for (const base of bases) {
    if (base.startsWith("..") || base === "" || base === ".") continue;
    if (cut !== -1) {
      const folder = base.endsWith("/") ? base : path.posix.dirname(base) + "/";
      if (folders && folder.length > 1 && !DEAD.test(folder))
        for (const f of byFolder(folder)) out.add(f);
      continue;
    }
    const candidates = [
      base,
      base.replace(/\.js$/, ".ts"),
      base.replace(/\.js$/, ".tsx"),
      base.replace(/\.mjs$/, ".mts"),
      ...EXTENSIONS.map((e) => base + e),
      ...EXTENSIONS.map((e) => `${base}/index${e}`),
    ];
    const hit = candidates.find((c) => tracked.has(c));
    if (hit) out.add(hit);
    else if (
      folders &&
      !DEAD.test(base + "/") &&
      (!base.includes(".") || base.endsWith("/"))
    ) {
      const folder = base.endsWith("/") ? base : base + "/";
      for (const f of byFolder(folder)) out.add(f);
    }
  }
  return out;
}

/** Changes that never need a whole-game check, even where a test reads the file (owner, Nov 18). */
const NEVER_PLAYED =
  /\.md$|^(?:\.agents|\.claude|art)\/|^docs\/(?:pool|release|seen|reports|coordination|archive)\//;
const TEST_FILE = /\.(?:test|node-test|bench)\.[cm]?[jt]sx?$/;
/** Folders a walk never expands: prose, pictures, skills and notes are not what a check plays. */
const DEAD =
  /^(?:docs|art|\.agents|\.claude|\.github|data\/(?:source|research)|assets|public)\//;
const IMPORT_SPECS = [
  /\bfrom\s*["'`]([^"'`]+)["'`]/g,
  /\bimport\s*\(\s*["'`]([^"'`]+)["'`]/g,
  /\brequire\s*\(\s*["'`]([^"'`]+)["'`]/g,
  /\bimport\s+["'`]([^"'`]+)["'`]/g,
];
const STRING = /["'`]([^"'`\n]{3,300})["'`]/g;
const NPM_RUN = /npm\s+run\s+([\w:.-]+)/g;

/** The files a set of entry points (and everything they reach) can read. */
export function reachableFrom(root, entries, tracked = trackedFiles(root)) {
  const folders = new Map();
  const byFolder = (folder) => {
    if (!folders.has("*")) folders.set("*", [...tracked]);
    return folders
      .get("*")
      .filter((f) => f.startsWith(folder) && !TEST_FILE.test(f));
  };
  let scripts = {};
  try {
    scripts =
      JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
        .scripts ?? {};
  } catch {
    scripts = {};
  }
  const seen = new Set();
  const queue = [];
  const add = (file) => {
    if (!seen.has(file)) {
      seen.add(file);
      queue.push(file);
    }
  };
  for (const entry of entries) {
    if (entry.endsWith("/")) for (const f of byFolder(entry)) add(f);
    else if (tracked.has(entry)) add(entry);
  }
  while (queue.length) {
    const file = queue.pop();
    const abs = path.join(root, file);
    const isCode = CODE.test(file) && !file.endsWith(".json");
    const isJson = file.endsWith(".json");
    if (!isCode && !isJson) continue;
    let text;
    try {
      if (!existsSync(abs)) continue;
      if (isJson && statSync(abs).size > SMALL_JSON) continue;
      text = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const specs = new Set();
    if (file === "docs/roadmap/features.json") {
      const commands = [];
      (function walk(v) {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object")
          for (const [k, x] of Object.entries(v))
            if (k === "command" && typeof x === "string") commands.push(x);
            else walk(x);
      })(JSON.parse(text));
      text = commands.map((c) => JSON.stringify(c)).join("\n");
    }
    if (isCode)
      for (const re of IMPORT_SPECS)
        for (const m of text.matchAll(re)) specs.add(m[1]);
    for (const m of text.matchAll(STRING)) {
      const value = m[1];
      specs.add(value);
      // A command line names files by word: "vitest run a.test.ts b.test.ts".
      if (/\s/.test(value) && /[\w-]\.(?:[cm]?[jt]sx?|json)\b/.test(value))
        for (const word of value.split(/\s+/))
          specs.add(word.replace(/^["']|["']$/g, ""));
      for (const n of value.matchAll(NPM_RUN)) {
        const body = scripts[n[1]];
        if (body) for (const word of body.split(/\s+/)) specs.add(word);
      }
    }
    for (const spec of specs)
      for (const hit of resolveSpec(spec, file, tracked, byFolder, isCode))
        add(hit);
    // A bare path from the repository root (the common form in feature lists).
    for (const spec of specs) {
      if (spec.includes("/") && !spec.startsWith(".")) {
        const hit = resolveSpec("./" + spec, "x", tracked, byFolder, isCode);
        for (const f of hit) add(f);
      }
    }
  }
  return seen;
}

/**
 * Whether a change needs the check. `changed` are repository-relative paths.
 * `always` are paths or folders (ending in `/`) that always count.
 */
export function scopeFor({ root, entries, changed, always = [], tracked }) {
  const files = changed.map(norm).filter(Boolean);
  if (!files.length) return { run: true, reason: "no changed-file list" };
  const must = [...TOOLCHAIN, ...always];
  for (const file of files)
    for (const rule of must)
      if (rule.endsWith("/") ? file.startsWith(rule) : file === rule)
        return { run: true, reason: `${file} is always checked (${rule})` };
  if (files.some((f) => /^tsconfig.*\.json$/.test(f)))
    return { run: true, reason: "a tsconfig changed" };
  let graph;
  try {
    graph = reachableFrom(root, entries, tracked ?? trackedFiles(root));
  } catch (error) {
    return {
      run: true,
      reason: `graph unreadable: ${String(error).slice(0, 120)}`,
    };
  }
  const hit = files.find((f) => graph.has(f) && !NEVER_PLAYED.test(f));
  return hit
    ? { run: true, reason: `${hit} is in the files this check plays` }
    : {
        run: false,
        reason: `none of ${files.length} changed files is in the ${graph.size} files this check plays`,
      };
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const args = process.argv.slice(2);
  const value = (name) => {
    const at = args.indexOf(name);
    return at === -1 ? "" : (args[at + 1] ?? "");
  };
  const list = (text) => text.split(/\s+/).filter(Boolean);
  const changed = readFileSync(0, "utf8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const root = path.resolve(value("--root") || ".");
  const result = scopeFor({
    root,
    entries: list(value("--entries")),
    always: list(value("--always")),
    changed,
  });
  console.log(`run=${result.run}`);
  console.log(`reason=${result.reason}`);
}
