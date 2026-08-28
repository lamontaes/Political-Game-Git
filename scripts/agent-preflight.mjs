/* eslint-disable */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function runCmd(cmd) {
  try {
    return execSync(cmd, {
      stdio: ["pipe", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch (err) {
    return null;
  }
}

function runCmdThrow(cmd) {
  return execSync(cmd, {
    stdio: ["pipe", "pipe", "ignore"],
    encoding: "utf8",
  }).trim();
}

console.log("POLITICAL GAME AGENT PREFLIGHT\n");

// Check valid git repo
try {
  runCmdThrow("git rev-parse --is-inside-work-tree");
} catch (e) {
  console.error("Error: Not inside a valid git repository.");
  process.exit(1);
}

const workspace = process.cwd();
console.log(`Workspace: ${workspace}`);

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
