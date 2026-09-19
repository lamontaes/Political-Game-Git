/* global process, Buffer */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StorageRefusal, createStorageGuard } from "./storage-guard.mjs";

const GiB = 1024 ** 3;
let sandbox;

/** A miniature disposable "Documents": every path here is a fixture. */
beforeEach(() => {
  sandbox = mkdtempSync(path.join(tmpdir(), "storage-guard-"));
});
afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

const git = (cwd, ...args) =>
  execFileSync("git", args, {
    cwd,
    stdio: ["ignore", "pipe", "ignore"],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "fixture",
      GIT_AUTHOR_EMAIL: "fixture@example.invalid",
      GIT_COMMITTER_NAME: "fixture",
      GIT_COMMITTER_EMAIL: "fixture@example.invalid",
    },
  })
    .toString()
    .trim();

function guardWith({ free = 200 * GiB, policy = {} } = {}) {
  let clock = 1_000_000;
  return createStorageGuard({
    stateDir: path.join(sandbox, "state"),
    freeBytes: () => free,
    now: () => (clock += 1),
    policy,
  });
}

/** A published clone: a bare "remote" plus a checkout with nothing unpushed. */
function publishedClone(name) {
  const remote = path.join(sandbox, `${name}-remote.git`);
  git(sandbox, "init", "--quiet", "--bare", remote);
  const clone = path.join(sandbox, name);
  git(sandbox, "clone", "--quiet", remote, clone);
  writeFileSync(path.join(clone, "source.txt"), "source\n");
  git(clone, "add", "source.txt");
  git(clone, "commit", "--quiet", "-m", "source");
  git(clone, "push", "--quiet", "origin", "HEAD");
  return clone;
}

describe("workspace reuse", () => {
  it("returns the same registered folder for every request from one owner", () => {
    const guard = guardWith();
    const folder = path.join(sandbox, "PG-OWNER-A");
    mkdirSync(folder);
    guard.register({ owner: "A", folder });
    const first = guard.ensureWorkspace({ owner: "A" });
    const retry = guard.ensureWorkspace({
      owner: "A",
      create: { path: path.join(sandbox, "PG-OWNER-A-2") },
    });
    expect(first.reused).toBe(true);
    expect(retry.reused).toBe(true);
    expect(retry.workspace.path).toBe(first.workspace.path);
    // The retry asked for a second directory and did not get one.
    expect(existsSync(path.join(sandbox, "PG-OWNER-A-2"))).toBe(false);
    expect(guard.registry().workspaces).toHaveLength(1);
  });

  it("refuses an unregistered owner instead of provisioning silently", () => {
    expect(() => guardWith().ensureWorkspace({ owner: "B" })).toThrowError(
      /No registered workspace for B/,
    );
  });

  it("grants a temporary comparison tree only with a task, baseline, lease and retirement condition, once", () => {
    const guard = guardWith();
    const folder = path.join(sandbox, "PG-OWNER-C");
    mkdirSync(folder);
    guard.register({ owner: "C", folder });
    expect(() =>
      guard.ensureWorkspace({
        owner: "C",
        temporary: { task: "compare" },
        create: { path: path.join(sandbox, "cmp") },
      }),
    ).toThrowError(/needs baseline/);
    const terms = {
      task: "compare",
      baseline: "7869561e",
      leaseUntil: "2026-09-20",
      retireWhen: "comparison recorded",
    };
    const granted = guard.ensureWorkspace({
      owner: "C",
      temporary: terms,
      create: { path: path.join(sandbox, "cmp") },
    });
    const again = guard.ensureWorkspace({
      owner: "C",
      temporary: terms,
      create: { path: path.join(sandbox, "cmp-2") },
    });
    expect(granted.reused).toBe(false);
    expect(again.reused).toBe(true);
    expect(again.workspace.path).toBe(granted.workspace.path);
  });

  it("refuses a workspace past the registered count or the byte budget", () => {
    const counted = guardWith({ policy: { maxRegisteredWorkspaces: 1 } });
    const folder = path.join(sandbox, "PG-ONLY");
    mkdirSync(folder);
    counted.register({ owner: "A", folder });
    expect(() =>
      counted.ensureWorkspace({
        owner: "D",
        create: { path: path.join(sandbox, "PG-D") },
      }),
    ).toThrowError(/already registered/);

    const budgeted = createStorageGuard({
      stateDir: path.join(sandbox, "state-2"),
      freeBytes: () => 500 * GiB,
      measure: () => 58 * GiB,
    });
    budgeted.register({ owner: "A", folder });
    expect(() =>
      budgeted.ensureWorkspace({
        owner: "D",
        create: { path: path.join(sandbox, "PG-D") },
      }),
    ).toThrowError(/would pass the 60 GiB budget/);
  });
});

describe("reserved headroom", () => {
  it("refuses before the write when the reserve would be crossed, and changes nothing", () => {
    const guard = guardWith({ free: 27 * GiB });
    const target = path.join(sandbox, "build-here");
    mkdirSync(target);
    writeFileSync(path.join(target, "kept.txt"), "kept");
    let refusal;
    try {
      guard.gate({ operation: "desktop-package", target, owner: "A" });
    } catch (error) {
      refusal = error;
    }
    expect(refusal).toBeInstanceOf(StorageRefusal);
    expect(refusal.code).toBe("insufficient-headroom");
    expect(refusal.message).toMatch(
      /needs 8\.0 GiB, but only 2\.0 GiB is usable/,
    );
    expect(refusal.message).toMatch(/25 GiB reserve/);
    expect(readFileSync(path.join(target, "kept.txt"), "utf8")).toBe("kept");
    expect(guard.liveReservations()).toHaveLength(0);
  });

  it("accounts for concurrent reservations and frees them on release", () => {
    const guard = guardWith({ free: 36 * GiB }); // 11 GiB usable
    const first = guard.reserve({
      operation: "desktop-package",
      target: sandbox,
      owner: "A",
    });
    expect(() =>
      guard.reserve({ operation: "extract", target: sandbox, owner: "E" }),
    ).toThrowError(/8\.0 GiB already reserved/);
    guard.release(first.id);
    expect(
      guard.reserve({ operation: "extract", target: sandbox, owner: "E" })
        .bytes,
    ).toBe(4 * GiB);
  });

  it("has no unlimited default for an operation it cannot size", () => {
    expect(() =>
      guardWith().reserve({ operation: "mystery", target: sandbox }),
    ).toThrowError(/No bounded size estimate/);
  });

  it("lets an abandoned reservation expire rather than block forever", () => {
    let clock = 0;
    const guard = createStorageGuard({
      stateDir: path.join(sandbox, "state-ttl"),
      freeBytes: () => 36 * GiB,
      now: () => clock,
    });
    guard.reserve({ operation: "desktop-package", target: sandbox });
    clock += guard.policy.reservationTtlMs + 1;
    expect(guard.liveReservations()).toHaveLength(0);
  });
});

describe("bounded, pin-aware output", () => {
  function run(root, name, ageMinutes, { pin = false, bytes = 4096 } = {}) {
    const folder = path.join(root, name);
    mkdirSync(folder, { recursive: true });
    writeFileSync(path.join(folder, "trace.bin"), Buffer.alloc(bytes, 1));
    if (pin)
      writeFileSync(path.join(folder, ".pin"), "kept as review evidence\n");
    const when = new Date(Date.now() - ageMinutes * 60_000);
    utimesSync(folder, when, when);
    return folder;
  }

  it("keeps pinned and recent runs, removes the rest only in apply mode, and never leaves the root", () => {
    const root = path.join(sandbox, "test-results", "runs");
    const pinned = run(root, "old-pinned", 500, {
      pin: true,
      bytes: 64 * 1024,
    });
    const recent = [run(root, "r1", 1), run(root, "r2", 2)];
    const stale = [
      run(root, "s1", 100, { bytes: 64 * 1024 }),
      run(root, "s2", 200, { bytes: 64 * 1024 }),
    ];
    const outside = path.join(sandbox, "evidence.txt");
    writeFileSync(outside, "outside");
    symlinkSync(outside, path.join(root, "link-out"));

    const guard = guardWith({
      policy: { outputBudgetBytes: 96 * 1024, outputKeepRecent: 2 },
    });
    const dry = guard.pruneOutputs(root);
    expect(dry.overBudget).toBe(true);
    expect(
      dry.removed.map((entry) => path.basename(entry.path)).sort(),
    ).toEqual(["s1", "s2"]);
    for (const folder of stale) expect(existsSync(folder)).toBe(true); // dry run removed nothing

    guard.pruneOutputs(root, { apply: true });
    for (const folder of stale) expect(existsSync(folder)).toBe(false);
    for (const folder of [pinned, ...recent])
      expect(existsSync(folder)).toBe(true);
    expect(readFileSync(outside, "utf8")).toBe("outside");
  });

  it("refuses a capturing run while its output root is over budget", () => {
    const root = path.join(sandbox, "test-results", "runs");
    run(root, "big", 1, { bytes: 256 * 1024 });
    const guard = guardWith({ policy: { outputBudgetBytes: 64 * 1024 } });
    expect(() =>
      guard.gate({
        operation: "e2e-capture",
        target: sandbox,
        outputRoots: [root],
      }),
    ).toThrowError(/over its 64 KiB budget/);
  });
});

describe("retirement protection", () => {
  const roots = () => ({ managedRoot: sandbox, searchRoots: [sandbox] });
  const codes = (blockers) => blockers.map((blocker) => blocker.code);

  it("permits a published, clean, independent clone — the positive control", () => {
    const clone = publishedClone("PG-DONE");
    const guard = guardWith();
    expect(guard.retirementBlockers(clone, roots())).toEqual([]);
    const result = guard.retire([{ path: clone }], { ...roots(), apply: true });
    expect(result[0].removed).toBe(true);
    expect(existsSync(clone)).toBe(false);
  });

  it("refuses unpublished commits, tracked changes and untracked private inputs", () => {
    const clone = publishedClone("PG-WORK");
    writeFileSync(path.join(clone, "source.txt"), "edited\n");
    mkdirSync(path.join(clone, "art"));
    writeFileSync(path.join(clone, "art", "private-input.svg"), "<svg/>");
    git(clone, "checkout", "--quiet", "-b", "local-only");
    git(clone, "commit", "--quiet", "--allow-empty", "-m", "unpublished");
    const blockers = codes(guardWith().retirementBlockers(clone, roots()));
    expect(blockers).toEqual(
      expect.arrayContaining([
        "unpublished-commits",
        "tracked-modifications",
        "untracked-files",
      ]),
    );
    const result = guardWith().retire(
      [
        {
          path: clone,
          acknowledged: [
            "untracked-files",
            "tracked-modifications",
            "unpublished-commits",
          ],
        },
      ],
      { ...roots(), apply: true },
    );
    // Unpublished history cannot be acknowledged away.
    expect(result[0].removed).toBe(false);
    expect(
      readFileSync(path.join(clone, "art", "private-input.svg"), "utf8"),
    ).toBe("<svg/>");
  });

  it("refuses an alternates provider and a common Git directory while anything depends on them", () => {
    const provider = publishedClone("PG-PROVIDER");
    const borrower = path.join(sandbox, "PG-BORROWER");
    git(sandbox, "clone", "--quiet", "--shared", provider, borrower);
    const tree = path.join(sandbox, "PG-TREE");
    git(provider, "worktree", "add", "--quiet", "--detach", tree);
    const guard = guardWith();
    expect(codes(guard.retirementBlockers(provider, roots()))).toEqual(
      expect.arrayContaining(["alternates-provider", "common-git-dir"]),
    );
    guard.retire(
      [
        {
          path: provider,
          acknowledged: ["alternates-provider", "common-git-dir"],
        },
      ],
      { ...roots(), apply: true },
    );
    expect(existsSync(path.join(provider, ".git", "objects"))).toBe(true);
    // The borrower still reads history through the provider.
    expect(git(borrower, "log", "--oneline")).toMatch(/source/);
  });

  it("refuses active workspaces, protected paths, live reservations and unknown folders", () => {
    const guard = guardWith();
    const active = publishedClone("PG-ACTIVE");
    guard.register({ owner: "A", folder: active });
    const recovery = path.join(sandbox, "PG-RECOVERY");
    mkdirSync(recovery);
    writeFileSync(path.join(recovery, "refs.bundle"), "bundle");
    guard.protect(recovery, "only copy of 77 unpublished refs");
    const building = publishedClone("PG-BUILDING");
    guard.reserve({ operation: "build", target: building, owner: "D" });
    const scratch = path.join(sandbox, "pg-scratch");
    mkdirSync(scratch);

    expect(codes(guard.retirementBlockers(active, roots()))).toContain(
      "active-workspace",
    );
    expect(codes(guard.retirementBlockers(recovery, roots()))).toContain(
      "protected",
    );
    expect(codes(guard.retirementBlockers(building, roots()))).toContain(
      "live-reservation",
    );
    // A name like "scratch" proves nothing.
    expect(codes(guard.retirementBlockers(scratch, roots()))).toContain(
      "unknown-contents",
    );
    guard.retire([{ path: recovery }, { path: active }, { path: scratch }], {
      ...roots(),
      apply: true,
    });
    expect(readFileSync(path.join(recovery, "refs.bundle"), "utf8")).toBe(
      "bundle",
    );
    expect(existsSync(active)).toBe(true);
    expect(existsSync(scratch)).toBe(true);
  });

  it("refuses a symlink, a path outside the managed root, and a folder that changed since approval", () => {
    const guard = guardWith();
    const elsewhere = mkdtempSync(
      path.join(tmpdir(), "storage-guard-outside-"),
    );
    try {
      writeFileSync(path.join(elsewhere, "saves.db"), "saved life");
      const link = path.join(sandbox, "PG-LOOKS-LOCAL");
      symlinkSync(elsewhere, link);
      expect(codes(guard.retirementBlockers(link, roots()))).toEqual(
        expect.arrayContaining(["symlink", "outside-managed-root"]),
      );
      guard.retire(
        [
          {
            path: link,
            acknowledged: [
              "symlink",
              "outside-managed-root",
              "unknown-contents",
            ],
          },
        ],
        { ...roots(), apply: true },
      );
      expect(readFileSync(path.join(elsewhere, "saves.db"), "utf8")).toBe(
        "saved life",
      );

      const clone = publishedClone("PG-APPROVED");
      const changed = guard.retire(
        [{ path: clone, expectedBytes: 900 * 1024 * 1024 }],
        { ...roots(), apply: true },
      );
      expect(codes(changed[0].blockers)).toContain("changed-since-approval");
      expect(existsSync(clone)).toBe(true);
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });
});

describe("repeated operations do not grow the footprint", () => {
  it("ten requests and ten gated runs leave one workspace, no reservations and a bounded output root", () => {
    const guard = guardWith({
      policy: { outputBudgetBytes: 40 * 1024, outputKeepRecent: 2 },
    });
    const folder = path.join(sandbox, "PG-LOOP");
    mkdirSync(folder);
    guard.register({ owner: "A", folder });
    const root = path.join(folder, "test-results", "runs");
    for (let index = 0; index < 10; index += 1) {
      const { workspace } = guard.ensureWorkspace({
        owner: "A",
        create: { path: path.join(sandbox, `PG-LOOP-${index}`) },
      });
      expect(workspace.path).toBe(guard.registry().workspaces[0].path);
      guard.pruneOutputs(root, { apply: true });
      const reservation = guard.gate({
        operation: "e2e-capture",
        target: folder,
        owner: "A",
        outputRoots: [root],
      });
      const runFolder = path.join(root, `run-${index}`);
      mkdirSync(runFolder, { recursive: true });
      writeFileSync(
        path.join(runFolder, "trace.bin"),
        Buffer.alloc(16 * 1024, 1),
      );
      const when = new Date(Date.now() - (10 - index) * 60_000);
      utimesSync(runFolder, when, when);
      guard.release(reservation.id);
    }
    guard.pruneOutputs(root, { apply: true });
    expect(guard.registry().workspaces).toHaveLength(1);
    expect(guard.liveReservations()).toHaveLength(0);
    expect(guard.pruneOutputs(root).kept.length).toBeLessThanOrEqual(2);
    for (let index = 0; index < 10; index += 1)
      expect(existsSync(path.join(sandbox, `PG-LOOP-${index}`))).toBe(false);
  });
});
