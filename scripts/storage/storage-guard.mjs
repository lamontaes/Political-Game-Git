/* global process, Buffer */
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
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
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
    test: 1 * GiB,
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
  "no-approved-manifest",
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

/**
 * One writer at a time. An atomic rename keeps a reader from seeing half a
 * file; it does not stop two processes reading the same old state and each
 * writing back its own addition. Every read-modify-write of the registry or
 * the reservations happens inside this lock.
 */
function withLock(stateDir, action) {
  mkdirSync(stateDir, { recursive: true });
  const lock = path.join(stateDir, "storage.lock");
  const sleeper = new Int32Array(new SharedArrayBuffer(4));
  const deadline = Date.now() + 15_000;
  for (;;) {
    try {
      mkdirSync(lock);
      writeFileSync(path.join(lock, "owner"), String(process.pid));
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let holder = NaN;
      let age = 0;
      try {
        holder = Number(readFileSync(path.join(lock, "owner"), "utf8"));
        age = Date.now() - lstatSync(lock).mtimeMs;
      } catch {
        /* the holder is between mkdir and write, or just released */
      }
      const dead = Number.isInteger(holder) && !processAlive(holder);
      if (dead || age > 60_000) rmSync(lock, { recursive: true, force: true });
      else if (Date.now() > deadline)
        throw new StorageRefusal(
          "lock-timeout",
          `Storage state is locked by process ${holder}; nothing was changed.`,
        );
      else Atomics.wait(sleeper, 0, 0, 25);
    }
  }
  try {
    return action();
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
}

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
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

function sha256File(file) {
  const hash = createHash("sha256");
  const handle = openSync(file, "r");
  try {
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    for (;;) {
      const read = readSync(handle, buffer, 0, buffer.length, null);
      if (read === 0) break;
      hash.update(buffer.subarray(0, read));
    }
  } finally {
    closeSync(handle);
  }
  return hash.digest("hex");
}

/**
 * A plan names its disposable roots explicitly. `node_modules` (no slash)
 * matches that name at any depth; `desktop/staged` matches that exact
 * relative path and everything under it.
 */
function isDisposable(relative, disposableRoots) {
  const segments = relative.split("/");
  return disposableRoots.some((root) =>
    root.includes("/")
      ? relative === root || relative.startsWith(`${root}/`)
      : segments.includes(root),
  );
}

/** One manifest line for whatever is at `relative`: bytes, link or absence. */
function describePath(base, relative, lines, disposableRoots) {
  if (isDisposable(relative, disposableRoots)) {
    lines.add(`DISPOSABLE ${relative}`);
    return;
  }
  const absolute = path.join(base, relative);
  let stats;
  try {
    stats = lstatSync(absolute);
  } catch {
    lines.add(`ABSENT ${relative}`);
    return;
  }
  if (stats.isSymbolicLink())
    lines.add(`LINK ${relative} -> ${readlinkSync(absolute)}`);
  else if (stats.isDirectory()) {
    const entries = readdirSync(absolute).sort();
    if (entries.length === 0) lines.add(`EMPTYDIR ${relative}`);
    for (const entry of entries)
      describePath(base, `${relative}/${entry}`, lines, disposableRoots);
  } else if (stats.isFile())
    lines.add(
      `FILE ${sha256File(absolute)} ${stats.mode & 0o111 ? "x" : "-"} ${relative}`,
    );
  else lines.add(`SPECIAL ${relative}`);
}

/** NUL-separated porcelain v1: a rename or copy carries its origin next. */
function parsePorcelainZ(output) {
  const fields = output.split("\0").filter((field) => field !== "");
  const entries = [];
  for (let index = 0; index < fields.length; index += 1) {
    const code = fields[index].slice(0, 2);
    const entry = { code, path: fields[index].slice(3) };
    if (code.includes("R") || code.includes("C")) {
      index += 1;
      entry.from = fields[index];
    }
    entries.push(entry);
  }
  return entries;
}

/**
 * THE CONTENT AN APPROVAL COVERS. Source identity (HEAD, or the commit a
 * broken-linked worktree was matched to) plus a digest of every byte Git would
 * not give back: tracked files that differ from that commit (staged or not),
 * untracked files, ignored files outside the plan's named disposable roots,
 * and paths the index is told to skip. Symlinks are bound by their target
 * text, never followed. Unchanged tracked files are covered by the commit id
 * and are not re-hashed. A name or a size is never the evidence.
 *
 * @param {string} target
 * @param {{ identicalTo?: { store: string, commit: string },
 *           disposableRoots?: string[] }} [options]
 * @returns {string[] | null} sorted manifest lines, or null when unreadable
 */
export function contentManifest(target, options = {}) {
  const { identicalTo, disposableRoots = [] } = options;
  const base = real(target);
  const lines = new Set([`ROOT ${base}`]);
  for (const root of disposableRoots) lines.add(`DISPOSABLE-ROOT ${root}`);
  let dotGit;
  try {
    dotGit = lstatSync(path.join(base, ".git"));
  } catch {
    dotGit = null;
  }
  if (dotGit === null) {
    // Not a checkout: every byte outside the disposable roots is the content.
    lines.add("SOURCE none");
    for (const entry of readdirSync(base).sort())
      describePath(base, entry, lines, disposableRoots);
    return [...lines].sort();
  }
  lines.add(
    dotGit.isDirectory()
      ? "GIT store"
      : `GIT ${readFileSync(path.join(base, ".git"), "utf8").trim()}`,
  );

  const scratch = identicalTo
    ? mkdtempSync(path.join(tmpdir(), "ocd-storage-index-"))
    : null;
  const run = (args) => {
    try {
      return execFileSync(
        "git",
        identicalTo ? [`--work-tree=${base}`, ...args] : args,
        {
          cwd: identicalTo ? identicalTo.store : base,
          env: scratch
            ? { ...process.env, GIT_INDEX_FILE: path.join(scratch, "index") }
            : process.env,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
          maxBuffer: 256 * MiB,
        },
      );
    } catch {
      return null;
    }
  };
  try {
    let commit;
    if (identicalTo) {
      commit = identicalTo.commit;
      try {
        execFileSync("git", ["read-tree", commit], {
          cwd: identicalTo.store,
          env: { ...process.env, GIT_INDEX_FILE: path.join(scratch, "index") },
          stdio: "ignore",
        });
      } catch {
        return null;
      }
      lines.add(`SOURCE identical-to ${commit}`);
    } else {
      commit = run(["rev-parse", "HEAD"])?.trim();
      if (!commit) return null;
      lines.add(`SOURCE HEAD ${commit}`);
    }
    // Working tree against the commit: catches staged and unstaged alike.
    const tracked = run(["diff", "--name-only", "-z", commit]);
    const status = run([
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--ignored=matching",
    ]);
    if (tracked === null || status === null) return null;
    for (const relative of tracked.split("\0").filter(Boolean))
      describePath(base, relative, lines, []);
    for (const entry of parsePorcelainZ(status)) {
      const relative = entry.path.replace(/\/$/, "");
      if (entry.code === "??") describePath(base, relative, lines, []);
      else if (entry.code === "!!")
        describePath(base, relative, lines, disposableRoots);
      else if (!identicalTo) {
        // The index itself is content when something is staged.
        const staged = run(["ls-files", "--stage", "-z", "--", entry.path]);
        lines.add(
          `INDEX ${entry.code.trim()} ${relative} ${(staged ?? "").split("\0").filter(Boolean).join(",") || "removed"}`,
        );
        describePath(base, relative, lines, []);
      }
    }
    if (!identicalTo) {
      // assume-unchanged (lower-case tag) and skip-worktree (S) hide edits
      // from status, so those paths are digested explicitly.
      const flagged = run(["ls-files", "-v", "-z"]);
      if (flagged === null) return null;
      for (const field of flagged.split("\0").filter(Boolean)) {
        const tag = field[0];
        if (tag === "S" || tag !== tag.toUpperCase()) {
          lines.add(`INDEX-SPECIAL ${tag} ${field.slice(2)}`);
          describePath(base, field.slice(2), lines, []);
        }
      }
    }
    return [...lines].sort();
  } finally {
    if (scratch) rmSync(scratch, { recursive: true, force: true });
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
      // Fixture-only: honored solely beside an explicit fixture state
      // directory, so it can never loosen the limits on the real registry.
      if (
        process.env.OCD_STORAGE_STATE_DIR &&
        process.env.OCD_STORAGE_FIXTURE_FREE_BYTES
      )
        return Number(process.env.OCD_STORAGE_FIXTURE_FREE_BYTES);
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
  const locked = (action) => withLock(stateDir, action);

  /**
   * ONE protection contract. `protect` records a path with its reason and
   * `register({ protect })` records bare paths; retirement and output cleanup
   * both read this merged list, so neither form is invisible to either.
   */
  function protectedList(current = registry()) {
    return [
      ...(current.protectedEntries ?? []),
      ...(current.protectedPaths ?? []).map((entry) => ({
        path: entry,
        reason: "protected when its workspace was registered",
      })),
    ];
  }

  function liveReservations() {
    const all = readJson(reservationsFile, { reservations: [] }).reservations;
    return all.filter(
      (entry) =>
        entry.expiresAt > now() &&
        // A holder that died without releasing must not block for hours.
        (entry.pid === undefined || processAlive(entry.pid)),
    );
  }

  /**
   * Take headroom BEFORE the write. Refuses with the numbers; a refusal
   * changes nothing on disk except never having started.
   */
  function reserve(request) {
    return locked(() => reserveUnlocked(request));
  }

  function reserveUnlocked({
    operation,
    target,
    estimateBytes,
    owner = "unknown",
    outputPaths = [],
    pid = process.pid,
  }) {
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
      // The run directories this operation is writing; output cleanup keeps
      // them while the holder lives, however old they look.
      outputPaths: outputPaths.map(real),
      pid,
      createdAt: now(),
      expiresAt: now() + policy.reservationTtlMs,
    };
    writeJsonAtomic(reservationsFile, {
      reservations: [...liveReservations(), reservation],
    });
    return reservation;
  }

  function release(id) {
    locked(() =>
      writeJsonAtomic(reservationsFile, {
        reservations: liveReservations().filter((entry) => entry.id !== id),
      }),
    );
  }

  /**
   * The workspace for an owner. The same request returns the same directory:
   * a retry, a new chat or a new branch is never a new tree. A second tree
   * needs a named task, its exact baseline, a lease and a retirement
   * condition, and still has to fit the budget.
   */
  function ensureWorkspace(request) {
    return locked(() => ensureWorkspaceUnlocked(request));
  }

  function ensureWorkspaceUnlocked(request) {
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
    const reservation = reserveUnlocked({
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
  function register(request) {
    return locked(() => registerUnlocked(request));
  }

  function registerUnlocked({
    owner,
    role = "implementation",
    folder,
    protect = [],
  }) {
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

  /** Release a retired owner's exact workspace only after every other
   * retirement guard passes. This records a state transition; it removes no
   * files. A separate byte-manifest plan is still required for deletion.
   */
  function releaseWorkspace({ owner, folder }) {
    return locked(() => {
      if (!owner || !folder)
        throw new StorageRefusal(
          "workspace-release-terms",
          "Release requires an exact owner and path.",
        );
      const target = real(folder);
      if (path.resolve(folder) !== target)
        throw new StorageRefusal(
          "workspace-alias",
          `Use the registered real workspace path, not an alias: ${folder}.`,
        );
      const current = registry();
      const entry = current.workspaces.find(
        (candidate) =>
          candidate.path === target &&
          candidate.owner === owner &&
          candidate.state === "active",
      );
      if (!entry)
        throw new StorageRefusal(
          "workspace-not-owned",
          `No active workspace at ${target} is registered to ${owner}.`,
        );
      const overlapping = current.workspaces.find(
        (candidate) =>
          candidate !== entry &&
          candidate.state === "active" &&
          (isInside(candidate.path, target) ||
            isInside(target, candidate.path)),
      );
      if (overlapping)
        throw new StorageRefusal(
          "workspace-overlap",
          `${target} overlaps active workspace ${overlapping.path}.`,
        );
      const output = (current.outputRoots ?? []).find((root) =>
        isInside(root.path, target),
      );
      if (output)
        throw new StorageRefusal(
          "workspace-has-output-root",
          `${target} still owns registered output ${output.path}.`,
        );
      const blockers = retirementBlockers(target).filter(
        (blocker) => blocker.code !== "active-workspace",
      );
      if (blockers.length)
        throw new StorageRefusal(
          "workspace-not-releasable",
          `${target} cannot be released: ${blockers.map((b) => `${b.code}: ${b.detail}`).join("; ")}`,
          { blockers },
        );
      const released = { ...entry, state: "released", releasedAt: now() };
      saveRegistry({
        ...current,
        workspaces: current.workspaces.map((candidate) =>
          candidate === entry ? released : candidate,
        ),
      });
      return released;
    });
  }

  function protect(folder, reason) {
    locked(() => {
      const current = registry();
      const entries = (current.protectedEntries ?? []).filter(
        (entry) => entry.path !== real(folder),
      );
      saveRegistry({
        ...current,
        protectedEntries: [...entries, { path: real(folder), reason }],
      });
    });
  }

  /**
   * Name one exact directory as disposable run output. Only such a root can
   * ever be pruned. It must sit inside a registered workspace and must not be,
   * contain, or lie within anything that holds source, assets, saves or
   * recovery material. What was already there when it was registered is
   * HISTORICAL: kept until its disposition is recorded, because nobody has
   * said that old evidence is disposable.
   */
  function registerOutputRoot({ root, owner, historical = "keep" }) {
    return locked(() => {
      const lexical = path.resolve(root);
      let stats;
      try {
        stats = lstatSync(lexical);
      } catch {
        throw new StorageRefusal("missing", `${lexical} does not exist.`);
      }
      if (stats.isSymbolicLink() || !stats.isDirectory())
        throw new StorageRefusal(
          "not-a-directory",
          `${lexical} is a symlink or not a directory; an output root is an exact real directory.`,
        );
      const target = real(lexical);
      const current = registry();
      const home = current.workspaces.find(
        (entry) =>
          entry.state === "active" &&
          isInside(target, entry.path) &&
          target !== entry.path,
      );
      if (!home)
        throw new StorageRefusal(
          "outside-workspace",
          `${target} is not inside a registered workspace (or is the workspace itself, which is source).`,
        );
      if (existsSync(path.join(target, ".git")))
        throw new StorageRefusal(
          "holds-source",
          `${target} is a Git checkout, not run output.`,
        );
      for (const entry of protectedList(current))
        if (isInside(target, entry.path) || isInside(entry.path, target))
          throw new StorageRefusal(
            "protected",
            `${target} overlaps protected ${entry.path} (${entry.reason}).`,
          );
      const others = (current.outputRoots ?? []).filter(
        (entry) => entry.path !== target,
      );
      const record = {
        path: target,
        owner: owner ?? home.owner,
        registeredAt: now(),
        historical,
      };
      saveRegistry({ ...current, outputRoots: [...others, record] });
      return record;
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
    for (const entry of protectedList(current))
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
      // Approval binds bytes. Without a manifest there is nothing the owner
      // can be said to have approved, so apply refuses; with one, any
      // difference refuses — including a rewrite that leaves status unchanged.
      if (item.expectedManifest === undefined) {
        if (apply)
          blockers.push({
            code: "no-approved-manifest",
            detail:
              "the plan has no content manifest for this path; run `storage record` and have that plan approved",
          });
      } else if (existsSync(item.path)) {
        const current = contentManifest(item.path, {
          identicalTo: item.identicalTo,
          disposableRoots: item.disposableRoots ?? [],
        });
        const approved = new Set(item.expectedManifest);
        const changed =
          current === null
            ? null
            : [
                ...current.filter((line) => !approved.has(line)),
                ...item.expectedManifest.filter(
                  (line) => !current.includes(line),
                ),
              ];
        if (changed === null || changed.length > 0)
          blockers.push({
            code: "changed-since-approval",
            detail:
              changed === null
                ? "contents can no longer be read"
                : `contents differ from the approved manifest: ${changed.slice(0, 3).join("; ")}${changed.length > 3 ? ` (+${changed.length - 3} more)` : ""}`,
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

  /** Does anything under this run carry a `.pin`, at any depth? */
  function holdsPin(folder) {
    let entries = [];
    try {
      entries = readdirSync(folder, { withFileTypes: true });
    } catch {
      return false;
    }
    return entries.some(
      (entry) =>
        entry.name === ".pin" ||
        (entry.isDirectory() &&
          !entry.isSymbolicLink() &&
          holdsPin(path.join(folder, entry.name))),
    );
  }

  /** Why one run directory must stay, or null when it is eligible. */
  function keepReason(run, registration) {
    if (holdsPin(run.path)) return "pinned";
    for (const entry of protectedList())
      if (isInside(entry.path, run.path) || isInside(run.path, entry.path))
        return `protected: ${entry.path}`;
    for (const entry of liveReservations()) {
      if ((entry.outputPaths ?? []).some((held) => isInside(held, run.path)))
        return `live: ${entry.operation} by ${entry.owner} is writing it`;
      if (isInside(run.path, entry.target) && run.mtimeMs >= entry.createdAt)
        return `live: written since ${entry.operation} by ${entry.owner} began`;
    }
    if (
      registration &&
      registration.historical !== "disposable" &&
      run.mtimeMs < registration.registeredAt
    )
      return "historical: older than this root's registration, no disposition recorded";
    return null;
  }

  /**
   * Disposable run output. Measuring any directory is read-only and always
   * allowed (the gate needs the number). REMOVING is allowed only in an exact
   * registered output root, and never a run that is pinned anywhere inside,
   * overlaps a protected path, belongs to a live operation, or predates the
   * root's registration without a recorded disposition. Every keep condition
   * is evaluated again immediately before each removal.
   */
  function pruneOutputs(root, { apply = false } = {}) {
    const lexical = path.resolve(root);
    const base = real(lexical);
    const registration =
      (registry().outputRoots ?? []).find((entry) => entry.path === base) ??
      null;
    let lexicalIsLink = false;
    try {
      lexicalIsLink = lstatSync(lexical).isSymbolicLink();
    } catch {
      lexicalIsLink = false;
    }
    if (apply && (!registration || lexicalIsLink))
      throw new StorageRefusal(
        "unregistered-output-root",
        `Refused: ${lexical} is not an exact registered disposable output root${lexicalIsLink ? " (it is a symlink)" : ""}. Nothing was removed. Register it with \`storage output-root --path\` if it really is run output.`,
        { root: base },
      );
    let names = [];
    try {
      names = readdirSync(base);
    } catch {
      return {
        root: base,
        registered: Boolean(registration),
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
      const reason = keepReason(run, registration);
      const keepRecent = reason === null && recent < policy.outputKeepRecent;
      const fits =
        running + run.bytes <= policy.outputBudgetBytes &&
        totalBytes <= policy.outputBudgetBytes;
      if (reason !== null || keepRecent || fits) {
        if (keepRecent) recent += 1;
        running += run.bytes;
        kept.push({
          ...run,
          pinned: reason === "pinned",
          reason: reason ?? (keepRecent ? "recent" : "within budget"),
        });
        continue;
      }
      if (apply) {
        // Recheck at the moment of removal: a pin, a protection or a live
        // producer may have appeared since the listing above.
        const late = keepReason(run, registration);
        const still = real(run.path);
        if (late !== null || !isInside(still, base) || still === base) {
          kept.push({ ...run, pinned: late === "pinned", reason: late });
          continue;
        }
        rmSync(still, { recursive: true, force: false });
      }
      removed.push(run);
    }
    return {
      root: base,
      registered: Boolean(registration),
      totalBytes,
      kept,
      removed,
      overBudget: totalBytes > policy.outputBudgetBytes,
    };
  }

  /**
   * Retire only the named immediate children of a registered output root.
   * A recorded content manifest is the disposition for an older run; it does
   * not make any other historical run disposable. Validate the whole plan
   * before touching anything, then revalidate each run at removal time.
   */
  function retireOutputRuns(root, items, { apply = false } = {}) {
    const lexical = path.resolve(root);
    const base = real(lexical);
    const registration =
      (registry().outputRoots ?? []).find((entry) => entry.path === base) ??
      null;
    if (!registration || lstatSync(lexical).isSymbolicLink())
      throw new StorageRefusal(
        "unregistered-output-root",
        `Refused: ${lexical} is not an exact registered disposable output root. Nothing was removed.`,
      );
    if (!Array.isArray(items) || items.length === 0)
      throw new StorageRefusal(
        "empty-output-plan",
        "Refused: no output runs were named.",
      );

    const seen = new Set();
    const inspect = (item, checkDuplicate = true) => {
      const lexicalName = path.resolve(item.path);
      // macOS exposes /var as /private/var. Resolve the parent only, so a
      // symlinked child is still detectable rather than silently followed.
      const named = path.join(
        real(path.dirname(lexicalName)),
        path.basename(lexicalName),
      );
      if (
        path.dirname(named) !== base ||
        (checkDuplicate && seen.has(named)) ||
        !Array.isArray(item.expectedManifest)
      )
        throw new StorageRefusal(
          "invalid-output-plan",
          `Refused: ${named} is not one unique manifest-bound immediate run in ${base}.`,
        );
      const stats = lstatSync(named);
      if (
        !stats.isDirectory() ||
        stats.isSymbolicLink() ||
        real(named) !== named
      )
        throw new StorageRefusal(
          "invalid-output-run",
          `Refused: ${named} is not a real run directory.`,
        );
      const run = { path: named, mtimeMs: stats.mtimeMs };
      // The exact manifest is a deliberate disposition of this one historical
      // run. Pins, protections and live writers still take precedence.
      const reason = keepReason(run, {
        ...registration,
        historical: "disposable",
      });
      if (reason !== null)
        throw new StorageRefusal(
          "held-output-run",
          `Refused: ${named} is ${reason}.`,
        );
      const actual = contentManifest(named);
      if (
        actual === null ||
        JSON.stringify(actual) !== JSON.stringify(item.expectedManifest)
      )
        throw new StorageRefusal(
          "changed-output-run",
          `Refused: ${named} changed since its manifest was recorded.`,
        );
      const bytes = measure(named);
      if (item.expectedBytes !== undefined && bytes !== item.expectedBytes)
        throw new StorageRefusal(
          "changed-output-run",
          `Refused: ${named} changed size since its plan was recorded.`,
        );
      return { path: named, bytes };
    };
    const checked = items.map((item) => {
      const result = inspect(item);
      seen.add(result.path);
      return result;
    });
    if (!apply) return checked.map((entry) => ({ ...entry, removed: false }));
    return checked.map((entry, index) => {
      // A fresh check also catches a pin or producer that appeared after the
      // initial validation. Earlier removals never authorize later ones.
      inspect(items[index], false);
      rmSync(entry.path, { recursive: true, force: false });
      return { ...entry, removed: true };
    });
  }

  /** The gate an entry point calls: outputs bounded, then headroom reserved. */
  function gate({
    operation,
    target,
    owner,
    outputRoots = [],
    outputPaths = [],
    pid,
  }) {
    for (const root of outputRoots) {
      const report = pruneOutputs(root, { apply: false });
      if (report.overBudget)
        throw new StorageRefusal(
          "output-budget",
          `Refused ${operation}: ${report.root} holds ${formatBytes(report.totalBytes)} of disposable output, over its ${formatBytes(policy.outputBudgetBytes)} budget. Pin what must stay (.pin) and run \`npm run storage -- outputs --apply\`.`,
          { root: report.root, totalBytes: report.totalBytes },
        );
    }
    return reserve({ operation, target, owner, outputPaths, pid });
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
    releaseWorkspace,
    protect,
    registerOutputRoot,
    protectedList,
    retirementBlockers,
    retire,
    pruneOutputs,
    retireOutputRuns,
    gate,
  };
}

/**
 * The workstation limits are skipped on exactly one route: a GitHub-HOSTED
 * Actions runner, whose disk is created for the job and discarded after it.
 * `CI=true` alone proves nothing — anyone can export it on the owner's Mac,
 * and a self-hosted runner is somebody's real disk — so both of those stay
 * guarded.
 */
export function isEphemeralHost(env = process.env) {
  return (
    env.CI === "true" &&
    env.GITHUB_ACTIONS === "true" &&
    env.RUNNER_ENVIRONMENT === "github-hosted" &&
    env.OCD_STORAGE_ENFORCE_IN_CI !== "1"
  );
}

/** Is this process already running under a live managed reservation? */
function coveringReservation(guard, env = process.env) {
  const id = env.OCD_STORAGE_RESERVATION;
  if (!id) return null;
  return guard.liveReservations().find((entry) => entry.id === id) ?? null;
}

/**
 * For an entry point that IS the operation (Playwright, desktop stage and
 * package): refuse (exit 3), or reserve and hold until this process ends.
 * Under `runManaged` the wrapper already holds the headroom, verified against
 * the reservations file rather than trusted from the environment.
 * `OCD_STORAGE_OVERRIDE="reason"` records a deliberate bypass.
 */
export function gateEntryPoint({
  operation,
  target = process.cwd(),
  outputRoots = [],
  outputPaths = [],
  log = (line) => process.stderr.write(`${line}\n`),
}) {
  if (isEphemeralHost()) {
    log(
      `[storage-guard] ${operation}: GitHub-hosted runner — discarded disk, the workstation reserve does not apply.`,
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
  const covering = coveringReservation(guard);
  if (covering) {
    log(
      `[storage-guard] ${operation}: inside ${covering.operation} reservation ${covering.id} (${formatBytes(covering.bytes)} held by its wrapper).`,
    );
    return covering;
  }
  try {
    const reservation = guard.gate({
      operation,
      target,
      owner: process.env.OCD_WORKSPACE_OWNER ?? "unregistered",
      outputRoots,
      outputPaths,
    });
    // Children of this entry point (stage --rebuild runs the build) are
    // covered by this reservation instead of taking a second one.
    process.env.OCD_STORAGE_RESERVATION = reservation.id;
    process.on("exit", () => {
      try {
        guard.release(reservation.id);
      } catch {
        /* a dead holder's reservation is dropped by the next reader */
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

/**
 * MANAGED COMMAND: reservation → child → completion, error or signal →
 * release. The headroom stays reserved for as long as the child runs, so a
 * second operation is admitted against what is really left. Resolves to the
 * exit code the caller should use; it never throws for a refusal.
 *
 * This is admission control on an ESTIMATE, not a byte quota: nothing stops
 * the child writing more than was reserved. The reserve kept free, and the
 * output budget checked at the next gate, are what bound the damage.
 *
 * @returns {Promise<number>}
 */
export function runManaged({
  operation,
  command,
  args = [],
  target = process.cwd(),
  outputRoots = [],
  owner = process.env.OCD_WORKSPACE_OWNER ?? "unregistered",
  env = process.env,
  stdio = "inherit",
  log = (line) => process.stderr.write(`${line}\n`),
}) {
  return new Promise((resolve) => {
    // Register before gate() publishes the reservation. A caller may signal
    // the wrapper as soon as that reservation becomes visible to another
    // process, including before spawn() has returned.
    const signals = ["SIGINT", "SIGTERM", "SIGHUP"];
    let pendingSignal = null;
    let forward = (signal) => {
      pendingSignal ??= signal;
    };
    const handlers = Object.fromEntries(
      signals.map((signal) => [signal, () => forward(signal)]),
    );
    for (const signal of signals) process.on(signal, handlers[signal]);
    const removeHandlers = () => {
      for (const signal of signals) process.off(signal, handlers[signal]);
    };
    const launch = (reservation, guard) => {
      let released = false;
      const release = () => {
        if (released || !reservation) return;
        released = true;
        try {
          guard.release(reservation.id);
        } catch {
          /* a dead holder's reservation is dropped by the next reader */
        }
      };
      const settle = (code) => {
        removeHandlers();
        process.off("exit", release);
        release();
        resolve(code);
      };
      const child = spawn(command, args, {
        stdio,
        // `npm` is npm.cmd on Windows, which only a shell resolves.
        shell: process.platform === "win32",
        env: reservation
          ? { ...env, OCD_STORAGE_RESERVATION: reservation.id }
          : env,
      });
      forward = (signal) => child.kill(signal);
      process.on("exit", release);
      // A command that never started still gives its headroom back.
      child.on("error", (error) => {
        log(
          `[storage-guard] ${operation}: could not start ${command}: ${error.message}`,
        );
        settle(127);
      });
      child.on("close", (code, signal) =>
        settle(code ?? (signal ? 128 + (signalNumber(signal) ?? 0) : 1)),
      );
      if (pendingSignal) forward(pendingSignal);
    };

    if (isEphemeralHost(env)) {
      log(
        `[storage-guard] ${operation}: GitHub-hosted runner — discarded disk, the workstation reserve does not apply.`,
      );
      return launch(null, null);
    }
    if (env.OCD_STORAGE_OVERRIDE) {
      log(
        `[storage-guard] OVERRIDDEN for ${operation}: ${env.OCD_STORAGE_OVERRIDE}`,
      );
      return launch(null, null);
    }
    let guard;
    try {
      guard = createStorageGuard();
    } catch (error) {
      removeHandlers();
      throw error;
    }
    if (coveringReservation(guard, env)) return launch(null, null);
    let reservation;
    try {
      reservation = guard.gate({ operation, target, owner, outputRoots });
    } catch (error) {
      removeHandlers();
      if (!(error instanceof StorageRefusal)) throw error;
      log(`[storage-guard] ${error.message}`);
      return resolve(3);
    }
    log(
      `[storage-guard] ${operation}: holding ${formatBytes(reservation.bytes)} until the command ends; ${formatBytes(guard.policy.freeSpaceReserveBytes)} reserve kept free.`,
    );
    return launch(reservation, guard);
  });
}

function signalNumber(signal) {
  return { SIGHUP: 1, SIGINT: 2, SIGTERM: 15, SIGKILL: 9 }[signal];
}
