import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(REPO_ROOT, "scripts", "agent-run-receipt.mjs");

/**
 * These tests never touch the real repository's checkout. Each test gets its
 * own disposable fixture git repo, so "wrong checkout" and "stale revision"
 * can be produced deterministically without disturbing this workspace.
 */
function makeFixtureRepo() {
  const dir = mkdtempSync(join(tmpdir(), "agent-run-receipt-"));
  const run = (args: string[]) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  run(["init", "--quiet", "--initial-branch=fixture-main"]);
  run(["config", "user.email", "fixture@example.com"]);
  run(["config", "user.name", "Fixture"]);
  writeFileSync(join(dir, "file.txt"), "one\n");
  run(["add", "."]);
  run(["commit", "--quiet", "-m", "initial"]);
  return dir;
}

function runReceipt(cwd: string, args: string[]) {
  return spawnSync("node", [SCRIPT, ...args], { cwd, encoding: "utf8" });
}

const cleanupDirs: string[] = [];
afterEach(() => {
  while (cleanupDirs.length > 0) {
    const dir = cleanupDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("agent-run-receipt: recording a command", () => {
  it("passes through a succeeding command's own exit code and marks the receipt PASS", () => {
    const dir = makeFixtureRepo();
    cleanupDirs.push(dir);

    const result = runReceipt(dir, [
      "--stage",
      "smoke",
      "--out",
      ".agent-receipts",
      "--",
      "node",
      "-e",
      "process.exit(0)",
    ]);

    expect(result.status).toBe(0);
    const receipt = JSON.parse(
      readFileSync(join(dir, ".agent-receipts", "smoke.json"), "utf8"),
    );
    expect(receipt.passed).toBe(true);
    expect(receipt.exitCode).toBe(0);
    expect(receipt.stage).toBe("smoke");
  });

  it("never masks a failing command: the wrapper's own exit code matches the child's, and the receipt records failure", () => {
    const dir = makeFixtureRepo();
    cleanupDirs.push(dir);

    const result = runReceipt(dir, [
      "--stage",
      "smoke-fail",
      "--out",
      ".agent-receipts",
      "--",
      "node",
      "-e",
      "process.exit(7)",
    ]);

    expect(result.status).toBe(7);
    const receipt = JSON.parse(
      readFileSync(join(dir, ".agent-receipts", "smoke-fail.json"), "utf8"),
    );
    expect(receipt.passed).toBe(false);
    expect(receipt.exitCode).toBe(7);
  });

  it("distinguishes a format-check stage from a format-write stage as separate receipts", () => {
    const dir = makeFixtureRepo();
    cleanupDirs.push(dir);

    runReceipt(dir, [
      "--stage",
      "format-check",
      "--out",
      ".agent-receipts",
      "--",
      "node",
      "-e",
      "process.exit(0)",
    ]);
    runReceipt(dir, [
      "--stage",
      "format-write",
      "--out",
      ".agent-receipts",
      "--",
      "node",
      "-e",
      "process.exit(0)",
    ]);

    const check = JSON.parse(
      readFileSync(join(dir, ".agent-receipts", "format-check.json"), "utf8"),
    );
    const write = JSON.parse(
      readFileSync(join(dir, ".agent-receipts", "format-write.json"), "utf8"),
    );
    expect(check.stage).toBe("format-check");
    expect(write.stage).toBe("format-write");
    expect(check.stage).not.toBe(write.stage);
  });

  it("keeps the full command output as a local log artifact rather than only a pass/fail summary", () => {
    const dir = makeFixtureRepo();
    cleanupDirs.push(dir);

    runReceipt(dir, [
      "--stage",
      "logged",
      "--out",
      ".agent-receipts",
      "--",
      "node",
      "-e",
      "console.log('needle-line-one'); console.error('needle-line-two'); process.exit(1)",
    ]);

    const log = readFileSync(
      join(dir, ".agent-receipts", "logged.log"),
      "utf8",
    );
    expect(log).toContain("needle-line-one");
    expect(log).toContain("needle-line-two");
  });
});

describe("agent-run-receipt: verifying a receipt", () => {
  it("rejects a stale receipt once HEAD has moved past the recorded revision", () => {
    const dir = makeFixtureRepo();
    cleanupDirs.push(dir);

    const record = runReceipt(dir, [
      "--stage",
      "stale-check",
      "--out",
      ".agent-receipts",
      "--",
      "node",
      "-e",
      "process.exit(0)",
    ]);
    expect(record.status).toBe(0);

    // Move HEAD without re-running the receipted command.
    writeFileSync(join(dir, "file.txt"), "two\n");
    execFileSync("git", ["commit", "--quiet", "-am", "second"], { cwd: dir });

    const verify = runReceipt(dir, [
      "--verify",
      join(".agent-receipts", "stale-check.json"),
    ]);
    expect(verify.status).not.toBe(0);
    expect(verify.stderr).toMatch(/stale revision/);
  });

  it("rejects a receipt recorded on a different branch than the one being certified", () => {
    const dir = makeFixtureRepo();
    cleanupDirs.push(dir);

    const record = runReceipt(dir, [
      "--stage",
      "branch-check",
      "--out",
      ".agent-receipts",
      "--",
      "node",
      "-e",
      "process.exit(0)",
    ]);
    expect(record.status).toBe(0);

    const verify = runReceipt(dir, [
      "--verify",
      join(".agent-receipts", "branch-check.json"),
      "--expect-branch",
      "some-other-branch",
    ]);
    expect(verify.status).not.toBe(0);
    expect(verify.stderr).toMatch(/wrong checkout/);
  });

  it("rejects a receipt from a failing run even when it is otherwise the current revision", () => {
    const dir = makeFixtureRepo();
    cleanupDirs.push(dir);

    runReceipt(dir, [
      "--stage",
      "fail-check",
      "--out",
      ".agent-receipts",
      "--",
      "node",
      "-e",
      "process.exit(1)",
    ]);

    const verify = runReceipt(dir, [
      "--verify",
      join(".agent-receipts", "fail-check.json"),
    ]);
    expect(verify.status).not.toBe(0);
    expect(verify.stderr).toMatch(/failing run/);
  });

  it("accepts a passing receipt that still matches the current revision and branch", () => {
    const dir = makeFixtureRepo();
    cleanupDirs.push(dir);

    runReceipt(dir, [
      "--stage",
      "good",
      "--out",
      ".agent-receipts",
      "--",
      "node",
      "-e",
      "process.exit(0)",
    ]);

    const verify = runReceipt(dir, [
      "--verify",
      join(".agent-receipts", "good.json"),
      "--expect-branch",
      "fixture-main",
    ]);
    expect(verify.status).toBe(0);
    expect(verify.stdout).toMatch(/VALID/);
  });
});
