/* global console, process */
/**
 * Small mechanical run receipt for coding-agent command execution.
 *
 * Extends the checkout-identity checks already in scripts/agent-preflight.mjs
 * to a single command: it binds a command's outcome to the exact checkout it
 * ran against, keeps a full local log, and never lets a pipeline hide a
 * failing exit code. A later `--verify` pass then refuses a receipt that no
 * longer matches HEAD, the branch, or a passing exit code — so an old run
 * cannot be waved in front of changed code.
 *
 * Record a run:
 *   node scripts/agent-run-receipt.mjs --stage <name> [--out <dir>] -- <command> [args...]
 *
 * Verify a receipt still certifies the current checkout:
 *   node scripts/agent-run-receipt.mjs --verify <receipt.json> [--expect-branch <branch>]
 *
 * This script never edits, formats, lints, or tests anything itself — it only
 * wraps whatever command the caller names, so "format-check" vs
 * "format-write" (or lint vs typecheck vs test vs build) is whatever `--stage`
 * label and command the caller supplies. It records the label; it does not
 * infer it from the command line.
 */
import { spawn, execFileSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  appendFileSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";

const SCHEMA_VERSION = 1;
const DEFAULT_OUT_DIR = ".agent-receipts";

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(2);
}

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/agent-run-receipt.mjs --stage <name> [--out <dir>] -- <command> [args...]",
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
  for (let i = 0; i < head.length; i++) {
    if (head[i] === "--stage") stage = head[++i];
    else if (head[i] === "--out") outDir = head[++i];
  }
  if (!stage)
    fail(
      "--stage <name> is required (e.g. format-check, format-write, lint, test).",
    );
  if (!command) usage();
  return { mode: "record", stage, outDir, command, commandArgs };
}

function runRecord({ stage, outDir, command, commandArgs }) {
  const before = checkoutIdentity();
  if (!before.headSha) fail("Not inside a valid git repository (no HEAD).");

  mkdirSync(outDir, { recursive: true });
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

    const receipt = {
      schemaVersion: SCHEMA_VERSION,
      stage,
      command: [command, ...commandArgs].join(" "),
      startedAt,
      finishedAt,
      durationMs: Date.now() - startMs,
      branch: after.branch,
      headSha: after.headSha,
      upstreamRef: after.upstreamRef,
      upstreamSha: after.upstreamSha,
      dirtyTrackedCountBefore: before.dirtyTrackedCount,
      dirtyTrackedCountAfter: after.dirtyTrackedCount,
      exitCode: exitCode === null ? null : exitCode,
      signal: signal || null,
      passed: exitCode === 0,
      logPath,
    };

    if (after.headSha !== before.headSha) {
      receipt.passed = false;
      receipt.note =
        "HEAD moved while the command ran; this receipt certifies neither revision.";
    }

    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");

    console.log(
      `\n[receipt] ${stage}: ${receipt.passed ? "PASS" : "FAIL"} -> ${receiptPath}`,
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

  if (!receipt.passed || receipt.exitCode !== 0) {
    reasons.push(
      `receipt recorded a failing run (exitCode=${receipt.exitCode}); a failing command cannot certify anything`,
    );
  }
  if (receipt.headSha !== current.headSha) {
    reasons.push(
      `stale revision: receipt is for ${receipt.headSha}, current HEAD is ${current.headSha}`,
    );
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
    `[receipt] ${receipt.stage}: VALID for current checkout (${current.headSha})`,
  );
  process.exit(0);
}

const args = parseArgs(process.argv.slice(2));
if (args.mode === "record") runRecord(args);
else runVerify(args);
