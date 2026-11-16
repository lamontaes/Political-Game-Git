#!/usr/bin/env node
/* global console, process */
// Promote: copy a passing work-branch commit to main as ONE plain commit with
// every test file stripped (owner, Nov 15, 2026: "Two branches. All work and all
// tests go to a work branch, where every check runs. Main gets only the game:
// each time the work branch passes, its files are copied to main with every test
// file stripped. Builds come from main. Nothing is lost and the guards keep
// working."). Read docs/coordination/TWO-BRANCHES.md.
//
// What it does, in order, and stops at the first refusal:
//   1. Finds the work commit W (the checked-out HEAD, which must be clean and
//      must be the commit named by --work, default HEAD).
//   2. Reads the last promoted commit P from main's newest "Promote <sha>:"
//      message. W must be a descendant of P (never the same, never behind, never
//      a side branch). With no promote commit yet, W must descend from main's tip
//      (the first promotion, right after dev was cut from main).
//   3. Lists the test files with scripts/promote/test-files.mjs, run on W's tree.
//   4. Builds main's tree: W's tree, minus those paths, plus the main-side config
//      edits in MAIN_SIDE below (applied to the copy only; the work branch keeps
//      its own).
//   5. Makes ONE commit on top of main's current tip: no force, no history rewrite,
//      message "Promote <W>: the game without test files".
//   (With --find <work-sha>: print the main commit that carries that work commit
//   and exit 0, or exit 2 when main has none. Nothing is built or pushed.)
//   6. With --push, pushes it to main as a fast-forward and retries when main
//      moved. Without --push it only prints the commit and leaves it under
//      refs/promote/candidate for a look.
//
// Usage:  node scripts/promote/promote.mjs [--work <sha>] [--main <ref>] [--push] [--remote origin]
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { analyze } from "./test-files.mjs";

// Package scripts that cannot run on main although no removed path is named in
// them: `guards` starts the guard tests, which live on the work branch.
const SCRIPTS_ONLY_ON_WORK = ["guards"];

/** package.json for main: the version and every game script stay; a script that
 * runs a test runner, names a removed path, or runs another removed script goes. */
export function mainPackageJson(text, removed) {
  const pkg = JSON.parse(text);
  const gone = new Set(removed);
  const scripts = { ...pkg.scripts };
  const drops = (cmd) =>
    /\bvitest\b|--test\b|\bplaywright test\b/.test(cmd) ||
    cmd.split(/\s+/).some((w) => gone.has(w.replace(/^["']|["']$/g, "")));
  const dropped = new Set(SCRIPTS_ONLY_ON_WORK);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, cmd] of Object.entries(scripts)) {
      if (dropped.has(name)) continue;
      const viaScript = [...cmd.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)].some(
        (m) => dropped.has(m[1]),
      );
      if (drops(cmd) || viaScript) {
        dropped.add(name);
        changed = true;
      }
    }
  }
  for (const name of dropped) delete scripts[name];
  pkg.scripts = scripts;
  return JSON.stringify(pkg, null, 2) + "\n";
}

// Edits to the copy that goes to main, as { path, edit(text, removed) -> text }.
// Each one is here because the stripped tree needs it to build or check
// (docs/coordination/TWO-BRANCHES.md says which step showed it). The work branch
// is never edited. Part 2's run showed the tree builds, typechecks and passes
// zero-dice and release:check with no other edit; vite.config.ts and the tsconfig
// files still name test folders, which match nothing and do no harm.
// desktop/package.json keeps `test` (node --test "tests/**/*.test.mjs"), which
// points at files this step removes; the same edit drops it.
export const MAIN_SIDE = [
  { path: "package.json", edit: mainPackageJson },
  { path: "desktop/package.json", edit: mainPackageJson },
];

function git(root, args, opts = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1 << 28,
    ...opts,
  }).replace(/\n$/, "");
}

// The promote commit is the automation's, as the release commit is. A runner
// has no git identity of its own, so the commit names this one unless the
// caller's environment already names another.
const BOT_NAME = "github-actions[bot]";
const BOT_EMAIL = "41898282+github-actions[bot]@users.noreply.github.com";
export function withIdentity(env) {
  return {
    ...env,
    GIT_AUTHOR_NAME: env.GIT_AUTHOR_NAME || BOT_NAME,
    GIT_AUTHOR_EMAIL: env.GIT_AUTHOR_EMAIL || BOT_EMAIL,
    GIT_COMMITTER_NAME: env.GIT_COMMITTER_NAME || BOT_NAME,
    GIT_COMMITTER_EMAIL: env.GIT_COMMITTER_EMAIL || BOT_EMAIL,
  };
}

const MARK = /^Promote ([0-9a-f]{40}): the game without test files/;

/** The work commit main was last built from, or null when main has never been promoted to. */
export function lastPromoted(root, mainRef) {
  const out = git(root, [
    "log",
    mainRef,
    "--format=%H%x09%s",
    "--grep=^Promote [0-9a-f]\\{40\\}: ",
  ]);
  for (const line of out.split("\n").filter(Boolean)) {
    const [, subject] = line.split("\t");
    const m = MARK.exec(subject ?? "");
    if (m) return m[1];
  }
  return null;
}

/**
 * The main commit that carries exactly `work` (the commit whose subject is
 * "Promote <work>: ..."), or null when main holds no such commit. The release
 * package workflow packages that commit, and a rerun after a failure finds the
 * promote it already made here instead of making a second one.
 */
export function findPromoted(root, mainRef, work) {
  const out = git(root, [
    "log",
    mainRef,
    "--format=%H%x09%s",
    `--grep=^Promote ${work}: `,
  ]);
  for (const line of out.split("\n").filter(Boolean)) {
    const [hash, subject] = line.split("\t");
    const m = MARK.exec(subject ?? "");
    if (m && m[1] === work) return hash;
  }
  return null;
}

export function isAncestor(root, a, b) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", a, b], {
      cwd: root,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/** Builds main's tree from the work tree. Returns { tree, removed, edited }. */
export function buildTree(root, work) {
  const paths = analyze(root).all;
  const dir = mkdtempSync(path.join(tmpdir(), "promote-index-"));
  const env = { ...process.env, GIT_INDEX_FILE: path.join(dir, "index") };
  try {
    git(root, ["read-tree", work], { env });
    const present = new Set(
      git(root, ["ls-tree", "-r", "--name-only", work]).split("\n"),
    );
    const removed = paths.filter((p) => present.has(p));
    // 'update-index --force-remove' reads the paths from stdin, one per line.
    if (removed.length > 0) {
      execFileSync("git", ["update-index", "--force-remove", "-z", "--stdin"], {
        cwd: root,
        env,
        input: removed.join("\0") + "\0",
      });
    }
    const edited = [];
    for (const { path: p, edit } of MAIN_SIDE) {
      if (!present.has(p)) continue;
      const before = git(root, ["show", `${work}:${p}`]);
      const after = edit(before, removed);
      if (after === before) continue;
      const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
        cwd: root,
        input: after.endsWith("\n") ? after : after + "\n",
        encoding: "utf8",
      }).trim();
      git(
        root,
        ["update-index", "--add", "--cacheinfo", `100644,${blob},${p}`],
        { env },
      );
      edited.push(p);
    }
    const tree = git(root, ["write-tree"], { env });
    return { tree, removed, edited };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const top = (f) => (f.includes("/") ? f.slice(0, f.indexOf("/")) : "(root)");

function parse(argv) {
  const o = {
    work: "HEAD",
    main: null,
    push: false,
    remote: "origin",
    find: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--push") o.push = true;
    else if (a === "--work") o.work = argv[++i];
    else if (a === "--main") o.main = argv[++i];
    else if (a === "--remote") o.remote = argv[++i];
    else if (a === "--find") o.find = argv[++i];
    else throw new Error(`Unknown argument ${a}`);
  }
  o.main ??= `${o.remote}/main`;
  return o;
}

/** Brings the remote's main up to date; a checkout with no such remote (a test) skips it. */
function fetchMain(root, o) {
  let has = true;
  try {
    git(root, ["remote", "get-url", o.remote], { stdio: "pipe" });
  } catch {
    has = false;
  }
  if (has)
    git(root, ["fetch", "--no-tags", o.remote, "main"], { stdio: "pipe" });
}

export function promote(root, o, say = console.log) {
  if (git(root, ["status", "--porcelain", "--untracked-files=no"]) !== "") {
    throw new Error(
      "Refusing: the working tree has changes. Promote from a clean checkout of the work commit.",
    );
  }
  const work = git(root, ["rev-parse", "--verify", `${o.work}^{commit}`]);
  if (git(root, ["rev-parse", "HEAD"]) !== work) {
    throw new Error(
      `Refusing: HEAD is not ${work}. The test rule reads the checked-out files; check out the work commit first.`,
    );
  }
  fetchMain(root, o);
  const mainTip = git(root, ["rev-parse", "--verify", `${o.main}^{commit}`]);
  const last = lastPromoted(root, mainTip);
  const base = last ?? mainTip;
  if (work === base) {
    say(`Nothing to promote: main already holds ${work}.`);
    return null;
  }
  if (!isAncestor(root, base, work)) {
    throw new Error(
      last
        ? `Refusing: ${work} does not descend from the last promoted commit ${last}. Promote only moves forward.`
        : `Refusing: ${work} does not descend from main's tip ${mainTip}, and main has no promote commit yet. The work branch must be cut from main.`,
    );
  }
  return build(root, o, say, work, mainTip, last, 1);
}

function build(root, o, say, work, mainTip, last, attempt) {
  const { tree, removed, edited } = buildTree(root, work);
  const counts = new Map();
  for (const f of removed) counts.set(top(f), (counts.get(top(f)) ?? 0) + 1);
  const body = [
    `Promote ${work}: the game without test files`,
    "",
    `Work commit: ${work}`,
    `Previous promoted commit: ${last ?? "none (first promotion)"}`,
    `Test files removed: ${removed.length}`,
    ...[...counts].sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${v}  ${k}`),
    `Main-side edits: ${edited.length === 0 ? "none" : edited.join(", ")}`,
  ].join("\n");
  const commit = git(root, ["commit-tree", tree, "-p", mainTip, "-m", body], {
    env: withIdentity(process.env),
  });
  if (!isAncestor(root, mainTip, commit))
    throw new Error(
      "Internal error: the promote commit is not on top of main.",
    );
  git(root, ["update-ref", "refs/promote/candidate", commit]);
  say(body);
  say(`\nPromote commit: ${commit} (on top of main ${mainTip})`);
  if (!o.push) {
    say("Dry run: pushed nothing. Pass --push to push it to main.");
    return commit;
  }
  // A plain push of a fast-forward: git refuses it if main moved, and a retry
  // rebuilds on the new tip (only promotes move main).
  try {
    git(root, ["push", o.remote, `${commit}:refs/heads/main`], {
      stdio: "pipe",
    });
  } catch (e) {
    if (attempt >= 3) throw e;
    // Main moved (another promote). Look again from the new tip: the same
    // descent and one-commit rules apply, and nothing is forced.
    say(
      `Main moved during the push (attempt ${attempt}); building again on the new tip.`,
    );
    fetchMain(root, o);
    const tip = git(root, ["rev-parse", "--verify", `${o.main}^{commit}`]);
    const lastNow = lastPromoted(root, tip);
    if (lastNow === work) {
      say(`Main already holds ${work}.`);
      return null;
    }
    if (!isAncestor(root, lastNow ?? tip, work)) {
      throw new Error(
        `Refusing: ${work} no longer descends from what main was promoted from.`,
      );
    }
    return build(root, o, say, work, tip, lastNow, attempt + 1);
  }
  say(`Pushed ${commit} to ${o.remote}/main.`);
  return commit;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const o = parse(process.argv.slice(2));
    if (o.find) {
      if (!/^[0-9a-f]{40}$/.test(o.find))
        throw new Error("--find needs a full 40-character work commit sha.");
      fetchMain(process.cwd(), o);
      const found = findPromoted(process.cwd(), o.main, o.find);
      if (!found) process.exit(2);
      console.log(found);
    } else promote(process.cwd(), o);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
