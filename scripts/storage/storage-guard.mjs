/* global process */
/**
 * STORAGE GUARD — workspace reuse, reserved headroom and bounded output.
 *
 * On 2026-09-19 more than 100 GB of project copies had accumulated on one
 * Mac, the owner cleaned by hand, and the repository every worktree shared
 * went with it. Nothing in the repository refused a copy, measured an output
 * root, or knew which folder another folder depended on. This module is the
 * smallest thing that does:
 *
 *   - one REGISTERED workspace per owner, returned again on every request, so
 *     a retry, a new chat or a new branch is never a new directory;
 *   - a byte RESERVATION taken before an operation that writes a lot
 *     (workspace, install, build, package, browser capture, extract), refused
 *     with the numbers when the filesystem reserve or a budget would be
 *     crossed;
 *   - bounded, pin-aware OUTPUT retention for registered disposable roots;
 *   - a RETIREMENT check that refuses anything active, unknown, unpublished,
 *     carrying private inputs, or that another Git store depends on.
 *
 * It is a script, not an operating-system quota: a raw `git clone`, `cp` or a
 * tool that never calls it is outside it. The entry points that do call it
 * are listed in AGENTS.md.
 *
 * Nothing here deletes source. `pruneOutputs` and `retire` remove only what
 * their caller names, only in apply mode, and re-check every condition
 * immediately before each removal.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  statfsSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

const GiB = 1024 ** 3;
const MiB = 1024 ** 2;

/**
 * Configured limits. Measured on the owner's Mac on 2026-09-19 (460 GiB
 * volume): one installed checkout is 1.4–3.2 GiB, a packaged app with the
 * private people 3.8 GiB, a full browser run with traces about 1 GiB, and
 * the volume reached ENOSPC twice in one night below 2 GiB free.
 */
export const DEFAULT_POLICY = Object.freeze({
  version: 1,
  /** Never let a managed operation take the filesystem below this. */
  freeSpaceReserveBytes: 25 * GiB,
  /** Sum of every registered workspace's measured size. */
  managedWorkspaceBudgetBytes: 60 * GiB,
  /** Registered writable workspaces, review and receiving included. */
  maxRegisteredWorkspaces: 8,
  /** Disposable output per registered output root. */
  outputBudgetBytes: 6 * GiB,
  /** Most recent unpinned runs kept per output root. */
  outputKeepRecent: 3,
  /** A reservation nobody released expires; a crashed build must not block. */
  reservationTtlMs: 6 * 60 * 60 * 1000,
  /** Bounded estimates; an unknown operation has no unlimited default. */
  estimatesBytes: {
    "workspace-create": 4 * GiB,
    install: 1.5 * GiB,
    build: 1 * GiB,
    "desktop-stage": 2 * GiB,
    "desktop-package": 8 * GiB,
    "e2e-capture": 2 * GiB,
    extract: 4 * GiB,
  },
});

/** Conditions no approval can waive. */
const HARD_BLOCKERS = new Set([
  "missing",
  "symlink",
  "outside-managed-root",
  "is-managed-root",
  "active-workspace",
  "protected",
  "live-reservation",
  "alternates-provider",
  "common-git-dir",
  "symlink-target",
  "unpublished-commits",
  "stash",
  "changed-since-approval",
]);

export function defaultStateDir(env = process.env) {
  return env.OCD_STORAGE_STATE_DIR ?? path.join(homedir(), ".ocd-dev");
}

export class StorageRefusal extends Error {
  /** @param {string} code @param {string} message @param {object} [detail] */
  constructor(code, message, detail = {}) {
    super(message);
    this.name = "StorageRefusal";
    this.code = code;
    this.detail = detail;
  }
}

export function formatBytes(bytes) {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let value = bytes;
  let unit = 0;
  while (Math.abs(value) >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, file);
}

/** Real path of something that exists; the lexical path otherwise. */
function real(target) {
  try {
    return realpathSync(target);
  } catch {
    return path.resolve(target);
  }
}

function isInside(child, parent) {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

/** Allocated bytes under a path, never following a symlink out of it. */
export function measureBytes(target) {
  let total = 0;
  const walk = (current) => {
    let stats;
    try {
      stats = lstatSync(current);
    } catch {
      return;
    }
    if (stats.isSymbolicLink()) return;
    total += stats.blocks * 512;
    if (!stats.isDirectory()) return;
    for (const entry of readdirSync(current)) walk(path.join(current, entry));
  };
  walk(target);
  return total;
}

function git(cwd, args) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * MiB,
    }).trim();
  } catch {
    return null;
  }
}

/**
 * A remote whose URL is a path on this machine is not a second copy: deleting
 * the folder it names deletes the "published" commits with it. Only a network
 * remote counts as preservation.
 */
function offDeviceRemotes(cwd) {
  const names = git(cwd, ["remote"]);
  if (!names) return [];
  return names.split("\n").filter((name) => {
    const url = git(cwd, ["remote", "get-url", name]) ?? "";
    return /^(https?|ssh|git):\/\//.test(url) || /^[^/\s]+@[^/\s]+:/.test(url);
  });
}

function notOnOffDeviceRemote(cwd, revisions) {
  const remotes = offDeviceRemotes(cwd);
  return git(cwd, [
    "log",
    ...revisions,
    ...(remotes.length > 0 ? ["--not"] : []),
    ...remotes.map((name) => `--remotes=${name}`),
    "--oneline",
  ]);
}

/**
 * The exact recorded contents an approval covers: HEAD (when readable) plus
 * every tracked difference and untracked path. A broken-linked worktree has no
 * Git of its own, so it is compared, read-only and through a throwaway index,
 * with the commit in a surviving store it was found identical to.
 */
export function recordedState(target, identicalTo) {
  if (!identicalTo) {
    const head = git(target, ["rev-parse", "HEAD"]);
    const status = git(target, [
      "status",
      "--porcelain",
      "--untracked-files=all",
    ]);
    if (head === null || status === null) return null;
    return [`HEAD ${head}`, ...status.split("\n").filter(Boolean).sort()];
  }
  const scratch = mkdtempSync(path.join(tmpdir(), "ocd-storage-index-"));
  try {
    const run = (args) => {
      try {
        return execFileSync("git", args, {
          cwd: identicalTo.store,
          env: { ...process.env, GIT_INDEX_FILE: path.join(scratch, "index") },
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
          maxBuffer: 64 * MiB,
        }).trim();
      } catch {
        return null;
      }
    };
    if (run(["read-tree", identicalTo.commit]) === null) return null;
    const tree = [`--work-tree=${target}`];
    const tracked = run([...tree, "diff", "--name-status", identicalTo.commit]);
    const status = run([
      ...tree,
      "status",
      "--porcelain",
      "--untracked-files=all",
    ]);
    if (tracked === null || status === null) return null;
    return [
      `IDENTICAL-TO ${identicalTo.commit}`,
      ...tracked.split("\n").filter(Boolean).sort(),
      ...status
        .split("\n")
        .filter((line) => line.startsWith("??"))
        .sort(),
    ];
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/**
 * @param {{ stateDir?: string, policy?: object, freeBytes?: (p:string)=>number,
 *           now?: () => number, measure?: (p:string)=>number }} [options]
 */
export function createStorageGuard(options = {}) {
  const stateDir = options.stateDir ?? defaultStateDir();
  const registryFile = path.join(stateDir, "workspaces.json");
  const reservationsFile = path.join(stateDir, "reservations.json");
  const policyFile = path.join(stateDir, "storage-policy.json");
  const now = options.now ?? (() => Date.now());
  const measure = options.measure ?? measureBytes;
  const freeBytes =
    options.freeBytes ??
    ((target) => {
      const stats = statfsSync(existsSync(target) ? target : homedir());
      return stats.bavail * stats.bsize;
    });

  const policy = {
    ...DEFAULT_POLICY,
    ...readJson(policyFile, {}),
    ...(options.policy ?? {}),
  };
  policy.estimatesBytes = {
    ...DEFAULT_POLICY.estimatesBytes,
    ...(readJson(policyFile, {}).estimatesBytes ?? {}),
    ...(options.policy?.estimatesBytes ?? {}),
  };

  const registry = () =>
    readJson(registryFile, { version: 1, workspaces: [], protectedPaths: [] });
  const saveRegistry = (value) => writeJsonAtomic(registryFile, value);

  function liveReservations() {
    const all = readJson(reservationsFile, { reservations: [] }).reservations;
    return all.filter((entry) => entry.expiresAt > now());
  }

  /**
   * Take headroom BEFORE the write. Refuses with the numbers; a refusal
   * changes nothing on disk except never having started.
   */
  function reserve({ operation, target, estimateBytes, owner = "unknown" }) {
    const estimate = estimateBytes ?? policy.estimatesBytes[operation];
    if (!Number.isFinite(estimate) || estimate <= 0)
      throw new StorageRefusal(
        "unknown-size",
        `No bounded size estimate for "${operation}". Name one; an unknown size is not an unlimited allocation.`,
        { operation },
      );
    const free = freeBytes(target);
    const held = liveReservations().reduce(
      (sum, entry) => sum + entry.bytes,
      0,
    );
    const available = free - held - policy.freeSpaceReserveBytes;
    if (estimate > available)
      throw new StorageRefusal(
        "insufficient-headroom",
        `Refused ${operation}: needs ${formatBytes(estimate)}, but only ${formatBytes(Math.max(0, available))} is usable (${formatBytes(free)} free − ${formatBytes(held)} already reserved − ${formatBytes(policy.freeSpaceReserveBytes)} reserve). Free ${formatBytes(estimate - available)} more, or release a reservation.`,
        {
          operation,
          estimate,
          free,
          held,
          reserve: policy.freeSpaceReserveBytes,
        },
      );
    const reservation = {
      id: `${operation}-${now()}-${Math.random().toString(16).slice(2, 8)}`,
      operation,
      owner,
      // Real path: a lease must match the folder however it is later named
      // (/var and /private/var are the same directory on macOS).
      target: real(target),
      bytes: estimate,
      createdAt: now(),
      expiresAt: now() + policy.reservationTtlMs,
    };
    writeJsonAtomic(reservationsFile, {
      reservations: [...liveReservations(), reservation],
    });
    return reservation;
  }

  function release(id) {
    writeJsonAtomic(reservationsFile, {
      reservations: liveReservations().filter((entry) => entry.id !== id),
    });
  }

  /**
   * The workspace for an owner. The same request returns the same directory:
   * a retry, a new chat or a new branch is never a new tree. A second tree
   * needs a named task, its exact baseline, a lease and a retirement
   * condition, and still has to fit the budget.
   */
  function ensureWorkspace(request) {
    const { owner, role = "implementation", create } = request;
    if (!owner)
      throw new StorageRefusal("no-owner", "A workspace has an owner.");
    const current = registry();
    const mine = current.workspaces.filter(
      (entry) => entry.owner === owner && entry.state === "active",
    );
    const temporary = request.temporary;
    if (mine.length > 0 && !temporary)
      return { workspace: mine[0], reused: true };
    if (temporary) {
      for (const field of ["task", "baseline", "leaseUntil", "retireWhen"])
        if (!temporary[field])
          throw new StorageRefusal(
            "temporary-needs-terms",
            `A temporary comparison workspace needs ${field}.`,
          );
      const same = mine.find(
        (entry) => entry.temporary?.task === temporary.task,
      );
      if (same) return { workspace: same, reused: true };
    }
    if (!create)
      throw new StorageRefusal(
        "not-registered",
        `No registered workspace for ${owner}. Register an existing folder (register) or request creation explicitly.`,
      );
    if (
      current.workspaces.filter((entry) => entry.state === "active").length >=
      policy.maxRegisteredWorkspaces
    )
      throw new StorageRefusal(
        "too-many-workspaces",
        `Refused: ${policy.maxRegisteredWorkspaces} workspaces are already registered. Retire one first.`,
      );
    const target = path.resolve(create.path);
    if (existsSync(target))
      throw new StorageRefusal(
        "path-exists",
        `Refused: ${target} already exists; register it instead of creating over it.`,
      );
    const managed = current.workspaces
      .filter((entry) => entry.state === "active")
      .reduce((sum, entry) => sum + (entry.measuredBytes ?? 0), 0);
    const estimate = policy.estimatesBytes["workspace-create"];
    if (managed + estimate > policy.managedWorkspaceBudgetBytes)
      throw new StorageRefusal(
        "workspace-budget",
        `Refused: registered workspaces hold ${formatBytes(managed)}; one more (${formatBytes(estimate)}) would pass the ${formatBytes(policy.managedWorkspaceBudgetBytes)} budget.`,
      );
    const reservation = reserve({
      operation: "workspace-create",
      target: path.dirname(target),
      owner,
    });
    const workspace = {
      owner,
      role,
      path: target,
      state: "active",
      registeredAt: now(),
      measuredBytes: 0,
      ...(temporary ? { temporary } : {}),
    };
    saveRegistry({
      ...current,
      workspaces: [...current.workspaces, workspace],
    });
    return { workspace, reused: false, reservation };
  }

  /** Put an existing folder on the map without creating or moving anything. */
  function register({ owner, role = "implementation", folder, protect = [] }) {
    const target = real(folder);
    if (!existsSync(target))
      throw new StorageRefusal("missing", `${target} does not exist.`);
    const current = registry();
    const others = current.workspaces.filter((entry) => entry.path !== target);
    const workspace = {
      owner,
      role,
      path: target,
      state: "active",
      registeredAt: now(),
      measuredBytes: measure(target),
    };
    saveRegistry({
      ...current,
      workspaces: [...others, workspace],
      protectedPaths: [
        ...new Set([...(current.protectedPaths ?? []), ...protect.map(real)]),
      ],
    });
    return workspace;
  }

  function protect(folder, reason) {
    const current = registry();
    const entries = (current.protectedEntries ?? []).filter(
      (entry) => entry.path !== real(folder),
    );
    saveRegistry({
      ...current,
      protectedEntries: [...entries, { path: real(folder), reason }],
    });
  }

  /**
   * Sibling folders that reach into this one through a symlink — a shared
   * `node_modules` is the usual case. Removing the target breaks them.
   */
  function symlinkDependents(folder, searchRoots) {
    const inside = real(folder) + path.sep;
    const dependents = [];
    for (const root of searchRoots) {
      let entries = [];
      try {
        entries = readdirSync(root);
      } catch {
        continue;
      }
      for (const name of entries) {
        const sibling = path.join(root, name);
        if ((real(sibling) + path.sep).startsWith(inside)) continue;
        for (const holder of [sibling, path.join(sibling, "desktop")]) {
          let links = [];
          try {
            links = readdirSync(holder, { withFileTypes: true }).filter(
              (entry) => entry.isSymbolicLink(),
            );
          } catch {
            continue;
          }
          for (const link of links) {
            const at = path.join(holder, link.name);
            const to = path.resolve(holder, readlinkSync(at));
            if ((real(to) + path.sep).startsWith(inside))
              dependents.push(`${at} → ${to}`);
          }
        }
      }
    }
    return dependents;
  }

  /** Git stores that borrow objects from this one through alternates. */
  function alternatesDependents(folder, searchRoots) {
    const store = real(path.join(folder, ".git", "objects"));
    const dependents = [];
    for (const root of searchRoots) {
      let entries = [];
      try {
        entries = readdirSync(root);
      } catch {
        continue;
      }
      for (const name of entries) {
        const candidate = path.join(root, name);
        const file = path.join(
          candidate,
          ".git",
          "objects",
          "info",
          "alternates",
        );
        if (!existsSync(file)) continue;
        const lines = readFileSync(file, "utf8").split("\n").filter(Boolean);
        if (lines.some((line) => real(line) === store))
          dependents.push(real(candidate));
      }
    }
    return dependents;
  }

  /** Worktrees whose gitdir lives inside this folder's .git. */
  function worktreeDependents(folder, searchRoots) {
    const common = real(path.join(folder, ".git"));
    const dependents = [];
    for (const root of searchRoots) {
      let entries = [];
      try {
        entries = readdirSync(root);
      } catch {
        continue;
      }
      for (const name of entries) {
        const pointer = path.join(root, name, ".git");
        let stats;
        try {
          stats = lstatSync(pointer);
        } catch {
          continue;
        }
        if (!stats.isFile()) continue;
        const gitdir = readFileSync(pointer, "utf8")
          .replace(/^gitdir:\s*/, "")
          .trim();
        if (isInside(path.resolve(gitdir), common))
          dependents.push(real(path.join(root, name)));
      }
    }
    return dependents;
  }

  /**
   * Every reason a folder may NOT be retired. An empty list is the only
   * thing that permits removal, and it is recomputed at the moment of
   * removal, not read from a plan written earlier.
   */
  function retirementBlockers(folder, { managedRoot, searchRoots = [] } = {}) {
    const blockers = [];
    const lexical = path.resolve(folder);
    let stats;
    try {
      stats = lstatSync(lexical);
    } catch {
      return [{ code: "missing", detail: `${lexical} does not exist` }];
    }
    if (stats.isSymbolicLink())
      blockers.push({
        code: "symlink",
        detail: "the path is a symlink; its target is not what was approved",
      });
    const target = real(lexical);
    if (managedRoot && !isInside(target, real(managedRoot)))
      blockers.push({
        code: "outside-managed-root",
        detail: `${target} is outside ${real(managedRoot)}`,
      });
    if (managedRoot && target === real(managedRoot))
      blockers.push({
        code: "is-managed-root",
        detail: "the managed root itself",
      });
    const current = registry();
    const active = current.workspaces.find(
      (entry) =>
        entry.state === "active" &&
        (isInside(target, entry.path) || isInside(entry.path, target)),
    );
    if (active)
      blockers.push({
        code: "active-workspace",
        detail: `registered to ${active.owner} (${active.role})`,
      });
    for (const entry of current.protectedEntries ?? [])
      if (isInside(target, entry.path) || isInside(entry.path, target))
        blockers.push({
          code: "protected",
          detail: `${entry.path}: ${entry.reason}`,
        });
    for (const entry of liveReservations())
      if (isInside(entry.target, target))
        blockers.push({
          code: "live-reservation",
          detail: `${entry.operation} by ${entry.owner}`,
        });

    const linkedFrom = symlinkDependents(target, searchRoots);
    if (linkedFrom.length > 0)
      blockers.push({
        code: "symlink-target",
        detail: `used through ${linkedFrom.join(", ")}`,
      });

    const dotGit = path.join(target, ".git");
    let gitKind = "none";
    try {
      gitKind = lstatSync(dotGit).isDirectory() ? "store" : "worktree";
    } catch {
      gitKind = "none";
    }
    if (gitKind === "store") {
      const borrowers = alternatesDependents(target, searchRoots);
      if (borrowers.length > 0)
        blockers.push({
          code: "alternates-provider",
          detail: `object store borrowed by ${borrowers.join(", ")}`,
        });
      const trees = worktreeDependents(target, searchRoots);
      if (trees.length > 0)
        blockers.push({
          code: "common-git-dir",
          detail: `common Git directory of ${trees.join(", ")}`,
        });
      const unpublished = notOnOffDeviceRemote(target, ["--branches"]);
      if (unpublished === null)
        blockers.push({
          code: "unknown-git-state",
          detail: "could not read local branches",
        });
      else if (unpublished !== "")
        blockers.push({
          code: "unpublished-commits",
          detail: `${unpublished.split("\n").length} commit(s) on no off-device remote`,
        });
      const stash = git(target, ["stash", "list"]);
      if (stash)
        blockers.push({
          code: "stash",
          detail: `${stash.split("\n").length} stash entr(ies)`,
        });
    }
    if (gitKind === "worktree") {
      // A linked worktree's branch survives in the common store, but a
      // detached HEAD on no branch becomes unreachable once the tree is gone.
      const onBranch = git(target, [
        "for-each-ref",
        "--contains",
        "HEAD",
        "refs/heads",
      ]);
      const detachedOnly = onBranch === "";
      const loose = detachedOnly ? notOnOffDeviceRemote(target, ["HEAD"]) : "";
      if (loose)
        blockers.push({
          code: "unpublished-commits",
          detail: `detached HEAD holds ${loose.split("\n").length} commit(s) on no branch and no off-device remote`,
        });
    }
    if (gitKind !== "none") {
      const status = git(target, [
        "status",
        "--porcelain",
        "--untracked-files=all",
      ]);
      if (status === null)
        blockers.push({
          code: "unknown-git-state",
          detail:
            "git status failed (a broken-linked worktree needs a recorded recovery disposition, not a prune)",
        });
      else {
        const lines = status === "" ? [] : status.split("\n");
        const tracked = lines.filter((line) => !line.startsWith("??"));
        const untracked = lines.filter((line) => line.startsWith("??"));
        if (tracked.length > 0)
          blockers.push({
            code: "tracked-modifications",
            detail: `${tracked.length} tracked change(s)`,
          });
        if (untracked.length > 0)
          blockers.push({
            code: "untracked-files",
            detail: `${untracked.length} untracked file(s) — private inputs and evidence are never in a bundle`,
          });
      }
    } else {
      blockers.push({
        code: "unknown-contents",
        detail: "not a Git checkout; a name is not evidence of disposability",
      });
    }
    return blockers;
  }

  /**
   * Remove exactly the approved folders. Each is re-examined immediately
   * before removal against the identity the owner approved; anything that
   * changed, or any blocker not explicitly waived for that path, refuses.
   */
  function retire(plan, { apply = false, managedRoot, searchRoots = [] } = {}) {
    const results = [];
    for (const item of plan) {
      // The owner may acknowledge a SOFT condition for one exact path (an
      // untracked scratch file they have looked at). Nothing acknowledges a
      // hard one: a dependency, a lease, a protected or escaped path.
      const blockers = retirementBlockers(item.path, {
        managedRoot,
        searchRoots,
      }).filter(
        (blocker) =>
          HARD_BLOCKERS.has(blocker.code) ||
          !(item.acknowledged ?? []).includes(blocker.code),
      );
      const bytes = existsSync(item.path) ? measure(item.path) : 0;
      if (
        item.expectedBytes !== undefined &&
        Math.abs(bytes - item.expectedBytes) >
          Math.max(64 * MiB, item.expectedBytes * 0.1)
      )
        blockers.push({
          code: "changed-since-approval",
          detail: `measured ${formatBytes(bytes)}, approved at ${formatBytes(item.expectedBytes)}`,
        });
      if (item.expectedState !== undefined) {
        const now = recordedState(item.path, item.identicalTo);
        if (
          now === null ||
          JSON.stringify(now) !== JSON.stringify(item.expectedState)
        )
          blockers.push({
            code: "changed-since-approval",
            detail:
              now === null
                ? "recorded contents can no longer be read"
                : `contents differ from the approved record (${now.filter((line) => !item.expectedState.includes(line)).length} new, ${item.expectedState.filter((line) => !now.includes(line)).length} gone)`,
          });
      }
      if (blockers.length > 0) {
        results.push({ path: item.path, removed: false, bytes, blockers });
        continue;
      }
      if (apply) rmSync(real(item.path), { recursive: true, force: false });
      results.push({ path: item.path, removed: apply, bytes, blockers: [] });
    }
    return results;
  }

  /**
   * Disposable run output in a registered root: keep pinned runs, keep the
   * most recent few, and report (or remove, in apply mode) the rest once the
   * root is over budget. A run is pinned by a `.pin` file inside it.
   */
  function pruneOutputs(root, { apply = false } = {}) {
    const base = real(root);
    let names = [];
    try {
      names = readdirSync(base);
    } catch {
      return {
        root: base,
        totalBytes: 0,
        kept: [],
        removed: [],
        overBudget: false,
      };
    }
    const runs = names
      .map((name) => path.join(base, name))
      .filter((entry) => {
        const stats = lstatSync(entry);
        return stats.isDirectory() && !stats.isSymbolicLink();
      })
      .map((entry) => ({
        path: entry,
        pinned: existsSync(path.join(entry, ".pin")),
        mtimeMs: lstatSync(entry).mtimeMs,
        bytes: measure(entry),
      }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    const totalBytes = runs.reduce((sum, run) => sum + run.bytes, 0);
    const kept = [];
    const removed = [];
    let recent = 0;
    let running = 0;
    for (const run of runs) {
      const keepRecent = !run.pinned && recent < policy.outputKeepRecent;
      if (run.pinned || keepRecent) {
        if (!run.pinned) recent += 1;
        running += run.bytes;
        kept.push(run);
      } else if (
        running + run.bytes <= policy.outputBudgetBytes &&
        totalBytes <= policy.outputBudgetBytes
      ) {
        running += run.bytes;
        kept.push(run);
      } else {
        if (apply && isInside(real(run.path), base))
          rmSync(run.path, { recursive: true, force: false });
        removed.push(run);
      }
    }
    return {
      root: base,
      totalBytes,
      kept,
      removed,
      overBudget: totalBytes > policy.outputBudgetBytes,
    };
  }

  /** The gate an entry point calls: outputs bounded, then headroom reserved. */
  function gate({ operation, target, owner, outputRoots = [] }) {
    for (const root of outputRoots) {
      const report = pruneOutputs(root, { apply: false });
      if (report.overBudget)
        throw new StorageRefusal(
          "output-budget",
          `Refused ${operation}: ${report.root} holds ${formatBytes(report.totalBytes)} of disposable output, over its ${formatBytes(policy.outputBudgetBytes)} budget. Pin what must stay (.pin) and run \`npm run storage -- outputs --apply\`.`,
          { root: report.root, totalBytes: report.totalBytes },
        );
    }
    return reserve({ operation, target, owner });
  }

  return {
    policy,
    files: { registryFile, reservationsFile, policyFile },
    registry,
    reserve,
    release,
    liveReservations,
    ensureWorkspace,
    register,
    protect,
    retirementBlockers,
    retire,
    pruneOutputs,
    gate,
  };
}

/**
 * A hosted CI runner is a fresh, discarded disk with less free space than
 * the workstation reserve; the limits protect the owner's machine, so they
 * are not applied there. Anything else is a workstation.
 */
export function isEphemeralHost(env = process.env) {
  return env.CI === "true" && env.OCD_STORAGE_ENFORCE_IN_CI !== "1";
}

/**
 * For an entry point: refuse (exit 3) or reserve and release when the
 * process ends. `OCD_STORAGE_OVERRIDE="reason"` records a deliberate bypass
 * instead of silently skipping the check.
 */
export function gateEntryPoint({
  operation,
  target = process.cwd(),
  outputRoots = [],
  log = (line) => process.stderr.write(`${line}\n`),
}) {
  if (isEphemeralHost()) {
    log(
      `[storage-guard] ${operation}: hosted runner (CI) — ephemeral disk, the workstation reserve does not apply.`,
    );
    return null;
  }
  if (process.env.OCD_STORAGE_OVERRIDE) {
    log(
      `[storage-guard] OVERRIDDEN for ${operation}: ${process.env.OCD_STORAGE_OVERRIDE}`,
    );
    return null;
  }
  const guard = createStorageGuard();
  try {
    const reservation = guard.gate({
      operation,
      target,
      owner: process.env.OCD_WORKSPACE_OWNER ?? "unregistered",
      outputRoots,
    });
    process.on("exit", () => {
      try {
        guard.release(reservation.id);
      } catch {
        /* a lost reservation expires on its own */
      }
    });
    log(
      `[storage-guard] ${operation}: reserved ${formatBytes(reservation.bytes)}; reserve ${formatBytes(guard.policy.freeSpaceReserveBytes)} kept free.`,
    );
    return reservation;
  } catch (error) {
    if (error instanceof StorageRefusal) {
      log(`[storage-guard] ${error.message}`);
      process.exit(3);
    }
    throw error;
  }
}
