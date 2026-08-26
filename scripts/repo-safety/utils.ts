import crypto from "crypto";
import fs from "fs";
import { execSync } from "child_process";

export function execGit(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch {
    return "";
  }
}

export function getCurrentBranch(): string {
  return execGit("rev-parse --abbrev-ref HEAD");
}

export function getHeadSha(): string {
  return execGit("rev-parse HEAD");
}

export function getStagedFiles(): string[] {
  const output = execGit("diff --name-only --cached");
  return output ? output.split("\n").filter(Boolean) : [];
}

export function getUnstagedFiles(): string[] {
  const output = execGit("diff --name-only");
  return output ? output.split("\n").filter(Boolean) : [];
}

export function getUntrackedFiles(): string[] {
  const output = execGit("ls-files --others --exclude-standard");
  return output ? output.split("\n").filter(Boolean) : [];
}

export function getAllTrackedFiles(): string[] {
  const output = execGit("ls-files");
  return output ? output.split("\n").filter(Boolean) : [];
}

export function getFileSize(filePath: string): number {
  try {
    const stat = fs.statSync(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}

export function getFileHash(filePath: string): string {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash("sha256");
    hashSum.update(fileBuffer);
    return hashSum.digest("hex");
  } catch {
    return "";
  }
}

export function isIgnored(filePath: string): boolean {
  // check-ignore exits with 0 if ignored, 1 if not ignored
  // But execSync throws on exit code 1
  try {
    execSync(`git check-ignore -q "${filePath}"`);
    return true;
  } catch {
    return false;
  }
}
