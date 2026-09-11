import {
  chmodSync,
  existsSync,
  lstatSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { planWrites, releaseTree } from "../../scripts/release/apply";
import { loadDeclarations } from "../../scripts/release/declarations";
import { consumedIds, loadLedger } from "../../scripts/release/ledger";
import { planRelease } from "../../scripts/release/plan";
import {
  commitReleaseTransaction,
  hasReleaseTransaction,
  recoverReleaseTransaction,
  SimulatedTransactionInterruption,
} from "../../scripts/release/transaction";
import { declarationText, makeFixture } from "./fixtures";
import type { Fixture } from "./fixtures";

const REVISION = "0123456789abcdef0123456789abcdef01234567";
const DATE = "2026-09-08";

function prepare(fixture: Fixture) {
  const ledger = loadLedger(fixture.root);
  const plan = planRelease({
    currentVersion: "0.2.0",
    notesText: readFileSync(join(fixture.root, "PATCH_NOTES.md"), "utf8"),
    declarations: loadDeclarations(fixture.root),
    alreadyConsumed: consumedIds(ledger),
    isoDate: DATE,
  });
  return planWrites(fixture.root, plan, ledger, REVISION, DATE);
}

function releaseFixture(): Fixture {
  return makeFixture({
    declarations: {
      "a-fix": declarationText({
        id: "a-fix",
        impact: "patch",
        section: "Fixed",
        title: "A fix.",
        body: "The broken thing works again.",
      }),
    },
  });
}

function snapshot(
  fixture: Fixture,
  paths: readonly string[],
): Map<string, string | null> {
  return new Map(
    paths.map((path) => {
      const absolute = join(fixture.root, path);
      return [
        path,
        existsSync(absolute) ? readFileSync(absolute).toString("base64") : null,
      ];
    }),
  );
}

function expectSnapshot(
  fixture: Fixture,
  expected: ReadonlyMap<string, string | null>,
): void {
  for (const [path, contents] of expected) {
    const absolute = join(fixture.root, path);
    if (contents === null) {
      expect(existsSync(absolute), path).toBe(false);
    } else {
      expect(readFileSync(absolute).toString("base64"), path).toBe(contents);
    }
  }
}

describe("release transaction rollback", { timeout: 120_000 }, () => {
  it("rolls back an ordinary failure after every write and deletion", () => {
    const probe = releaseFixture();
    const probeApplied = prepare(probe);
    expect([
      ...probeApplied.writes.map((write) => write.path),
      ...probeApplied.deletions,
    ]).toEqual([
      "package.json",
      "package-lock.json",
      "PATCH_NOTES.md",
      "docs/release/consumed-changes.json",
      "docs/release/changes/a-fix.md",
    ]);
    const mutationCount =
      probeApplied.writes.length + probeApplied.deletions.length;
    probe.dispose();

    for (let failureAfter = 1; failureAfter <= mutationCount; failureAfter++) {
      const fixture = releaseFixture();
      try {
        const applied = prepare(fixture);
        const paths = [
          ...applied.writes.map((write) => write.path),
          ...applied.deletions,
        ];
        const before = snapshot(fixture, paths);
        expect(() =>
          commitReleaseTransaction(fixture.root, applied, {
            afterMutation(index) {
              if (index === failureAfter) throw new Error(`failure ${index}`);
            },
          }),
        ).toThrow(`failure ${failureAfter}`);
        expectSnapshot(fixture, before);
        expect(hasReleaseTransaction(fixture.root)).toBe(false);
      } finally {
        fixture.dispose();
      }
    }
  });

  it("recovers an interruption after every write and deletion", () => {
    const probe = releaseFixture();
    const mutationCount =
      prepare(probe).writes.length + prepare(probe).deletions.length;
    probe.dispose();

    for (let failureAfter = 1; failureAfter <= mutationCount; failureAfter++) {
      const fixture = releaseFixture();
      try {
        const applied = prepare(fixture);
        const paths = [
          ...applied.writes.map((write) => write.path),
          ...applied.deletions,
        ];
        const before = snapshot(fixture, paths);
        expect(() =>
          commitReleaseTransaction(fixture.root, applied, {
            afterMutation(index) {
              if (index === failureAfter) {
                throw new SimulatedTransactionInterruption(
                  `interrupt ${index}`,
                );
              }
            },
          }),
        ).toThrow(SimulatedTransactionInterruption);
        expect(hasReleaseTransaction(fixture.root)).toBe(true);
        expect(recoverReleaseTransaction(fixture.root)).toBe("rolled-back");
        expectSnapshot(fixture, before);
        expect(hasReleaseTransaction(fixture.root)).toBe(false);
      } finally {
        fixture.dispose();
      }
    }
  });

  it("finalizes rather than rolls back after the durable commit marker", () => {
    const fixture = releaseFixture();
    try {
      const applied = prepare(fixture);
      expect(() =>
        commitReleaseTransaction(fixture.root, applied, {
          afterCommitMarker() {
            throw new SimulatedTransactionInterruption("after commit marker");
          },
        }),
      ).toThrow(SimulatedTransactionInterruption);
      expect(hasReleaseTransaction(fixture.root)).toBe(true);
      expect(recoverReleaseTransaction(fixture.root)).toBe("finalized");
      expect(
        JSON.parse(readFileSync(join(fixture.root, "package.json"), "utf8"))
          .version,
      ).toBe("0.2.1");
      expect(
        existsSync(join(fixture.root, "docs/release/changes/a-fix.md")),
      ).toBe(false);
    } finally {
      fixture.dispose();
    }
  });

  it("a retry first recovers an interrupted transaction and then applies once", () => {
    const fixture = releaseFixture();
    try {
      const applied = prepare(fixture);
      expect(() =>
        commitReleaseTransaction(fixture.root, applied, {
          afterMutation(index) {
            if (index === 3) {
              throw new SimulatedTransactionInterruption("interrupt for retry");
            }
          },
        }),
      ).toThrow(SimulatedTransactionInterruption);
      expect(hasReleaseTransaction(fixture.root)).toBe(true);
      expect(releaseTree(fixture.root, DATE, REVISION).outcome).toBe("release");
      expect(
        JSON.parse(readFileSync(join(fixture.root, "package.json"), "utf8"))
          .version,
      ).toBe("0.2.1");
      expect(hasReleaseTransaction(fixture.root)).toBe(false);
    } finally {
      fixture.dispose();
    }
  });

  it("preflights every target before mutation when a directory is unwritable", () => {
    const fixture = releaseFixture();
    const applied = prepare(fixture);
    const paths = [
      ...applied.writes.map((write) => write.path),
      ...applied.deletions,
    ];
    const before = snapshot(fixture, paths);
    try {
      chmodSync(fixture.root, 0o555);
      expect(() => commitReleaseTransaction(fixture.root, applied)).toThrow();
      expectSnapshot(fixture, before);
      expect(hasReleaseTransaction(fixture.root)).toBe(false);
    } finally {
      chmodSync(fixture.root, 0o755);
      fixture.dispose();
    }
  });

  it("refuses a symlink target before changing any source file", () => {
    const fixture = releaseFixture();
    const applied = prepare(fixture);
    const paths = [
      ...applied.writes.map((write) => write.path),
      ...applied.deletions,
    ];
    const lock = join(fixture.root, "package-lock.json");
    const realLock = join(fixture.root, "package-lock.real.json");
    const lockText = readFileSync(lock);
    try {
      unlinkSync(lock);
      writeFileSync(realLock, lockText);
      symlinkSync(realLock, lock);
      const before = snapshot(
        fixture,
        paths.filter((path) => path !== "package-lock.json"),
      );
      expect(() => commitReleaseTransaction(fixture.root, applied)).toThrow(
        /package-lock\.json.*not a regular file/,
      );
      expectSnapshot(fixture, before);
      expect(lstatSync(lock).isSymbolicLink()).toBe(true);
    } finally {
      unlinkSync(lock);
      writeFileSync(lock, lockText);
      unlinkSync(realLock);
      fixture.dispose();
    }
  });

  it("never follows a path injected into a recovery journal", () => {
    const fixture = releaseFixture();
    try {
      writeFileSync(
        join(fixture.root, ".release-transaction.json"),
        JSON.stringify({
          schemaVersion: 1,
          transactionId: "a".repeat(20),
          state: "prepared",
          targets: [
            {
              path: "../outside.txt",
              original: { exists: false },
              desired: { exists: false },
              tempPath: "../.release-transaction-a-0.tmp",
            },
          ],
        }),
      );
      expect(() => recoverReleaseTransaction(fixture.root)).toThrow(
        /Unsafe release transaction path/,
      );
    } finally {
      fixture.dispose();
    }
  });
});
