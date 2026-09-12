import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
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
  // As in this repository: the receipt directory is gitignored, so receipts
  // are never source in the first place.
  writeFileSync(join(dir, ".gitignore"), ".agent-receipts/\n");
  run(["add", "."]);
  run(["commit", "--quiet", "-m", "initial"]);
  return dir;
}

function runReceipt(cwd: string, args: string[]) {
  return spawnSync("node", [SCRIPT, ...args], { cwd, encoding: "utf8" });
}

function record(
  cwd: string,
  stage: string,
  script: string,
  extra: string[] = [],
) {
  return runReceipt(cwd, [
    "--stage",
    stage,
    ...extra,
    "--out",
    ".agent-receipts",
    "--",
    "node",
    "-e",
    script,
  ]);
}

function readReceipt(cwd: string, stage: string) {
  return JSON.parse(
    readFileSync(join(cwd, ".agent-receipts", `${stage}.json`), "utf8"),
  );
}

function verify(cwd: string, stage: string) {
  return runReceipt(cwd, [
    "--verify",
    join(".agent-receipts", `${stage}.json`),
  ]);
}

function dirtyTrackedCount(cwd: string) {
  return execFileSync("git", ["status", "--porcelain"], {
    cwd,
    encoding: "utf8",
  })
    .split("\n")
    .filter((line) => line && !line.startsWith("??")).length;
}

const cleanupDirs: string[] = [];
afterEach(() => {
  while (cleanupDirs.length > 0) {
    const dir = cleanupDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

const RECEIPT_TIMEOUT_MS = 90_000;

describe(
  "agent-run-receipt: recording a command",
  { timeout: RECEIPT_TIMEOUT_MS },
  () => {
    it("passes through a succeeding command's own exit code and records both command success and source certification", () => {
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
      expect(receipt.commandSucceeded).toBe(true);
      expect(receipt.certifiesSource).toBe(true);
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
      expect(receipt.commandSucceeded).toBe(false);
      expect(receipt.certifiesSource).toBe(false);
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
  },
);

describe(
  "agent-run-receipt: verifying a receipt",
  { timeout: RECEIPT_TIMEOUT_MS },
  () => {
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

    it("refuses a receipt written before source identity existed (schemaVersion 1)", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      expect(record(dir, "legacy", "process.exit(0)").status).toBe(0);
      const receiptPath = join(dir, ".agent-receipts", "legacy.json");
      const legacy = { ...readReceipt(dir, "legacy"), schemaVersion: 1 };
      writeFileSync(receiptPath, JSON.stringify(legacy));

      const result = verify(dir, "legacy");
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/predates binary-safe source identity/);
    });
  },
);

describe(
  "agent-run-receipt: source identity (EFF-R1)",
  { timeout: RECEIPT_TIMEOUT_MS },
  () => {
    it("rejects a passing receipt when source bytes change after the run without HEAD moving, even at the same dirty-file count", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      writeFileSync(join(dir, "file.txt"), "dirty-a\n");
      expect(record(dir, "test", "process.exit(0)").status).toBe(0);
      expect(readReceipt(dir, "test").certifiesSource).toBe(true);
      expect(verify(dir, "test").status).toBe(0);

      const headBefore = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: dir,
        encoding: "utf8",
      });
      writeFileSync(join(dir, "file.txt"), "dirty-b\n");

      // The control the old receipt relied on cannot see this edit.
      expect(dirtyTrackedCount(dir)).toBe(
        readReceipt(dir, "test").dirtyTrackedCountAfter,
      );
      expect(
        execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: dir,
          encoding: "utf8",
        }),
      ).toBe(headBefore);

      const result = verify(dir, "test");
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/source changed after the run/);
    });

    it("hashes raw bytes: two binary edits that decode to the same UTF-8 text still differ", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);
      const binary = join(dir, "asset.bin");
      writeFileSync(binary, Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]));
      execFileSync("git", ["add", "asset.bin"], { cwd: dir });
      execFileSync("git", ["commit", "--quiet", "-m", "binary"], { cwd: dir });

      const first = Buffer.from([0xff, 0x00, 0x41]);
      const second = Buffer.from([0xfe, 0x00, 0x41]);
      // Both are invalid UTF-8 and decode to the same replacement text, so a
      // text-decoded identity would call them equal.
      expect(first.toString("utf8")).toBe(second.toString("utf8"));

      writeFileSync(binary, first);
      expect(record(dir, "test", "process.exit(0)").status).toBe(0);
      expect(verify(dir, "test").status).toBe(0);

      writeFileSync(binary, second);
      const result = verify(dir, "test");
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/source changed after the run/);
    });

    it("rejects a passing receipt once a new untracked source file appears", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      expect(record(dir, "test", "process.exit(0)").status).toBe(0);
      writeFileSync(join(dir, "new-source.ts"), "export const x = 1;\n");

      const result = verify(dir, "test");
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/source changed after the run/);
    });

    it("does not invalidate on index-only changes: staging identical bytes leaves the source identity unchanged", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      writeFileSync(join(dir, "file.txt"), "dirty-a\n");
      expect(record(dir, "test", "process.exit(0)").status).toBe(0);
      execFileSync("git", ["add", "file.txt"], { cwd: dir });

      expect(verify(dir, "test").status).toBe(0);
    });

    it("keeps command completion separate from certification: a check command that rewrites source succeeds but certifies nothing", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      const result = record(
        dir,
        "test",
        "require('fs').writeFileSync('file.txt', 'rewritten during run\\n')",
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(
        /command succeeded; does NOT certify source/,
      );

      const receipt = readReceipt(dir, "test");
      expect(receipt.kind).toBe("check");
      expect(receipt.commandSucceeded).toBe(true);
      expect(receipt.exitCode).toBe(0);
      expect(receipt.sourceChangedAcrossRun).toBe(true);
      expect(receipt.certifiesSource).toBe(false);

      const verified = verify(dir, "test");
      expect(verified.status).not.toBe(0);
      expect(verified.stderr).toMatch(/did not certify source when recorded/);
    });

    it("preserves a --writes operation receipt without treating its rewritten output as tested; a later check certifies it", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      const write = record(
        dir,
        "format-write",
        "require('fs').writeFileSync('file.txt', 'formatted\\n')",
        ["--writes"],
      );
      expect(write.status).toBe(0);
      const operation = readReceipt(dir, "format-write");
      expect(operation.kind).toBe("operation");
      expect(operation.commandSucceeded).toBe(true);
      expect(operation.sourceChangedAcrossRun).toBe(true);
      expect(operation.certifiesSource).toBe(false);

      const refused = verify(dir, "format-write");
      expect(refused.status).not.toBe(0);
      expect(refused.stderr).toMatch(/operation receipt/);

      // The rewritten bytes are certified only by a check that actually ran on them.
      expect(record(dir, "format-check", "process.exit(0)").status).toBe(0);
      expect(verify(dir, "format-check").status).toBe(0);
      expect(verify(dir, "format-write").status).not.toBe(0);
    });

    it("still propagates a failing --writes operation's exit code", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      const result = record(dir, "format-write", "process.exit(3)", [
        "--writes",
      ]);
      expect(result.status).toBe(3);
      const receipt = readReceipt(dir, "format-write");
      expect(receipt.exitCode).toBe(3);
      expect(receipt.commandSucceeded).toBe(false);
      expect(receipt.certifiesSource).toBe(false);
    });

    it("refuses a receipt directory that holds tracked files, since it is left out of the source identity", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      const result = runReceipt(dir, [
        "--stage",
        "test",
        "--out",
        ".",
        "--",
        "node",
        "-e",
        "process.exit(0)",
      ]);
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/must not be the repository root/);

      mkdirSync(join(dir, "tracked-dir"));
      writeFileSync(join(dir, "tracked-dir", "keep.txt"), "x\n");
      execFileSync("git", ["add", "."], { cwd: dir });
      execFileSync("git", ["commit", "--quiet", "-m", "tracked dir"], {
        cwd: dir,
      });
      const tracked = runReceipt(dir, [
        "--stage",
        "test",
        "--out",
        "tracked-dir",
        "--",
        "node",
        "-e",
        "process.exit(0)",
      ]);
      expect(tracked.status).toBe(2);
      expect(tracked.stderr).toMatch(/contains tracked files/);
    });
  },
);

describe(
  "agent-run-receipt: the output directory cannot hide source (EFF-R2)",
  { timeout: RECEIPT_TIMEOUT_MS },
  () => {
    it("refuses an output directory that already holds untracked non-ignored source", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      mkdirSync(join(dir, "hidey"));
      writeFileSync(join(dir, "hidey", "source.ts"), "export const x = 1;\n");

      const result = runReceipt(dir, [
        "--stage",
        "test",
        "--out",
        "hidey",
        "--",
        "node",
        "-e",
        "process.exit(0)",
      ]);

      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(
        /contains untracked source git does not ignore/,
      );
    });

    it("refuses such a directory nested under a tracked directory, where no tracked file sits in the output directory itself", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      mkdirSync(join(dir, "pkg"));
      writeFileSync(join(dir, "pkg", "tracked.txt"), "kept\n");
      execFileSync("git", ["add", "."], { cwd: dir });
      execFileSync("git", ["commit", "--quiet", "-m", "pkg"], { cwd: dir });
      mkdirSync(join(dir, "pkg", "receipts"));
      writeFileSync(join(dir, "pkg", "receipts", "source.ts"), "export {};\n");

      const result = runReceipt(dir, [
        "--stage",
        "test",
        "--out",
        "pkg/receipts",
        "--",
        "node",
        "-e",
        "process.exit(0)",
      ]);

      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(
        /contains untracked source git does not ignore/,
      );
    });

    it("keeps certifying across its own receipt and log in a non-ignored output directory, but refuses once source is added there afterwards", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      const recorded = runReceipt(dir, [
        "--stage",
        "test",
        "--out",
        "receipts-dir",
        "--",
        "node",
        "-e",
        "process.exit(0)",
      ]);
      expect(recorded.status).toBe(0);
      const receipt = JSON.parse(
        readFileSync(join(dir, "receipts-dir", "test.json"), "utf8"),
      );
      expect(receipt.certifiesSource).toBe(true);
      expect(receipt.sourceExcludePaths).toEqual([
        "receipts-dir/test.json",
        "receipts-dir/test.log",
      ]);

      // The run's own two artifacts are the only thing left out, so a directory
      // that is not gitignored still verifies.
      const valid = runReceipt(dir, [
        "--verify",
        join("receipts-dir", "test.json"),
      ]);
      expect(valid.status).toBe(0);

      // Source dropped into that same directory afterwards is still source.
      writeFileSync(
        join(dir, "receipts-dir", "added.ts"),
        "export const y = 2;\n",
      );
      const refused = runReceipt(dir, [
        "--verify",
        join("receipts-dir", "test.json"),
      ]);
      expect(refused.status).not.toBe(0);
      expect(refused.stderr).toMatch(/source changed after the run/);
    });

    it("resolves a symlinked output directory rather than letting the link bypass the rule", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      mkdirSync(join(dir, "real-out"));
      symlinkSync("real-out", join(dir, "link-out"));

      // Recorded through the link, the exclusion names the resolved path.
      const recorded = runReceipt(dir, [
        "--stage",
        "test",
        "--out",
        "link-out",
        "--",
        "node",
        "-e",
        "process.exit(0)",
      ]);
      expect(recorded.status).toBe(0);
      const receipt = JSON.parse(
        readFileSync(join(dir, "real-out", "test.json"), "utf8"),
      );
      expect(receipt.sourceExcludePaths).toEqual([
        "real-out/test.json",
        "real-out/test.log",
      ]);
      expect(
        runReceipt(dir, ["--verify", join("real-out", "test.json")]).status,
      ).toBe(0);

      // Source behind the link is still source.
      writeFileSync(
        join(dir, "real-out", "source.ts"),
        "export const z = 3;\n",
      );
      const refused = runReceipt(dir, [
        "--verify",
        join("real-out", "test.json"),
      ]);
      expect(refused.status).not.toBe(0);
      expect(refused.stderr).toMatch(/source changed after the run/);

      // And the link cannot be used to reach a directory already holding source.
      const blocked = runReceipt(dir, [
        "--stage",
        "second",
        "--out",
        "link-out",
        "--",
        "node",
        "-e",
        "process.exit(0)",
      ]);
      expect(blocked.status).toBe(2);
      expect(blocked.stderr).toMatch(
        /contains untracked source git does not ignore/,
      );
    });

    it("refuses a receipt that claims to have excluded a path it does not own", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      expect(record(dir, "test", "process.exit(0)").status).toBe(0);
      expect(verify(dir, "test").status).toBe(0);

      const receiptPath = join(dir, ".agent-receipts", "test.json");
      const forged = {
        ...readReceipt(dir, "test"),
        sourceExcludePaths: ["src", ".agent-receipts/test.log"],
      };
      writeFileSync(receiptPath, JSON.stringify(forged));

      const result = verify(dir, "test");
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/claims to exclude paths it does not own/);
    });

    it("refuses a same-basename exclusion claimed from a different directory (EFF157)", () => {
      // The exclusion-ownership check must bind to this receipt's real,
      // on-disk directory, not merely to a path that shares its stage's
      // basename. Otherwise real tampering landed under a same-named path
      // elsewhere in the tree could be "excluded" away by editing the
      // receipt's own claimed sourceExcludePaths, and the fingerprint would
      // recompute clean.
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      expect(record(dir, "check", "process.exit(0)").status).toBe(0);
      expect(verify(dir, "check").status).toBe(0);

      // Real tampering: an untracked file lands elsewhere in the tree with
      // the SAME basename as this stage's own receipt.
      mkdirSync(join(dir, "src"), { recursive: true });
      writeFileSync(join(dir, "src", "check.json"), '{"tampered":true}\n');

      // Preserve the original control: unmodified, this is caught normally.
      const caught = verify(dir, "check");
      expect(caught.status).not.toBe(0);
      expect(caught.stderr).toMatch(/source changed after the run/);

      // Forge the exclusion list to name the tampered file by its matching
      // basename, in a directory this receipt does not live in.
      const receiptPath = join(dir, ".agent-receipts", "check.json");
      const forged = {
        ...readReceipt(dir, "check"),
        sourceExcludePaths: ["src/check.json", ".agent-receipts/check.log"],
      };
      writeFileSync(receiptPath, JSON.stringify(forged));

      const result = verify(dir, "check");
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/claims to exclude paths it does not own/);
      expect(result.stderr).toMatch(/may only exclude/);
    });

    it("refuses a receipt relocated to a different directory, even with an untouched fingerprint", () => {
      // Binding exclusion ownership to receiptPath's real directory means a
      // receipt that is copied or moved somewhere else stops matching its own
      // claimed exclusions, even though nothing inside the JSON changed.
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      expect(record(dir, "test", "process.exit(0)").status).toBe(0);
      expect(verify(dir, "test").status).toBe(0);

      // Copied under the already-gitignored receipts directory, so the copy
      // itself is not new source and cannot be what fails this receipt.
      mkdirSync(join(dir, ".agent-receipts", "elsewhere"), { recursive: true });
      const original = readFileSync(
        join(dir, ".agent-receipts", "test.json"),
        "utf8",
      );
      writeFileSync(
        join(dir, ".agent-receipts", "elsewhere", "test.json"),
        original,
      );

      const relocated = runReceipt(dir, [
        "--verify",
        join(".agent-receipts", "elsewhere", "test.json"),
      ]);
      expect(relocated.status).not.toBe(0);
      expect(relocated.stderr).toMatch(
        /claims to exclude paths it does not own/,
      );

      // The original, unmoved copy still verifies fine.
      expect(verify(dir, "test").status).toBe(0);
    });

    it("refuses a forged stage that renames which artifacts this same file may exclude (RETURN11)", () => {
      // Binding ownership to the receipt's real directory (above) leaves one
      // move still open: leave the file exactly where it is, at check.json,
      // and edit only its own `stage` field to "other" plus sourceExcludePaths
      // to name out/other.json instead. expectedExcludePaths trusted
      // receipt.stage to pick the artifact pair without checking it against
      // the file's own actual name, so a same-directory file tampered with
      // under that new name recomputed clean. A receipt found at
      // "check.json" may only ever claim to be the "check" stage.
      const dir = mkdtempSync(join(tmpdir(), "agent-run-receipt-"));
      cleanupDirs.push(dir);
      const run = (args: string[]) =>
        execFileSync("git", args, { cwd: dir, encoding: "utf8" });
      run(["init", "--quiet", "--initial-branch=fixture-main"]);
      run(["config", "user.email", "fixture@example.com"]);
      run(["config", "user.name", "Fixture"]);
      writeFileSync(join(dir, "file.txt"), "one\n");
      // Only the two exact stage artifacts are ignored here, not the whole
      // `out/` directory -- deliberately a different fixture shape than
      // makeFixtureRepo's, so the finding is shown independent of that.
      writeFileSync(
        join(dir, ".gitignore"),
        "/out/check.json\n/out/check.log\n",
      );
      run(["add", "."]);
      run(["commit", "--quiet", "-m", "initial"]);

      expect(
        runReceipt(dir, [
          "--stage",
          "check",
          "--out",
          "out",
          "--",
          "node",
          "-e",
          "process.exit(0)",
        ]).status,
      ).toBe(0);
      const receiptPath = join(dir, "out", "check.json");
      const genuine = JSON.parse(readFileSync(receiptPath, "utf8"));
      expect(
        runReceipt(dir, ["--verify", join("out", "check.json")]).status,
      ).toBe(0);

      // Real tampering: an untracked, non-ignored file lands beside it.
      writeFileSync(join(dir, "out", "other.json"), '{"tampered":true}\n');
      const caught = runReceipt(dir, ["--verify", join("out", "check.json")]);
      expect(caught.status).not.toBe(0);
      expect(caught.stderr).toMatch(/source changed after the run/);

      // Forge ONLY the stage and its matching exclusion list. The file itself
      // never moves; headSha, branch, fingerprint and every other field are
      // untouched.
      const forged = {
        ...genuine,
        stage: "other",
        sourceExcludePaths: ["out/other.json", "out/other.log"],
      };
      writeFileSync(receiptPath, JSON.stringify(forged, null, 2) + "\n");
      const result = runReceipt(dir, ["--verify", join("out", "check.json")]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(
        /cannot exclude a different stage's artifacts by editing its own stage field/,
      );

      // Tampering the file a second time changes nothing about that verdict.
      writeFileSync(join(dir, "out", "other.json"), '{"tampered":"again"}\n');
      const stillRefused = runReceipt(dir, [
        "--verify",
        join("out", "check.json"),
      ]);
      expect(stillRefused.status).not.toBe(0);
    });

    it("treats a non-receipt .json and an orphan .log in the output directory as source, not as its own artifacts", () => {
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      mkdirSync(join(dir, "out-a"));
      writeFileSync(
        join(dir, "out-a", "tsconfig.json"),
        '{"compilerOptions":{}}',
      );
      const jsonResult = runReceipt(dir, [
        "--stage",
        "test",
        "--out",
        "out-a",
        "--",
        "node",
        "-e",
        "process.exit(0)",
      ]);
      expect(jsonResult.status).toBe(2);
      expect(jsonResult.stderr).toMatch(/tsconfig\.json/);

      mkdirSync(join(dir, "out-b"));
      writeFileSync(join(dir, "out-b", "notes.log"), "not a receipt log\n");
      const logResult = runReceipt(dir, [
        "--stage",
        "test",
        "--out",
        "out-b",
        "--",
        "node",
        "-e",
        "process.exit(0)",
      ]);
      expect(logResult.status).toBe(2);
      expect(logResult.stderr).toMatch(/notes\.log/);
    });

    it("still runs repeated stages into an output directory, ignored or not, since earlier receipts are not source", () => {
      const plain = makeFixtureRepo();
      cleanupDirs.push(plain);

      // Not gitignored: the earlier stage's own receipt and log must not be
      // mistaken for source by the guard.
      for (const stage of ["first", "second"]) {
        const result = runReceipt(plain, [
          "--stage",
          stage,
          "--out",
          "receipts-dir",
          "--",
          "node",
          "-e",
          "process.exit(0)",
        ]);
        expect(result.status).toBe(0);
      }
      expect(
        runReceipt(plain, ["--verify", join("receipts-dir", "second.json")])
          .status,
      ).toBe(0);

      // And gitignored, the documented default.
      const dir = makeFixtureRepo();
      cleanupDirs.push(dir);

      expect(record(dir, "first", "process.exit(0)").status).toBe(0);
      expect(record(dir, "second", "process.exit(0)").status).toBe(0);
      expect(verify(dir, "first").status).toBe(0);
      expect(verify(dir, "second").status).toBe(0);
    });
  },
);
