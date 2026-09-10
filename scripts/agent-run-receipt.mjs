/* global console, process */
/**
 * Small mechanical run receipt for coding-agent command execution.
 *
 * Extends the checkout-identity checks already in scripts/agent-preflight.mjs
 * to a single command: it binds a command's outcome to the exact checkout AND
 * the exact source bytes it ran against, keeps a full local log, and never lets
 * a pipeline hide a failing exit code. A later `--verify` pass then refuses a
 * receipt that no longer matches HEAD, the branch, a passing exit code, or the
 * current source bytes — so an old run cannot be waved in front of changed code,
 * whether or not that change was committed.
 *
 * Record a run:
 *   node scripts/agent-run-receipt.mjs --stage <name> [--writes] [--out <dir>] -- <command> [args...]
 *
 * Verify a receipt still certifies the current checkout:
 *   node scripts/agent-run-receipt.mjs --verify <receipt.json> [--expect-branch <branch>]
 *
 * Command completion and source certification are separate facts. Every
 * receipt records whether the command succeeded. Only a check receipt (no
 * `--writes`) whose command succeeded AND left HEAD, branch and source identity
 * unchanged between its start and its end certifies that source. `--writes`
 * declares a rewriting operation (format:write, lint --fix, codegen): its
 * receipt preserves that the operation ran and how it exited, but never
 * certifies the output it wrote — a later check stage has to test that.
 *
 * Source identity is sampled twice per run (start and end) and once per
 * verify. It is not continuous: an edit made and reverted while the command
 * runs is invisible. It is a net-difference check, not a watcher.
 *
 * This script never edits, formats, lints, or tests anything itself — it only
 * wraps whatever command the caller names, so "format-check" vs
 * "format-write" (or lint vs typecheck vs test vs build) is whatever `--stage`
 * label, `--writes` declaration and command the caller supplies. It records
 * those; it does not infer them from the command line.
 */
import { spawn, execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  appendFileSync,
  readFileSync,
  lstatSync,
  readlinkSync,
  realpathSync,
} from "node:fs";
import { join, relative, resolve, isAbsolute, sep } from "node:path";

const SCHEMA_VERSION = 2;
const SOURCE_IDENTITY_VERSION = "ocd-source-identity-v1";
const DEFAULT_OUT_DIR = ".agent-receipts";

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(2);
}

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/agent-run-receipt.mjs --stage <name> [--writes] [--out <dir>] -- <command> [args...]",
      "  node scripts/agent-run-receipt.mjs --verify <receipt.json> [--expect-branch <branch>]",
    ].join("\n"),
  );
  process.exit(2);
}

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

/** Raw git output as bytes, for NUL-delimited listings whose paths may not be UTF-8. */
function gitBytes(args, cwd) {
  return execFileSync("git", ["--no-optional-locks", ...args], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 1024 * 1024 * 1024,
  });
}

/** The same checkout facts scripts/agent-preflight.mjs reports, gathered once per run. */
function checkoutIdentity() {
  const branch = git(["branch", "--show-current"]);
  const headSha = git(["rev-parse", "HEAD"]);
  const upstreamRef = git(["rev-parse", "--symbolic-full-name", "@{u}"]);
  const upstreamSha = upstreamRef ? git(["rev-parse", upstreamRef]) : null;
  const statusPorcelain = git(["status", "--porcelain"]) || "";
  const lines = statusPorcelain.length ? statusPorcelain.split("\n") : [];
  return {
    branch: branch || null,
    headSha: headSha || null,
    upstreamRef: upstreamRef || null,
    upstreamSha: upstreamSha || null,
    dirtyTrackedCount: lines.filter((l) => l && !l.startsWith("??")).length,
    untrackedCount: lines.filter((l) => l.startsWith("??")).length,
  };
}

function splitNul(buffer) {
  const fields = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0) {
      fields.push(buffer.subarray(start, i));
      start = i + 1;
    }
  }
  if (start < buffer.length) fields.push(buffer.subarray(start));
  return fields;
}

/**
 * The receipt directory, relative to the repository root, that the source
 * identity leaves out — otherwise writing the log would change the very source
 * identity it is recording. Refuses a directory that would hide real source:
 * the repository root itself, or any directory holding tracked files.
 */
function receiptExclusion(repoRoot, outDir) {
  // Both sides resolved through symlinks (macOS /var -> /private/var), since
  // git reports the repository root that way.
  const rel = relative(realpathSync(repoRoot), realpathSync(resolve(outDir)));
  if (rel.startsWith("..") || isAbsolute(rel)) return null; // outside the worktree
  return checkedExclusion(repoRoot, rel.split(sep).join("/"));
}

function checkedExclusion(repoRoot, rel) {
  if (rel === "")
    fail("--out must not be the repository root; receipts would hide source.");
  const tracked = gitBytes(
    ["--literal-pathspecs", "ls-files", "-z", "--", rel],
    repoRoot,
  );
  if (tracked.length > 0)
    fail(
      `receipt directory ${rel} contains tracked files; receipts must live in a dedicated directory.`,
    );
  return rel;
}

/**
 * Binary-safe identity of the source a command would read: the HEAD tree plus
 * the exact working-tree bytes of every path git reports as differing from it
 * (modified, staged, deleted, renamed, or untracked and not ignored). File
 * contents and paths are hashed as raw bytes — never decoded as text — so two
 * different binary edits cannot collapse to one identity, and an edit that
 * leaves the dirty-file count unchanged still changes the identity.
 *
 * Clean tracked files are covered by the HEAD tree, which relies on
 * `git status` to list any tracked path whose bytes differ (the same stat and
 * racy-timestamp handling git itself uses). Ignored files are not source.
 */
function sourceIdentity(excludeRel) {
  const repoRoot = git(["rev-parse", "--show-toplevel"]);
  const headTree = git(["rev-parse", "HEAD^{tree}"]);
  if (!repoRoot || !headTree) return null;

  const fields = splitNul(
    gitBytes(
      [
        "status",
        "--porcelain=v1",
        "-z",
        "--untracked-files=all",
        "--ignore-submodules=none",
      ],
      repoRoot,
    ),
  );
  const paths = [];
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (field.length < 4) continue;
    const xy = field.subarray(0, 2).toString("latin1");
    paths.push(field.subarray(3));
    // A rename or copy is followed by its original path as its own field.
    if (xy.includes("R") || xy.includes("C")) {
      if (i + 1 < fields.length) paths.push(fields[++i]);
    }
  }

  const excludePrefix = excludeRel ? Buffer.from(`${excludeRel}/`) : null;
  const unique = new Map();
  for (const path of paths) {
    if (
      excludePrefix &&
      path.length >= excludePrefix.length &&
      path.subarray(0, excludePrefix.length).equals(excludePrefix)
    )
      continue;
    unique.set(path.toString("hex"), path);
  }
  const sorted = [...unique.values()].sort(Buffer.compare);

  const rootBytes = Buffer.from(`${repoRoot}/`);
  const hash = createHash("sha256");
  hash.update(`${SOURCE_IDENTITY_VERSION}\0${headTree}\0`);
  for (const path of sorted) {
    const absolute = Buffer.concat([rootBytes, path]);
    let state;
    try {
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        state = `link:${createHash("sha256")
          .update(readlinkSync(absolute, { encoding: "buffer" }))
          .digest("hex")}`;
      } else if (stat.isFile()) {
        const mode = stat.mode & 0o111 ? "x" : "-";
        state = `file${mode}:${createHash("sha256").update(readFileSync(absolute)).digest("hex")}`;
      } else if (stat.isDirectory()) {
        // A nested repository or submodule: git reports only its path here.
        state = "dir";
      } else {
        state = "other";
      }
    } catch (err) {
      if (err && err.code === "ENOENT") state = "absent";
      else throw err;
    }
    hash.update(path);
    hash.update(`\0${state}\0`);
  }
  return {
    fingerprint: hash.digest("hex"),
    headTree,
    differingPathCount: sorted.length,
  };
}

function short(fingerprint) {
  return fingerprint ? fingerprint.slice(0, 12) : String(fingerprint);
}

function parseArgs(argv) {
  if (argv.includes("--verify")) {
    const idx = argv.indexOf("--verify");
    const receiptPath = argv[idx + 1];
    if (!receiptPath) usage();
    let expectBranch = null;
    const branchIdx = argv.indexOf("--expect-branch");
    if (branchIdx !== -1) expectBranch = argv[branchIdx + 1] || null;
    return { mode: "verify", receiptPath, expectBranch };
  }

  const dashIdx = argv.indexOf("--");
  if (dashIdx === -1 || dashIdx === argv.length - 1) usage();
  const head = argv.slice(0, dashIdx);
  const command = argv[dashIdx + 1];
  const commandArgs = argv.slice(dashIdx + 2);

  let stage = null;
  let outDir = DEFAULT_OUT_DIR;
  let writes = false;
  for (let i = 0; i < head.length; i++) {
    if (head[i] === "--stage") stage = head[++i];
    else if (head[i] === "--out") outDir = head[++i];
    else if (head[i] === "--writes") writes = true;
  }
  if (!stage)
    fail(
      "--stage <name> is required (e.g. format-check, format-write, lint, test).",
    );
  if (!command) usage();
  return { mode: "record", stage, outDir, writes, command, commandArgs };
}

function runRecord({ stage, outDir, writes, command, commandArgs }) {
  const before = checkoutIdentity();
  if (!before.headSha) fail("Not inside a valid git repository (no HEAD).");
  const repoRoot = git(["rev-parse", "--show-toplevel"]);
  // An empty directory is invisible to git, so creating it first cannot
  // change the source identity sampled below.
  mkdirSync(outDir, { recursive: true });
  const sourceExclude = receiptExclusion(repoRoot, outDir);
  const sourceBefore = sourceIdentity(sourceExclude);

  const logPath = join(outDir, `${stage}.log`);
  const receiptPath = join(outDir, `${stage}.json`);
  writeFileSync(logPath, "");

  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  const child = spawn(command, commandArgs, {
    stdio: ["inherit", "pipe", "pipe"],
  });

  // Duplicate the child's own bytes to our terminal and to the log file, so a
  // failure is seen live and still lives on disk afterward — no summarizing.
  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    try {
      appendFileSync(logPath, chunk);
    } catch {
      /* log capture is best-effort; never let it hide the real command output */
    }
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    try {
      appendFileSync(logPath, chunk);
    } catch {
      /* see above */
    }
  });

  child.on("close", (exitCode, signal) => {
    const finishedAt = new Date().toISOString();
    const after = checkoutIdentity();
    const sourceAfter = sourceIdentity(sourceExclude);
    const commandSucceeded = exitCode === 0;
    const sourceChangedAcrossRun =
      sourceBefore.fingerprint !== sourceAfter.fingerprint;

    const certificationBlockers = [];
    if (writes)
      certificationBlockers.push(
        "operation receipt (--writes): a rewriting command's output is not tested by the command that wrote it",
      );
    if (!commandSucceeded)
      certificationBlockers.push(
        `command did not succeed (exitCode=${exitCode}, signal=${signal || null})`,
      );
    if (after.headSha !== before.headSha)
      certificationBlockers.push(
        "HEAD moved while the command ran; this receipt certifies neither revision",
      );
    if (after.branch !== before.branch)
      certificationBlockers.push(
        `branch changed while the command ran (${before.branch} -> ${after.branch})`,
      );
    if (sourceChangedAcrossRun)
      certificationBlockers.push(
        `source identity at the end of the run (${short(sourceAfter.fingerprint)}) differs from its start (${short(sourceBefore.fingerprint)})`,
      );

    const receipt = {
      schemaVersion: SCHEMA_VERSION,
      stage,
      kind: writes ? "operation" : "check",
      command: [command, ...commandArgs].join(" "),
      startedAt,
      finishedAt,
      durationMs: Date.now() - startMs,
      branchBefore: before.branch,
      branch: after.branch,
      headShaBefore: before.headSha,
      headSha: after.headSha,
      upstreamRef: after.upstreamRef,
      upstreamSha: after.upstreamSha,
      dirtyTrackedCountBefore: before.dirtyTrackedCount,
      dirtyTrackedCountAfter: after.dirtyTrackedCount,
      sourceIdentityVersion: SOURCE_IDENTITY_VERSION,
      sourceExclude,
      sourceFingerprintBefore: sourceBefore.fingerprint,
      sourceFingerprintAfter: sourceAfter.fingerprint,
      sourceChangedAcrossRun,
      exitCode: exitCode === null ? null : exitCode,
      signal: signal || null,
      commandSucceeded,
      certifiesSource: certificationBlockers.length === 0,
      certificationBlockers,
      logPath,
    };

    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");

    const completion = commandSucceeded
      ? "command succeeded"
      : `command FAILED (exit ${exitCode === null ? `signal ${signal}` : exitCode})`;
    const certification = receipt.certifiesSource
      ? `certifies source ${short(sourceAfter.fingerprint)}`
      : "does NOT certify source";
    console.log(
      `\n[receipt] ${stage} (${receipt.kind}): ${completion}; ${certification} -> ${receiptPath}`,
    );

    // Propagate the child's own exit status exactly. A killing signal with no
    // exit code is reported as failure (1), never as success.
    process.exit(exitCode === null ? 1 : exitCode);
  });
}

function runVerify({ receiptPath, expectBranch }) {
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  } catch (err) {
    fail(`Could not read receipt at ${receiptPath}: ${err.message}`);
  }

  const current = checkoutIdentity();
  const reasons = [];

  if (receipt.schemaVersion !== SCHEMA_VERSION) {
    reasons.push(
      `receipt schemaVersion ${receipt.schemaVersion} predates binary-safe source identity; re-run the command to certify current source`,
    );
  }
  if (receipt.kind === "operation") {
    reasons.push(
      `operation receipt: it records that a rewriting command completed (exitCode=${receipt.exitCode}); it did not test the output it wrote and certifies no source — run a check stage`,
    );
  }
  if (!receipt.commandSucceeded || receipt.exitCode !== 0) {
    reasons.push(
      `receipt recorded a failing run (exitCode=${receipt.exitCode}); a failing command cannot certify anything`,
    );
  }
  if (receipt.kind !== "operation" && receipt.certifiesSource !== true) {
    const blockers = Array.isArray(receipt.certificationBlockers)
      ? receipt.certificationBlockers.join("; ")
      : "unknown";
    reasons.push(`receipt did not certify source when recorded: ${blockers}`);
  }
  if (receipt.headSha !== current.headSha) {
    reasons.push(
      `stale revision: receipt is for ${receipt.headSha}, current HEAD is ${current.headSha}`,
    );
  }
  if (receipt.schemaVersion === SCHEMA_VERSION) {
    const repoRoot = git(["rev-parse", "--show-toplevel"]);
    const exclude = receipt.sourceExclude
      ? checkedExclusion(repoRoot, receipt.sourceExclude)
      : null;
    const currentSource = sourceIdentity(exclude);
    if (
      !currentSource ||
      currentSource.fingerprint !== receipt.sourceFingerprintAfter
    ) {
      reasons.push(
        `source changed after the run: receipt is for source ${short(receipt.sourceFingerprintAfter)}, current source is ${short(currentSource && currentSource.fingerprint)}`,
      );
    }
  }
  if (expectBranch && receipt.branch !== expectBranch) {
    reasons.push(
      `wrong checkout: expected branch ${expectBranch}, receipt recorded ${receipt.branch}`,
    );
  }
  if (expectBranch && current.branch !== expectBranch) {
    reasons.push(
      `wrong checkout: expected branch ${expectBranch}, current branch is ${current.branch}`,
    );
  }

  if (reasons.length > 0) {
    console.error(`[receipt] ${receipt.stage || "unknown"}: STALE/INVALID`);
    for (const reason of reasons) console.error(`  - ${reason}`);
    process.exit(1);
  }

  console.log(
    `[receipt] ${receipt.stage}: VALID — certifies source ${short(receipt.sourceFingerprintAfter)} at ${current.headSha}`,
  );
  process.exit(0);
}

const args = parseArgs(process.argv.slice(2));
if (args.mode === "record") runRecord(args);
else runVerify(args);
