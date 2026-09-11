import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  symlinkSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, it, expect } from "vitest";
import { sourceIdentity, assertIdentity, sourceIdentityInputs } from "./identity";
import { runConfig } from "./run-config";

describe("Shared-machine harness", () => {
  it("identifies differing checkouts, commits and dirty source bytes", () => {
    const root = mkdtempSync(join(tmpdir(), "dev-lab-identity-"));
    try {
      const git = (...args: string[]) =>
        execFileSync("git", args, { cwd: root, stdio: "pipe" });
      git("init");
      git("config", "user.name", "Harness test");
      git("config", "user.email", "test@example.invalid");
      writeFileSync(join(root, "source.txt"), "one");
      git("add", ".");
      git("commit", "-m", "fixture");
      const dependency = join(root, "dependency-fixture");
      mkdirSync(dependency);
      writeFileSync(
        join(root, ".gitignore"),
        "dependency-fixture/\nnode_modules/\n",
      );
      git("add", ".gitignore");
      git("commit", "-m", "ignore fixture dependencies");
      const first = sourceIdentity(root);
      expect(first.dirty).toBe(false);
      symlinkSync(dependency, join(root, "node_modules"));
      expect(sourceIdentity(root).sourceDigest).toBe(first.sourceDigest);
      writeFileSync(join(root, "source.txt"), "two");
      const dirty = sourceIdentity(root);
      expect(() => assertIdentity(first, dirty)).toThrow("sourceDigest");
      git("add", ".");
      git("commit", "-m", "second");
      expect(() => assertIdentity(first, sourceIdentity(root))).toThrow("head");
      expect(() =>
        assertIdentity(first, { ...first, workspace: root + "-other" }),
      ).toThrow("workspace");
      const untracked = sourceIdentity(root);
      expect(() =>
        assertIdentity(untracked, { ...untracked, branch: "other-branch" }),
      ).toThrow("branch");
      writeFileSync(join(root, "new.txt"), "new");
      expect(() => assertIdentity(untracked, sourceIdentity(root))).toThrow(
        "sourceDigest",
      );
      expect(() => assertIdentity(untracked, sourceIdentity(root))).toThrow(
        "Identity inputs (1 paths): new.txt",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("ignores gitignored run output and lists identity inputs on mismatch", () => {
    const root = mkdtempSync(join(tmpdir(), "dev-lab-identity-"));
    try {
      const git = (...args: string[]) =>
        execFileSync("git", args, { cwd: root, stdio: "pipe" });
      git("init");
      git("config", "user.name", "Harness test");
      git("config", "user.email", "test@example.invalid");
      writeFileSync(join(root, "source.txt"), "one");
      writeFileSync(join(root, ".gitignore"), "ignored/\n");
      git("add", ".");
      git("commit", "-m", "fixture");
      const clean = sourceIdentity(root);
      mkdirSync(join(root, "ignored", "runs", "abc"), { recursive: true });
      writeFileSync(join(root, "ignored", "runs", "abc", "proof.png"), "png");
      expect(sourceIdentity(root).sourceDigest).toBe(clean.sourceDigest);
      expect(sourceIdentityInputs(root)).toEqual([]);
      writeFileSync(join(root, "source.txt"), "two");
      expect(sourceIdentityInputs(root)).toEqual(["source.txt"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("uses unique isolated outputs and refuses unsafe paths, ports and workers", () => {
    const a = runConfig({}, "/tmp/checkout"),
      b = runConfig({}, "/tmp/checkout");
    expect(a.artifacts).not.toBe(b.artifacts);
    expect(a.workers).toBe(1);
    expect(
      runConfig(
        {
          PLAYWRIGHT_PORT: "5211",
          PLAYWRIGHT_BASE_URL: "http://127.0.0.1:5211",
          PG_ARTIFACTS_DIR: "/tmp/proof",
        },
        "/tmp/checkout",
      ).port,
    ).toBe(5211);
    for (const env of [
      { PG_PORT: "bad" },
      { PG_PORT: "0" },
      { PLAYWRIGHT_WORKERS: "8" },
      { PG_RUN_ID: "../history" },
      { PG_ARTIFACTS_DIR: "/tmp/checkout/docs/agent/evidence" },
      { PLAYWRIGHT_BASE_URL: "http://127.0.0.1:99" },
    ])
      expect(() => runConfig(env, "/tmp/checkout")).toThrow();
  });
});
