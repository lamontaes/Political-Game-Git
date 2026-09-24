/* global process, Buffer, setTimeout */
import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  StorageRefusal,
  contentManifest,
  createStorageGuard,
} from "./storage-guard.mjs";

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
  // Published means a network remote; the fixture never contacts it.
  git(clone, "remote", "set-url", "origin", "https://example.invalid/ocd.git");
  return clone;
}

describe("workspace reuse", () => {
  it("releases an exact clean published workspace without deleting it", () => {
    const guard = guardWith();
    const folder = realpathSync(publishedClone("PG-RELEASE"));
    guard.register({ owner: "C", folder });
    expect(() =>
      guard.releaseWorkspace({ owner: "someone-else", folder }),
    ).toThrowError(/No active workspace/);
    const released = guard.releaseWorkspace({ owner: "C", folder });
    expect(released.state).toBe("released");
    expect(existsSync(folder)).toBe(true);
    expect(guard.retirementBlockers(folder)).toEqual([]);
    expect(() => guard.ensureWorkspace({ owner: "C" })).toThrowError(
      /No registered workspace/,
    );
  });

  it("keeps dirty or leased workspaces active", () => {
    const guard = guardWith();
    const folder = realpathSync(publishedClone("PG-HELD"));
    guard.register({ owner: "C", folder });
    writeFileSync(path.join(folder, "private-input.png"), "keep");
    expect(() => guard.releaseWorkspace({ owner: "C", folder })).toThrowError(
      /untracked-files/,
    );
    rmSync(path.join(folder, "private-input.png"));
    const lease = guard.reserve({
      operation: "test",
      target: folder,
      owner: "C",
    });
    expect(() => guard.releaseWorkspace({ owner: "C", folder })).toThrowError(
      /live-reservation/,
    );
    expect(guard.registry().workspaces[0].state).toBe("active");
    guard.release(lease.id);
  });

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

  it("reserves bounded headroom for focused tests", () => {
    const test = guardWith().reserve({
      operation: "test",
      target: sandbox,
      owner: "E",
    });
    expect(test.bytes).toBe(1 * GiB);
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
    const workspace = path.join(sandbox, "PG-WS");
    const root = path.join(workspace, "test-results", "runs");
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
    guard.register({ owner: "A", folder: workspace });
    guard.registerOutputRoot({ root });
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
    // No manifest, no removal: there is nothing the owner could have approved.
    const bare = guard.retire([{ path: clone }], { ...roots(), apply: true });
    expect(codes(bare[0].blockers)).toEqual(["no-approved-manifest"]);
    expect(existsSync(clone)).toBe(true);
    const result = guard.retire(
      [{ path: clone, expectedManifest: contentManifest(clone) }],
      { ...roots(), apply: true },
    );
    expect(result[0].removed).toBe(true);
    expect(existsSync(clone)).toBe(false);
  });

  it("approval covers the recorded contents, not a file added afterwards", () => {
    const clone = publishedClone("PG-APPROVED");
    writeFileSync(path.join(clone, "seen.txt"), "reviewed\n");
    const item = {
      path: clone,
      acknowledged: ["untracked-files"],
      expectedManifest: contentManifest(clone),
    };
    const guard = guardWith();
    expect(guard.retire([item], roots())[0].blockers).toEqual([]);
    writeFileSync(path.join(clone, "later.txt"), "not reviewed\n");
    const result = guard.retire([item], { ...roots(), apply: true });
    expect(codes(result[0].blockers)).toEqual(["changed-since-approval"]);
    expect(existsSync(path.join(clone, "later.txt"))).toBe(true);
  });

  it("checks a broken-linked worktree against the commit it was matched to", () => {
    const store = publishedClone("PG-SURVIVOR");
    const commit = git(store, "rev-parse", "HEAD").trim();
    const broken = path.join(sandbox, "PG-BROKEN");
    mkdirSync(broken);
    writeFileSync(
      path.join(broken, ".git"),
      "gitdir: /nowhere/.git/worktrees/x\n",
    );
    writeFileSync(path.join(broken, "source.txt"), "source\n");
    const item = {
      path: broken,
      acknowledged: ["unknown-git-state"],
      identicalTo: { store, commit },
      expectedManifest: contentManifest(broken, {
        identicalTo: { store, commit },
      }),
    };
    expect(item.expectedManifest).toContain(`SOURCE identical-to ${commit}`);
    expect(
      item.expectedManifest.filter((line) => line.startsWith("FILE ")),
    ).toEqual([]);
    const guard = guardWith();
    expect(guard.retire([item], roots())[0].blockers).toEqual([]);
    writeFileSync(path.join(broken, "source.txt"), "edited since\n");
    expect(codes(guard.retire([item], roots())[0].blockers)).toEqual([
      "changed-since-approval",
    ]);
  });

  it("refuses a folder another checkout reaches through a symlink", () => {
    const provider = publishedClone("PG-INSTALL");
    mkdirSync(path.join(provider, "node_modules"));
    const borrower = path.join(sandbox, "PG-BORROWER");
    mkdirSync(borrower);
    symlinkSync(
      path.join("..", "PG-INSTALL", "node_modules"),
      path.join(borrower, "node_modules"),
    );
    const result = guardWith().retire(
      [{ path: provider, acknowledged: ["symlink-target", "untracked-files"] }],
      { ...roots(), apply: true },
    );
    expect(codes(result[0].blockers)).toContain("symlink-target");
    expect(existsSync(path.join(provider, "node_modules"))).toBe(true);
  });

  it("does not count a remote that is a folder on this machine as published", () => {
    const clone = publishedClone("PG-PATH-REMOTE");
    git(
      clone,
      "remote",
      "set-url",
      "origin",
      path.join(sandbox, "PG-PATH-REMOTE-remote.git"),
    );
    expect(codes(guardWith().retirementBlockers(clone, roots()))).toContain(
      "unpublished-commits",
    );
  });

  it("refuses a linked worktree whose detached HEAD is on no branch or remote", () => {
    const clone = publishedClone("PG-STORE");
    const tree = path.join(sandbox, "PG-STORE-detached");
    git(clone, "worktree", "add", "--quiet", "--detach", tree);
    const guard = guardWith();
    expect(codes(guard.retirementBlockers(tree, roots()))).toEqual([]);
    git(tree, "commit", "--quiet", "--allow-empty", "-m", "only here");
    expect(codes(guard.retirementBlockers(tree, roots()))).toContain(
      "unpublished-commits",
    );
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
    mkdirSync(root, { recursive: true });
    guard.registerOutputRoot({ root });
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

describe("G1 — approval binds bytes, not status lines", () => {
  const roots = () => ({ managedRoot: sandbox, searchRoots: [sandbox] });
  const codes = (blockers) => blockers.map((blocker) => blocker.code);
  const soft = ["tracked-modifications", "untracked-files"];

  function dirtyClone(name) {
    const clone = publishedClone(name);
    writeFileSync(path.join(clone, ".gitignore"), "cache/\nprivate/\n");
    git(clone, "add", ".gitignore");
    git(clone, "commit", "--quiet", "-m", "ignore rules");
    git(
      clone,
      "push",
      "--quiet",
      path.join(sandbox, `${name}-remote.git`),
      "HEAD",
    );
    git(
      clone,
      "fetch",
      "--quiet",
      path.join(sandbox, `${name}-remote.git`),
      "+HEAD:refs/remotes/origin/HEAD-copy",
    );
    writeFileSync(path.join(clone, "source.txt"), "edited AAAA\n"); // tracked, modified
    writeFileSync(path.join(clone, "notes.txt"), "untracked AAAA\n");
    mkdirSync(path.join(clone, "private"));
    writeFileSync(path.join(clone, "private", "input.svg"), "<svg id='AAAA'/>");
    mkdirSync(path.join(clone, "cache"));
    writeFileSync(path.join(clone, "cache", "blob.bin"), "cache AAAA");
    return clone;
  }
  const status = (clone) =>
    git(clone, "status", "--porcelain", "--untracked-files=all", "--ignored");

  it("refuses when an already-modified tracked file is rewritten to different bytes of the same length", () => {
    const clone = dirtyClone("PG-G1-TRACKED");
    const guard = guardWith();
    const item = {
      path: clone,
      acknowledged: soft,
      disposableRoots: ["cache"],
      expectedManifest: contentManifest(clone, { disposableRoots: ["cache"] }),
    };
    expect(guard.retire([item], roots())[0].blockers).toEqual([]); // control
    const before = status(clone);
    writeFileSync(path.join(clone, "source.txt"), "edited BBBB\n");
    expect(status(clone)).toBe(before); // porcelain cannot see it
    const dry = guard.retire([item], roots());
    expect(codes(dry[0].blockers)).toEqual(["changed-since-approval"]);
    expect(dry[0].blockers[0].detail).toMatch(/source\.txt/);
    expect(guard.retire([item], { ...roots(), apply: true })[0].removed).toBe(
      false,
    );
    expect(readFileSync(path.join(clone, "source.txt"), "utf8")).toBe(
      "edited BBBB\n",
    );
  });

  it("refuses when an existing untracked file is rewritten to different bytes of the same length", () => {
    const clone = dirtyClone("PG-G1-UNTRACKED");
    const guard = guardWith();
    const item = {
      path: clone,
      acknowledged: soft,
      disposableRoots: ["cache"],
      expectedManifest: contentManifest(clone, { disposableRoots: ["cache"] }),
    };
    const before = status(clone);
    writeFileSync(path.join(clone, "notes.txt"), "untracked BBBB\n");
    expect(status(clone)).toBe(before);
    const dry = guard.retire([item], roots());
    expect(codes(dry[0].blockers)).toEqual(["changed-since-approval"]);
    expect(dry[0].blockers[0].detail).toMatch(/notes\.txt/);
  });

  it("covers ignored non-disposable input, and leaves a named disposable cache out", () => {
    const clone = dirtyClone("PG-G1-IGNORED");
    const guard = guardWith();
    const item = {
      path: clone,
      acknowledged: soft,
      disposableRoots: ["cache"],
      expectedManifest: contentManifest(clone, { disposableRoots: ["cache"] }),
    };
    expect(
      item.expectedManifest.some((line) =>
        /^FILE \S+ - private\/input\.svg$/.test(line),
      ),
    ).toBe(true);
    expect(item.expectedManifest).toContain("DISPOSABLE cache");
    expect(
      item.expectedManifest.some((line) => line.includes("blob.bin")),
    ).toBe(false);
    // Control: the disposable cache may churn without voiding the approval.
    writeFileSync(path.join(clone, "cache", "blob.bin"), "cache BBBB");
    expect(guard.retire([item], roots())[0].blockers).toEqual([]);
    // The ignored private input may not.
    writeFileSync(path.join(clone, "private", "input.svg"), "<svg id='BBBB'/>");
    const dry = guard.retire([item], roots());
    expect(codes(dry[0].blockers)).toEqual(["changed-since-approval"]);
    expect(dry[0].blockers[0].detail).toMatch(/private\/input\.svg/);
    // Without the exclusion the cache is content like anything else.
    expect(
      contentManifest(clone).some((line) => line.endsWith("cache/blob.bin")),
    ).toBe(true);
  });

  it("binds a symlink by its target and type, and sees edits the index was told to skip", () => {
    const clone = dirtyClone("PG-G1-LINKS");
    symlinkSync("private/input.svg", path.join(clone, "current.svg"));
    git(clone, "update-index", "--skip-worktree", ".gitignore");
    const options = { disposableRoots: ["cache"] };
    const approved = contentManifest(clone, options);
    expect(approved).toContain("LINK current.svg -> private/input.svg");
    expect(approved).toContain("INDEX-SPECIAL S .gitignore");

    rmSync(path.join(clone, "current.svg"));
    symlinkSync("notes.txt", path.join(clone, "current.svg")); // same name, new target
    expect(contentManifest(clone, options)).not.toEqual(approved);
    rmSync(path.join(clone, "current.svg"));
    writeFileSync(path.join(clone, "current.svg"), "private/input.svg"); // link became a file
    expect(contentManifest(clone, options)).not.toEqual(approved);
    rmSync(path.join(clone, "current.svg"));
    symlinkSync("private/input.svg", path.join(clone, "current.svg"));
    expect(contentManifest(clone, options)).toEqual(approved); // restored

    writeFileSync(path.join(clone, ".gitignore"), "cache/\nprivate/\n# x\n");
    expect(status(clone)).not.toMatch(/ M \.gitignore/); // hidden from status
    expect(contentManifest(clone, options)).not.toEqual(approved);
  });
});

describe("G2 — output cleanup honors the protected boundary", () => {
  function run(root, name, ageMinutes, extra = () => {}) {
    const folder = path.join(root, name);
    mkdirSync(folder, { recursive: true });
    writeFileSync(path.join(folder, "trace.bin"), Buffer.alloc(64 * 1024, 1));
    extra(folder);
    const when = new Date(Date.now() - ageMinutes * 60_000);
    utimesSync(folder, when, when);
    return folder;
  }
  const policy = { outputBudgetBytes: 96 * 1024, outputKeepRecent: 1 };

  it("removes only eligible runs in a registered root; protected, nested-pinned and live runs stay", () => {
    const workspace = path.join(sandbox, "PG-WS");
    const root = path.join(workspace, "test-results", "runs");
    const recent = run(root, "recent", 1);
    const disposable = run(root, "old-disposable", 300);
    const protectedChild = run(root, "old-protected", 400);
    const nested = run(root, "old-nested", 500, (folder) => {
      mkdirSync(path.join(folder, "review", "kept"), { recursive: true });
      writeFileSync(
        path.join(folder, "review", "kept", ".pin"),
        "R1 evidence\n",
      );
    });
    const nestedProtected = run(root, "old-nested-protected", 600, (folder) => {
      mkdirSync(path.join(folder, "saves"), { recursive: true });
      writeFileSync(path.join(folder, "saves", "life.db"), "saved life");
    });
    const live = run(root, "old-live", 700);

    // Real clock: run ages and the reservation's start are compared in earnest.
    const guard = createStorageGuard({
      stateDir: path.join(sandbox, "state"),
      freeBytes: () => 200 * GiB,
      policy,
    });
    guard.register({ owner: "A", folder: workspace });
    guard.registerOutputRoot({ root, historical: "disposable" });
    // Protection that arrives AFTER the root was registered still holds, and
    // both representations (register's bare paths, protect's entries) count.
    guard.register({
      owner: "A",
      folder: workspace,
      protect: [protectedChild],
    });
    guard.protect(path.join(nestedProtected, "saves"), "owner save");
    // A root that already holds protected material cannot be registered at all.
    expect(() => guard.registerOutputRoot({ root })).toThrowError(
      /overlaps protected/,
    );
    const reservation = guard.reserve({
      operation: "e2e-capture",
      target: workspace,
      owner: "A",
      outputPaths: [live],
    });

    const dry = guard.pruneOutputs(root);
    expect(dry.removed.map((entry) => path.basename(entry.path))).toEqual([
      "old-disposable",
    ]);
    const reasons = Object.fromEntries(
      dry.kept.map((entry) => [path.basename(entry.path), entry.reason]),
    );
    expect(reasons["old-protected"]).toMatch(/^protected/);
    expect(reasons["old-nested"]).toBe("pinned");
    expect(reasons["old-nested-protected"]).toMatch(/^protected/);
    expect(reasons["old-live"]).toMatch(/^live/);

    guard.pruneOutputs(root, { apply: true });
    expect(existsSync(disposable)).toBe(false); // the valid disposable output went
    for (const folder of [
      recent,
      protectedChild,
      nested,
      nestedProtected,
      live,
    ])
      expect(existsSync(folder)).toBe(true);
    expect(
      readFileSync(path.join(nestedProtected, "saves", "life.db"), "utf8"),
    ).toBe("saved life");

    // Once its producer is done, the formerly live run is ordinary output.
    guard.release(reservation.id);
    expect(
      guard
        .pruneOutputs(root)
        .removed.map((entry) => path.basename(entry.path)),
    ).toEqual(["old-live"]);
  });

  it("refuses to delete in an arbitrary, source, protected or symlinked root", () => {
    const workspace = publishedClone("PG-WS-SRC");
    const guard = guardWith({ policy });
    guard.register({ owner: "A", folder: workspace });
    const arbitrary = path.join(sandbox, "somewhere");
    const old = run(arbitrary, "old", 900);
    run(arbitrary, "older", 901);
    run(arbitrary, "oldest", 902);
    expect(guard.pruneOutputs(arbitrary).registered).toBe(false); // measuring is fine
    expect(() => guard.pruneOutputs(arbitrary, { apply: true })).toThrowError(
      /not an exact registered disposable output root/,
    );
    expect(existsSync(old)).toBe(true);

    const refusal = (root) => {
      try {
        guard.registerOutputRoot({ root });
        return "registered";
      } catch (error) {
        return error.code;
      }
    };
    expect(refusal(arbitrary)).toBe("outside-workspace");
    expect(refusal(workspace)).toBe("outside-workspace"); // the workspace itself is source
    const art = path.join(workspace, "art");
    mkdirSync(art);
    guard.protect(art, "private artwork");
    expect(refusal(art)).toBe("protected");
    expect(refusal(path.join(art, "nowhere"))).toBe("missing");
    mkdirSync(path.join(art, "generated"));
    expect(refusal(path.join(art, "generated"))).toBe("protected");
    const nestedClone = path.join(workspace, "vendored");
    git(workspace, "init", "--quiet", nestedClone);
    expect(refusal(nestedClone)).toBe("holds-source");

    const real = path.join(workspace, "test-results", "runs");
    mkdirSync(real, { recursive: true });
    guard.registerOutputRoot({ root: real });
    const alias = path.join(sandbox, "runs-alias");
    symlinkSync(real, alias);
    expect(refusal(alias)).toBe("not-a-directory");
    expect(() => guard.pruneOutputs(alias, { apply: true })).toThrowError(
      /symlink/,
    );
  });

  it("keeps evidence older than the root's registration until a disposition is recorded", () => {
    const workspace = path.join(sandbox, "PG-WS-HIST");
    const root = path.join(workspace, "test-results", "runs");
    const historical = [
      run(root, "h1", 5000),
      run(root, "h2", 5001),
      run(root, "h3", 5002),
    ];
    const guard = createStorageGuard({
      stateDir: path.join(sandbox, "state"),
      freeBytes: () => 200 * GiB,
      policy,
    }); // real clock: registration is "now", the runs are days old
    guard.register({ owner: "A", folder: workspace });
    guard.registerOutputRoot({ root });
    const kept = guard.pruneOutputs(root, { apply: true });
    expect(kept.removed).toEqual([]);
    expect(kept.kept.every((entry) => /^historical/.test(entry.reason))).toBe(
      true,
    );
    for (const folder of historical) expect(existsSync(folder)).toBe(true);

    guard.registerOutputRoot({ root, historical: "disposable" }); // disposition recorded
    const after = guard.pruneOutputs(root, { apply: true });
    expect(
      after.removed.map((entry) => path.basename(entry.path)).sort(),
    ).toEqual(["h2", "h3"]);
  });

  it("retires only exact manifested runs and refuses a changed plan before any deletion", () => {
    const workspace = path.join(sandbox, "PG-WS-EXACT");
    const root = path.join(workspace, "test-results", "runs");
    const first = run(root, "first", 5000);
    const second = run(root, "second", 5001);
    const unknown = run(root, "unknown", 5002);
    const guard = createStorageGuard({
      stateDir: path.join(sandbox, "state"),
      freeBytes: () => 200 * GiB,
      policy,
    });
    guard.register({ owner: "A", folder: workspace });
    guard.registerOutputRoot({ root }); // historical contents stay by default
    const items = [first, second].map((folder) => ({
      path: folder,
      expectedManifest: contentManifest(folder),
    }));
    writeFileSync(path.join(second, "trace.bin"), "changed");
    expect(() =>
      guard.retireOutputRuns(root, items, { apply: true }),
    ).toThrowError(/changed since its manifest/);
    expect(existsSync(first)).toBe(true);
    expect(existsSync(second)).toBe(true);
    items[1].expectedManifest = contentManifest(second);
    expect(
      guard.retireOutputRuns(root, items).map((entry) => entry.removed),
    ).toEqual([false, false]);
    expect(
      guard
        .retireOutputRuns(root, items, { apply: true })
        .map((entry) => entry.removed),
    ).toEqual([true, true]);
    expect(existsSync(unknown)).toBe(true);
  });

  it("refuses a pinned, symlinked, duplicate or nonchild exact output run", () => {
    const workspace = path.join(sandbox, "PG-WS-EXACT-SAFE");
    const root = path.join(workspace, "test-results", "runs");
    const pinned = run(root, "pinned", 5000, (folder) => {
      writeFileSync(path.join(folder, ".pin"), "keep");
    });
    const other = run(root, "other", 5001);
    const guard = createStorageGuard({
      stateDir: path.join(sandbox, "state"),
      freeBytes: () => 200 * GiB,
      policy,
    });
    guard.register({ owner: "A", folder: workspace });
    guard.registerOutputRoot({ root });
    const item = { path: other, expectedManifest: contentManifest(other) };
    expect(() =>
      guard.retireOutputRuns(
        root,
        [{ path: pinned, expectedManifest: contentManifest(pinned) }],
        { apply: true },
      ),
    ).toThrowError(/pinned/);
    expect(() =>
      guard.retireOutputRuns(root, [item, item], { apply: true }),
    ).toThrowError(/unique manifest-bound/);
    expect(() =>
      guard.retireOutputRuns(root, [{ ...item, path: workspace }], {
        apply: true,
      }),
    ).toThrowError(/immediate run/);
    const alias = path.join(root, "alias");
    symlinkSync(other, alias);
    expect(() =>
      guard.retireOutputRuns(root, [{ ...item, path: alias }], { apply: true }),
    ).toThrowError(/real run directory/);
    expect(existsSync(other)).toBe(true);
  });

  it("refuses old manifested runs targeted by a live reservation, including a nested target", () => {
    const workspace = path.join(sandbox, "PG-WS-LIVE-OLD");
    const root = path.join(workspace, "test-results", "runs");
    const old = run(root, "old", 5000, (folder) => {
      mkdirSync(path.join(folder, "nested"));
      writeFileSync(path.join(folder, "nested", "result.txt"), "result");
    });
    const guard = createStorageGuard({
      stateDir: path.join(sandbox, "state"),
      freeBytes: () => 200 * GiB,
      policy,
    });
    guard.register({ owner: "A", folder: workspace });
    guard.registerOutputRoot({ root });
    const item = { path: old, expectedManifest: contentManifest(old) };
    for (const target of [old, path.join(old, "nested")]) {
      const lease = guard.reserve({ operation: "test", target, owner: "A" });
      expect(() => guard.retireOutputRuns(root, [item])).toThrowError(
        /live.*targets this run/,
      );
      guard.release(lease.id);
    }
    expect(existsSync(old)).toBe(true);
  });

  it("refuses late active workspaces inside a manifested output run", () => {
    const workspace = path.join(sandbox, "PG-WS-NESTED-ACTIVE");
    const root = path.join(workspace, "test-results", "runs");
    const old = run(root, "old", 5000, (folder) =>
      mkdirSync(path.join(folder, "source")),
    );
    const guard = guardWith();
    guard.register({ owner: "A", folder: workspace });
    guard.registerOutputRoot({ root });
    const item = { path: old, expectedManifest: contentManifest(old) };
    guard.register({ owner: "B", folder: path.join(old, "source") });
    expect(() => guard.retireOutputRuns(root, [item])).toThrowError(
      /active-workspace/,
    );
    expect(existsSync(old)).toBe(true);
  });

  it("refuses a nested Git source or external symlink dependent in a run", () => {
    const workspace = path.join(sandbox, "PG-WS-RUN-SOURCE");
    const root = path.join(workspace, "test-results", "runs");
    const source = run(root, "source", 5000, (folder) => {
      mkdirSync(path.join(folder, "nested"));
      writeFileSync(path.join(folder, "nested", ".git"), "gitdir: held");
    });
    const dependent = run(root, "dependent", 5001);
    const guard = guardWith();
    guard.register({ owner: "A", folder: workspace });
    guard.registerOutputRoot({ root });
    expect(() =>
      guard.retireOutputRuns(root, [
        { path: source, expectedManifest: contentManifest(source) },
      ]),
    ).toThrowError(/holds-source/);
    const item = {
      path: dependent,
      expectedManifest: contentManifest(dependent),
    };
    symlinkSync(dependent, path.join(workspace, "shared-run"));
    expect(() => guard.retireOutputRuns(root, [item])).toThrowError(
      /symlink-target/,
    );
    expect(existsSync(source)).toBe(true);
    expect(existsSync(dependent)).toBe(true);
  });
});

describe("G3 — the reservation is held through the actual child operation", () => {
  const cli = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "cli.mjs",
  );
  const X = 10 * GiB;
  let env;
  beforeEach(() => {
    const stateDir = path.join(sandbox, "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      path.join(stateDir, "storage-policy.json"),
      JSON.stringify({
        freeSpaceReserveBytes: 25 * GiB,
        estimatesBytes: { build: X },
      }),
    );
    env = {
      ...process.env,
      OCD_STORAGE_STATE_DIR: stateDir,
      // Room for exactly one 10 GiB build above the 25 GiB reserve.
      OCD_STORAGE_FIXTURE_FREE_BYTES: String(25 * GiB + 1.5 * X),
      OCD_WORKSPACE_OWNER: "fixture",
    };
    for (const name of [
      "CI",
      "GITHUB_ACTIONS",
      "OCD_STORAGE_OVERRIDE",
      "OCD_STORAGE_RESERVATION",
    ])
      delete env[name];
  });
  const held = () => {
    try {
      return JSON.parse(
        readFileSync(path.join(sandbox, "state", "reservations.json"), "utf8"),
      ).reservations;
    } catch {
      return [];
    }
  };
  const until = async (condition, ms = 8000) => {
    const end = Date.now() + ms;
    while (!condition()) {
      if (Date.now() > end)
        throw new Error("timed out waiting for the fixture process");
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };
  const managed = (script, options = {}) =>
    spawn(
      process.execPath,
      [cli, "run", "build", "--", process.execPath, "-e", script],
      {
        cwd: sandbox,
        env,
        stdio: "ignore",
        ...options,
      },
    );
  const exit = (child) => new Promise((resolve) => child.on("close", resolve));

  it("keeps the first reservation visible until its child exits; a competitor cannot over-allocate", async () => {
    const release = path.join(sandbox, "first-may-finish");
    const first = managed(
      `const fs=require("fs");const t=setInterval(()=>{if(fs.existsSync(${JSON.stringify(release)})){clearInterval(t)}},20)`,
    );
    const firstExit = exit(first);
    await until(() => held().length === 1);
    expect(held()[0]).toMatchObject({
      operation: "build",
      bytes: X,
      pid: first.pid,
    });

    const marker = path.join(sandbox, "second-ran");
    const script = `require("fs").writeFileSync(${JSON.stringify(marker)},"ran")`;
    const refused = spawnSync(
      process.execPath,
      [cli, "run", "build", "--", process.execPath, "-e", script],
      {
        cwd: sandbox,
        env,
        encoding: "utf8",
      },
    );
    expect(refused.status).toBe(3);
    expect(refused.stderr).toMatch(/needs 10 GiB, but only 5\.0 GiB is usable/);
    expect(existsSync(marker)).toBe(false); // the refused command never started
    expect(held()).toHaveLength(1); // and the first child is still covered

    writeFileSync(release, "");
    expect(await firstExit).toBe(0);
    expect(held()).toHaveLength(0);
    const admitted = spawnSync(
      process.execPath,
      [cli, "run", "build", "--", process.execPath, "-e", script],
      { cwd: sandbox, env },
    );
    expect(admitted.status).toBe(0);
    expect(readFileSync(marker, "utf8")).toBe("ran");
    expect(held()).toHaveLength(0);
  });

  it("releases on a failing child, on a command that cannot start, and on a signal", async () => {
    const failing = spawnSync(
      process.execPath,
      [cli, "run", "build", "--", process.execPath, "-e", "process.exit(7)"],
      { cwd: sandbox, env },
    );
    expect(failing.status).toBe(7);
    expect(held()).toHaveLength(0);

    const missing = spawnSync(
      process.execPath,
      [cli, "run", "build", "--", path.join(sandbox, "no-such-binary")],
      { cwd: sandbox, env, encoding: "utf8" },
    );
    expect(missing.status).toBe(127);
    expect(missing.stderr).toMatch(/could not start/);
    expect(held()).toHaveLength(0);

    const long = managed("setTimeout(()=>{},60000)");
    const longExit = exit(long);
    await until(() => held().length === 1);
    long.kill("SIGTERM");
    expect(await longExit).toBe(143);
    expect(held()).toHaveLength(0);
  });

  it("serializes simultaneous admissions: six racers, room for one, exactly one admitted", async () => {
    const release = path.join(sandbox, "racers-may-finish");
    const script = `const fs=require("fs");const t=setInterval(()=>{if(fs.existsSync(${JSON.stringify(release)})){clearInterval(t)}},20)`;
    const racers = Array.from({ length: 6 }, () => managed(script));
    const exits = racers.map(exit);
    await until(
      () => racers.filter((racer) => racer.exitCode === 3).length === 5,
    );
    expect(held()).toHaveLength(1);
    writeFileSync(release, "");
    const results = await Promise.all(exits);
    expect(results.filter((code) => code === 0)).toHaveLength(1);
    expect(results.filter((code) => code === 3)).toHaveLength(5);
    expect(held()).toHaveLength(0);
  });

  it("drops a reservation whose holder died, and does not treat CI=true alone as a discarded disk", async () => {
    const dead = spawnSync(
      process.execPath,
      ["-e", "process.stdout.write(String(process.pid))"],
      { encoding: "utf8" },
    );
    writeFileSync(
      path.join(sandbox, "state", "reservations.json"),
      JSON.stringify({
        reservations: [
          {
            id: "crashed",
            operation: "build",
            owner: "x",
            target: sandbox,
            bytes: X,
            pid: Number(dead.stdout),
            createdAt: Date.now(),
            expiresAt: Date.now() + 3_600_000,
          },
        ],
      }),
    );
    const afterCrash = spawnSync(process.execPath, [cli, "gate", "build"], {
      cwd: sandbox,
      env,
      encoding: "utf8",
    });
    expect(afterCrash.status).toBe(0);

    const tooSmall = {
      ...env,
      OCD_STORAGE_FIXTURE_FREE_BYTES: String(26 * GiB),
    };
    const localCi = spawnSync(process.execPath, [cli, "gate", "build"], {
      cwd: sandbox,
      env: { ...tooSmall, CI: "true" },
      encoding: "utf8",
    });
    expect(localCi.status).toBe(3); // a Mac with CI=true exported is still a Mac
    const hosted = spawnSync(process.execPath, [cli, "gate", "build"], {
      cwd: sandbox,
      env: {
        ...tooSmall,
        CI: "true",
        GITHUB_ACTIONS: "true",
        RUNNER_ENVIRONMENT: "github-hosted",
      },
      encoding: "utf8",
    });
    expect(hosted.status).toBe(0);
    const selfHosted = spawnSync(process.execPath, [cli, "gate", "build"], {
      cwd: sandbox,
      env: {
        ...tooSmall,
        CI: "true",
        GITHUB_ACTIONS: "true",
        RUNNER_ENVIRONMENT: "self-hosted",
      },
      encoding: "utf8",
    });
    expect(selfHosted.status).toBe(3);
  });
});
