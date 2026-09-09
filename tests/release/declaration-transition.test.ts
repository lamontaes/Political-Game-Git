import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDeclarationTransition } from "../../scripts/release/transition";
import { declarationText } from "./fixtures";

interface HistoryFixture {
  readonly root: string;
  readonly cutoff: string;
  readonly rollout: string;
  readonly legacyHead: string;
  run(...args: string[]): string;
  commit(message: string): string;
  dispose(): void;
}

function historyFixture(
  options: { readonly consumedId?: string } = {},
): HistoryFixture {
  const root = mkdtempSync(join(tmpdir(), "release-transition-"));
  const run = (...args: string[]): string =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const commit = (message: string): string => {
    run("add", "-A");
    run("-c", "commit.gpgsign=false", "commit", "-q", "-m", message);
    return run("rev-parse", "HEAD");
  };

  run("init", "-q", "-b", "main");
  run("config", "user.email", "fixture@example.invalid");
  run("config", "user.name", "Fixture");
  writeFileSync(join(root, "base.txt"), "legacy base\n");
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", ".keep"), "\n");
  mkdirSync(join(root, "docs", "release", "changes"), { recursive: true });
  writeFileSync(
    join(root, "docs", "release", "consumed-changes.json"),
    JSON.stringify(
      {
        entries: options.consumedId
          ? [
              {
                version: "0.2.0",
                releasedOn: "2026-09-08",
                revision: "0".repeat(40),
                changeIds: [options.consumedId],
              },
            ]
          : [],
      },
      null,
      2,
    ) + "\n",
  );
  const cutoff = commit("Legacy cutoff");

  run("checkout", "-q", "-b", "legacy", cutoff);
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(
    join(root, "src", "legacy.ts"),
    "export const legacy = true;\n",
  );
  const legacyHead = commit("Legacy branch change");

  run("checkout", "-q", "main");
  writeFileSync(
    join(root, "docs", "release", "rollout.json"),
    `${JSON.stringify({ schemaVersion: 1, legacyCutoffCommit: cutoff }, null, 2)}\n`,
  );
  const rollout = commit("Roll out declarations");

  return {
    root,
    cutoff,
    rollout,
    legacyHead,
    run,
    commit,
    dispose: () => rmSync(root, { recursive: true, force: true }),
  };
}

function addNoneDeclaration(root: string, id: string): void {
  writeFileSync(
    join(root, "docs", "release", "changes", `${id}.md`),
    declarationText({
      id,
      impact: "none",
      body: "Internal maintenance; no player-visible change.",
    }),
  );
}

describe("transition-aware release declarations", { timeout: 120_000 }, () => {
  it("fails a fresh eligible branch with no declaration", () => {
    const fixture = historyFixture();
    try {
      fixture.run("checkout", "-q", "-b", "fresh", fixture.rollout);
      writeFileSync(
        join(fixture.root, "src", "fresh.ts"),
        "export const fresh = true;\n",
      );
      const head = fixture.commit("Fresh change without declaration");
      const result = checkDeclarationTransition(fixture.root, {
        base: fixture.rollout,
        head,
        mode: "pr",
      });
      expect(result.legacyExempt).toBe(false);
      expect(result.problems.join("\n")).toContain(
        "impact: patch, minor, or explicit none",
      );
    } finally {
      fixture.dispose();
    }
  });

  it("accepts explicit none for a fresh source-only branch", () => {
    const fixture = historyFixture();
    try {
      fixture.run("checkout", "-q", "-b", "fresh", fixture.rollout);
      writeFileSync(
        join(fixture.root, "src", "fresh.ts"),
        "export const fresh = true;\n",
      );
      addNoneDeclaration(fixture.root, "fresh-source-only");
      const head = fixture.commit("Fresh source-only change");
      const result = checkDeclarationTransition(fixture.root, {
        base: fixture.rollout,
        head,
        mode: "pr",
      });
      expect(result.problems).toEqual([]);
      expect(result.declarationPaths).toEqual([
        "docs/release/changes/fresh-source-only.md",
      ]);
    } finally {
      fixture.dispose();
    }
  });

  it("accepts a declaration changed in the same fresh range", () => {
    const fixture = historyFixture();
    try {
      fixture.run("checkout", "-q", "-b", "fresh", fixture.rollout);
      addNoneDeclaration(fixture.root, "fresh-source-only");
      fixture.commit("Start declaration");
      writeFileSync(
        join(fixture.root, "src", "fresh.ts"),
        "export const fresh = true;\n",
      );
      writeFileSync(
        join(
          fixture.root,
          "docs",
          "release",
          "changes",
          "fresh-source-only.md",
        ),
        declarationText({
          id: "fresh-source-only",
          impact: "none",
          body: "Updated internal maintenance reason; no player-visible change.",
        }),
      );
      const head = fixture.commit("Change source and declaration");
      expect(
        checkDeclarationTransition(fixture.root, {
          base: fixture.rollout,
          head,
          mode: "pr",
        }).problems,
      ).toEqual([]);
    } finally {
      fixture.dispose();
    }
  });

  it("takes the legacy cutoff from the trusted base and refuses branch rewriting", () => {
    const fixture = historyFixture();
    try {
      fixture.run("checkout", "-q", "-b", "fresh", fixture.rollout);
      writeFileSync(
        join(fixture.root, "src", "fresh.ts"),
        "export const fresh = true;\n",
      );
      writeFileSync(
        join(fixture.root, "docs", "release", "rollout.json"),
        `${JSON.stringify(
          { schemaVersion: 1, legacyCutoffCommit: fixture.rollout },
          null,
          2,
        )}\n`,
      );
      addNoneDeclaration(fixture.root, "marker-tampering");
      const head = fixture.commit("Try to move the rollout cutoff");
      const result = checkDeclarationTransition(fixture.root, {
        base: fixture.rollout,
        head,
        mode: "pr",
      });
      expect(result.legacyExempt).toBe(false);
      expect(result.problems).toEqual([
        "docs/release/rollout.json: the rollout marker must remain byte-for-byte unchanged after rollout.",
      ]);
    } finally {
      fixture.dispose();
    }
  });

  it("refuses a declaration id consumed before the compared range", () => {
    const fixture = historyFixture({ consumedId: "reused-id" });
    try {
      fixture.run("checkout", "-q", "-b", "fresh", fixture.rollout);
      writeFileSync(
        join(fixture.root, "src", "fresh.ts"),
        "export const fresh = true;\n",
      );
      addNoneDeclaration(fixture.root, "reused-id");
      const head = fixture.commit("Reuse declaration id");
      expect(
        checkDeclarationTransition(fixture.root, {
          base: fixture.rollout,
          head,
          mode: "pr",
        }).problems.join("\n"),
      ).toContain("already consumed before this change range");
    } finally {
      fixture.dispose();
    }
  });

  it("preserves the history-proven exemption for a branch cut at the rollout cutoff", () => {
    const fixture = historyFixture();
    try {
      const result = checkDeclarationTransition(fixture.root, {
        base: fixture.rollout,
        head: fixture.legacyHead,
        mode: "pr",
      });
      expect(result.legacyExempt).toBe(true);
      expect(result.eligiblePaths).toContain("src/legacy.ts");
      expect(result.declarationPaths).toEqual([]);
      expect(result.problems).toEqual([]);
    } finally {
      fixture.dispose();
    }
  });

  it("requires no declaration for an empty comparison", () => {
    const fixture = historyFixture();
    try {
      const result = checkDeclarationTransition(fixture.root, {
        base: fixture.rollout,
        head: fixture.rollout,
        mode: "pr",
      });
      expect(result.eligiblePaths).toEqual([]);
      expect(result.problems).toEqual([]);
    } finally {
      fixture.dispose();
    }
  });

  it("enforces a fresh ordinary main merge and sees its declaration", () => {
    const fixture = historyFixture();
    try {
      fixture.run("checkout", "-q", "-b", "fresh", fixture.rollout);
      writeFileSync(
        join(fixture.root, "src", "fresh.ts"),
        "export const fresh = true;\n",
      );
      addNoneDeclaration(fixture.root, "fresh-source-only");
      fixture.commit("Fresh declared work");
      fixture.run("checkout", "-q", "main");
      fixture.run("merge", "--no-ff", "-q", "-m", "Merge fresh", "fresh");
      const head = fixture.run("rev-parse", "HEAD");
      const result = checkDeclarationTransition(fixture.root, {
        base: fixture.rollout,
        head,
        mode: "push",
      });
      expect(result.legacyExempt).toBe(false);
      expect(result.problems).toEqual([]);
    } finally {
      fixture.dispose();
    }
  });

  it("recognizes an ordinary main merge of a legacy branch", () => {
    const fixture = historyFixture();
    try {
      fixture.run("checkout", "-q", "main");
      fixture.run("merge", "--no-ff", "-q", "-m", "Merge legacy", "legacy");
      const head = fixture.run("rev-parse", "HEAD");
      const result = checkDeclarationTransition(fixture.root, {
        base: fixture.rollout,
        head,
        mode: "push",
      });
      expect(result.legacyExempt).toBe(true);
      expect(result.problems).toEqual([]);
    } finally {
      fixture.dispose();
    }
  });

  it("refuses an unresolved comparison instead of inventing a legacy exemption", () => {
    const fixture = historyFixture();
    try {
      expect(() =>
        checkDeclarationTransition(fixture.root, {
          base: "f".repeat(40),
          head: fixture.rollout,
          mode: "pr",
        }),
      ).toThrow(/Could not run 'git rev-parse/);
    } finally {
      fixture.dispose();
    }
  });
});
