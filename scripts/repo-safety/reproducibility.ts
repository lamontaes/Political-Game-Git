import { execSync } from "child_process";
import { getUnstagedFiles, getUntrackedFiles, execGit } from "./utils";
import { SAFETY_CONFIG } from "./config";
import path from "path";

export interface CommandResult {
  command: string;
  success: boolean;
  error?: string;
}

export interface ReproducibilityResult {
  success: boolean;
  commandResults: CommandResult[];
  unexpectedChanges: string[];
  diffBasis: string;
}

export function checkReproducibility(): ReproducibilityResult {
  // Diff basis is HEAD
  const diffBasis = execGit("rev-parse HEAD");

  // Track state before running tools
  const preUnstaged = getUnstagedFiles();
  const preUntracked = getUntrackedFiles();

  const commands = [
    "npm run validate:art",
    "npm run inventory:art",
    "npm run qa:art",
  ];

  const commandResults: CommandResult[] = [];
  let overallSuccess = true;

  for (const cmd of commands) {
    try {
      execSync(cmd, { stdio: "ignore" });
      commandResults.push({
        command: cmd,
        success: true,
      });
    } catch (e) {
      overallSuccess = false;
      commandResults.push({
        command: cmd,
        success: false,
        error: e instanceof Error ? e.message : "Command failed",
      });
      break; // Stop executing on first failure
    }
  }

  const postUnstaged = getUnstagedFiles();
  const postUntracked = getUntrackedFiles();

  // Find newly modified tracked files (must not exist)
  const newUnstaged = postUnstaged.filter((f) => !preUnstaged.includes(f));

  // Find newly untracked files
  const newUntracked = postUntracked.filter((f) => !preUntracked.includes(f));

  // If a file is in an ALLOWED_GENERATED_PATHS, it's allowed to be generated as an untracked/unstaged output
  const unexpectedChanges = [...newUnstaged, ...newUntracked].filter((file) => {
    return !SAFETY_CONFIG.ALLOWED_GENERATED_PATHS.some(
      (allowedPath) =>
        file.startsWith(allowedPath + "/") ||
        file.startsWith(allowedPath + path.sep),
    );
  });

  if (unexpectedChanges.length > 0) {
    overallSuccess = false;
  }

  return {
    success: overallSuccess,
    commandResults,
    unexpectedChanges,
    diffBasis,
  };
}
