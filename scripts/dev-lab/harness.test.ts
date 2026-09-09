import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, it, expect } from "vitest";
import { sourceIdentity, assertIdentity } from "./identity";
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
      const first = sourceIdentity(root);
      expect(first.dirty).toBe(false);
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
