/* global console, process */
import { execSync } from "child_process";
import { statfsSync } from "node:fs";

function runCmd(cmd) {
  try {
    return execSync(cmd, {
      stdio: ["pipe", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

function runCmdThrow(cmd) {
  return execSync(cmd, {
    stdio: ["pipe", "pipe", "ignore"],
    encoding: "utf8",
  }).trim();
}

function formatBytes(bytes) {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/**
 * Free space on the filesystem holding the workspace.
 *
 * Informational only. Large test and source runs have repeatedly hit ENOSPC
 * here, and the useful thing is seeing that coming — not a gate. This never
 * fails preflight, never deletes anything, and reports "unavailable" rather
 * than guessing when the platform does not answer.
 */
function diskCapacity(path) {
  try {
    const stats = statfsSync(path);
    const total = stats.blocks * stats.bsize;
    const free = stats.bavail * stats.bsize;
    if (!Number.isFinite(total) || !Number.isFinite(free) || total <= 0) {
      return null;
    }
    return { free, total };
  } catch {
    return null;
  }
}

console.log("OUR CIVIC DUTY AGENT PREFLIGHT\n");

// Check valid git repo
try {
  runCmdThrow("git rev-parse --is-inside-work-tree");
} catch {
  console.error("Error: Not inside a valid git repository.");
  process.exit(1);
}

const workspace = process.cwd();
console.log(`Workspace: ${workspace}`);

const capacity = diskCapacity(workspace);
console.log(
  capacity
    ? `Disk (workspace filesystem): ${formatBytes(capacity.free)} free of ${formatBytes(capacity.total)} (informational; preflight does not gate or clean)`
    : "Disk (workspace filesystem): unavailable",
);

const branch = runCmd("git branch --show-current");
if (!branch) {
  console.error("Error: Detached HEAD or no branch.");
  process.exit(1);
}
console.log(`Branch: ${branch}`);

const head = runCmd("git rev-parse HEAD");
console.log(`Local HEAD: ${head}`);

const upstreamRef = runCmd(`git rev-parse --symbolic-full-name @{u}`) || "NONE";
console.log(`Remote tracking ref: ${upstreamRef}`);

let upstreamSha = "unavailable";
if (upstreamRef !== "NONE") {
  upstreamSha = runCmd(`git rev-parse ${upstreamRef}`) || "unavailable";
}
console.log(`Remote tracking SHA: ${upstreamSha}`);

const statusPorcelain = runCmd("git status --porcelain");
const statusLines = statusPorcelain ? statusPorcelain.split("\n") : [];
const dirtyTracked = statusLines.filter((line) => !line.startsWith("??"));
const untracked = statusLines.filter((line) => line.startsWith("??"));

console.log("\nDirty tracked files:");
console.log(`${dirtyTracked.length} files`);
if (dirtyTracked.length > 0) {
  console.log(dirtyTracked.join("\n"));
  console.warn("WARNING: You have dirty tracked files.");
}

console.log("\nUntracked files:");
console.log(`${untracked.length} files`);
if (untracked.length > 0) {
  console.log(untracked.join("\n"));
  console.warn("WARNING: You have untracked files.");
}

console.log("\nWorktrees:");
const worktrees = runCmd("git worktree list --porcelain");
console.log(worktrees);

const worktreeLines = worktrees ? worktrees.split("\n") : [];
let currentBranchWorktreeCount = 0;
for (const line of worktreeLines) {
  if (line.startsWith("branch refs/heads/")) {
    const wBranch = line.substring("branch refs/heads/".length);
    if (wBranch === branch) {
      currentBranchWorktreeCount++;
    }
  }
}

if (upstreamRef === "NONE") {
  console.warn("\nWARNING: No upstream branch exists.");
}

if (currentBranchWorktreeCount > 1) {
  console.warn(
    `\nWARNING: Another worktree is using the same branch (${branch}).`,
  );
}

console.log(`\nNode:\n${process.version}`);
const npmVersion = runCmd("npm --version");
console.log(`\nnpm:\n${npmVersion || "unavailable"}`);
