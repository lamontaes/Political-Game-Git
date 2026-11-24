/* global console, process */
import { execSync } from "child_process";
import { statfsSync } from "node:fs";
import { createStorageGuard } from "./storage/storage-guard.mjs";

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
 * This WAS informational only, and the volume reached ENOSPC twice in one
 * night with preflight printing a number nobody had to act on. It is a gate
 * now: below the configured reserve, preflight fails. It still never deletes
 * anything, and reports "unavailable" rather than guessing when the platform
 * does not answer. `OCD_STORAGE_OVERRIDE="reason"` records a deliberate
 * bypass.
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
const storage = createStorageGuard();
const reserveBytes = storage.policy.freeSpaceReserveBytes;
console.log(
  capacity
    ? `Disk (workspace filesystem): ${formatBytes(capacity.free)} free of ${formatBytes(capacity.total)}; reserve ${formatBytes(reserveBytes)} (gate; preflight never cleans)`
    : "Disk (workspace filesystem): unavailable",
);
const registered = storage
  .registry()
  .workspaces.find(
    (entry) => entry.state === "active" && entry.path === workspace,
  );
console.log(
  registered
    ? `Registered workspace: ${registered.owner} (${registered.role})`
    : "Registered workspace: NO — this folder is not on the workspace map (npm run storage -- register)",
);
if (capacity && capacity.free < reserveBytes) {
  if (process.env.OCD_STORAGE_OVERRIDE) {
    console.warn(
      `WARNING: below the storage reserve; overridden: ${process.env.OCD_STORAGE_OVERRIDE}`,
    );
  } else {
    console.error(
      `Error: ${formatBytes(capacity.free)} free is below the ${formatBytes(reserveBytes)} storage reserve. Free space (npm run storage -- outputs, npm run storage -- status) before substantial work.`,
    );
    process.exit(3);
  }
}

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
