// Integration tests for the prose-eval CLI verifier path.
//
// Blocker 2 of the PR #99 grounding repair: parseReviewerVerdict existed but no
// CLI command invoked it, so a fail-closed parser gated nothing. These tests
// execute the real CLI process (`node --import tsx cli.ts verify-review <file>`)
// and assert the exit code, because a gate is only a gate if the command line
// actually enforces it.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const CLI = join(import.meta.dirname, "cli.ts");
const REPO_ROOT = join(import.meta.dirname, "..", "..");

let workDir: string;

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), "prose-eval-cli-"));
});

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

/** Run `prose:eval verify-review <reply>` and return its exit status. */
function runVerify(reply: string): { status: number; stderr: string } {
  const replyPath = join(
    workDir,
    `reply-${Math.random().toString(36).slice(2)}.txt`,
  );
  writeFileSync(replyPath, reply);
  try {
    execFileSync(
      process.execPath,
      ["--import", "tsx", CLI, "verify-review", replyPath],
      {
        cwd: REPO_ROOT,
        stdio: "pipe",
      },
    );
    return { status: 0, stderr: "" };
  } catch (error) {
    const err = error as { status?: number; stderr?: Buffer };
    return { status: err.status ?? -1, stderr: err.stderr?.toString() ?? "" };
  }
}

describe("prose:eval verify-review (CLI enforcement)", () => {
  it("exits zero only on an exact valid PASS", () => {
    expect(runVerify("GROUNDING: PASS").status).toBe(0);
  });

  it("exits zero on a PASS wrapped in a bare code fence", () => {
    expect(runVerify("```\nGROUNDING: PASS\n```").status).toBe(0);
  });

  it("exits non-zero on a valid UNSUPPORTED verdict", () => {
    const result = runVerify(
      [
        "GROUNDING: UNSUPPORTED",
        "- claim: calls your office",
        "  class: delivery",
      ].join("\n"),
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("UNSUPPORTED");
  });

  it("exits non-zero on malformed PASS-like text", () => {
    expect(
      runVerify("Sure, this looks right. GROUNDING: PASS to me.").status,
    ).not.toBe(0);
  });

  it("exits non-zero on PASS plus extra prose", () => {
    const result = runVerify(
      "## Claims\nEverything traces back fine.\nGROUNDING: PASS",
    );
    expect(result.status).not.toBe(0);
  });

  it("exits non-zero on a truncated / partial response", () => {
    expect(runVerify("GROUNDING: PAS").status).not.toBe(0);
  });

  it("exits non-zero on an empty response", () => {
    expect(runVerify("").status).not.toBe(0);
  });

  it("exits non-zero on an UNSUPPORTED block that names no claim", () => {
    expect(runVerify("GROUNDING: UNSUPPORTED").status).not.toBe(0);
  });

  it("exits non-zero and prints usage when no reply file is given", () => {
    const result = execFileSyncStatus([
      "--import",
      "tsx",
      CLI,
      "verify-review",
    ]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("usage");
  });
});

function execFileSyncStatus(args: string[]): {
  status: number;
  stderr: string;
} {
  try {
    execFileSync(process.execPath, args, { cwd: REPO_ROOT, stdio: "pipe" });
    return { status: 0, stderr: "" };
  } catch (error) {
    const err = error as { status?: number; stderr?: Buffer };
    return { status: err.status ?? -1, stderr: err.stderr?.toString() ?? "" };
  }
}
