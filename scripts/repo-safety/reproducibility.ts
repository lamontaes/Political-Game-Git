import { execSync } from "child_process";
import { getUnstagedFiles, getUntrackedFiles, execGit } from "./utils";
import { SAFETY_CONFIG } from "./config";
import path from "path";

export interface ReproducibilityResult {
  success: boolean;
  commandsExecuted: string[];
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

  for (const cmd of commands) {
    try {
      execSync(cmd, { stdio: "ignore" });
    } catch {
      return {
        success: false,
        commandsExecuted: commands,
        unexpectedChanges: ["Command execution failed"],
        diffBasis,
      };
    }
  }

  const postUnstaged = getUnstagedFiles();
  const postUntracked = getUntrackedFiles();

  // Find newly modified tracked files (must not exist)
  const newUnstaged = postUnstaged.filter((f) => !preUnstaged.includes(f));

  // Find newly untracked files
  const newUntracked = postUntracked.filter((f) => !preUntracked.includes(f));

  // If a file is in an ALLOWED_GENERATED_PATHS, it's allowed to be generated as an untracked/unstaged output
  // We filter those out so they don't cause failures.
  const unexpectedChanges = [...newUnstaged, ...newUntracked].filter((file) => {
    return !SAFETY_CONFIG.ALLOWED_GENERATED_PATHS.some(
      (allowedPath) =>
        file.startsWith(allowedPath + "/") ||
        file.startsWith(allowedPath + path.sep),
    );
  });

  return {
    success: unexpectedChanges.length === 0,
    commandsExecuted: commands,
    unexpectedChanges,
    diffBasis,
  };
}
