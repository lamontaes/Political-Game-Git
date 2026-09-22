/* global process, setTimeout, clearTimeout, fetch, URL, AbortController */
/**
 * Hosts the existing Art Desk bench for the hub's Art Desk tab.
 *
 * The bench and its request/review store belong to the Art Desk writer; this
 * host only prepares one hub-owned authoring worktree at an explicitly
 * selected owner-repository SHA, stages the private pack with the pack's own
 * installer, and runs the bench's identified loopback server
 * (scripts/dev-identified.mjs, which enables PG_LOCAL_REVIEW) on a free
 * 127.0.0.1 port. Nothing here sets DEV globally or exposes the bridge to a
 * production build. The authoring worktree is never reset or cleaned: local
 * reviews stay until they are handed to Git.
 *
 * Record-root seam (LAND, 2026-09-16): the hub reserves one project-scoped
 * Art Desk data root outside every worktree and hands the bench only its
 * stable path and a per-launch capability, as environment variables:
 *   PG_ART_DESK_RECORD_ROOT  absolute directory owned by the hub (0700)
 *   PG_ART_DESK_TOKEN        random per-launch token
 * Exchange-identity seam (X-A, 2026-09-17): when the hub has bound the
 * exchange to its configured Drive folder ids it also hands the bench the
 * resolved folders, so a renamed folder is still the right one:
 *   PG_ARTBENCH_EXCHANGE_INBOX / _CATALOG / _EVENTS  absolute folder paths
 * The bench writer owns whether its store prefers these over its own
 * name-based discovery under PG_ARTBENCH_DRIVE_ROOT.
 * The hub's Art Desk view sends that token on every bench request as the
 * X-OCD-Art-Desk-Token header. The bench writer owns the record schema and
 * decides when its bridge requires the header and uses the root.
 */

export const ART_DESK_TOKEN_HEADER = "X-OCD-Art-Desk-Token";
export const ART_DESK_PROJECT = "ocd";

import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import path from "node:path";

import { validBranchName, validRevision } from "./hub-model.mjs";

export function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function runQuiet(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (c) => {
      out += c;
      options.onLog?.(c);
    });
    child.stderr.on("data", (c) => {
      err = (err + c).slice(-4000);
      options.onLog?.(c);
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve(out.trim())
        : reject(
            new Error(
              `${options.label ?? command} failed (${code}). ${err.slice(-300)}`,
            ),
          ),
    );
  });
}

/**
 * Where a bench download (an original or edited raster, a brief or an edit
 * bundle the owner asked for) may land: only from the running bench origin,
 * only those file types, never outside the downloads folder.
 */
export function artDeskDownloadPath({
  filename,
  url,
  benchOrigin,
  downloadsDir,
}) {
  if (!benchOrigin) return null;
  const source = String(url ?? "");
  if (!source.startsWith(`${benchOrigin}/`) && !source.startsWith("blob:"))
    return null;
  if (source.startsWith("blob:") && !source.startsWith(`blob:${benchOrigin}/`))
    return null;
  const base = path.basename(String(filename ?? ""));
  // Rasters and archives, plus the text records the desk hands out: a
  // producer brief (.md) and an edit bundle manifest (.json).
  if (!/^[^/\\]+\.(png|jpe?g|webp|zip|md|json)$/i.test(base)) return null;
  const resolved = path.resolve(downloadsDir, base);
  if (!resolved.startsWith(path.resolve(downloadsDir) + path.sep)) return null;
  return resolved;
}

/**
 * Describe how the controller resolves the requested Art Desk revision.
 * Published branches are fetched on every start, even when a prepared shared
 * runtime already exists, so that the runtime record cannot pin the desk to an
 * older Git head. Local branches use the owner's checkout directly and rely on
 * Vite's file watcher for live edits.
 */
export function artDeskSourcePlan(source, branch) {
  const local = source === "local";
  return {
    fetch: !local,
    ref: `${local ? "refs/heads" : "refs/remotes/origin"}/${branch}^{commit}`,
  };
}

export class ArtDeskHost {
  constructor({ dataRoot, env, onStatus }) {
    this.root = path.join(dataRoot, "artdesk");
    this.recordRoot =
      env.PG_ARTBENCH_DATA_ROOT && path.isAbsolute(env.PG_ARTBENCH_DATA_ROOT)
        ? env.PG_ARTBENCH_DATA_ROOT
        : path.join(dataRoot, "art-records", ART_DESK_PROJECT);
    this.token = null;
    this.env = env;
    this.onStatus = onStatus ?? (() => {});
    this.child = null;
    this.url = null;
    this.status = { state: "idle", message: "Art Desk is not started." };
  }

  /**
   * The durable record root is the hub's, not whichever writer reaches it
   * first: it is created 0700 at hub start, the way the agents directory is,
   * so the bench never gets to make it world-readable. mkdirSync leaves an
   * existing directory's permissions alone, so a root some earlier writer
   * already created loosely is tightened here rather than trusted.
   */
  ensureRecordRoot() {
    mkdirSync(this.recordRoot, { recursive: true, mode: 0o700 });
    for (const directory of [path.dirname(this.recordRoot), this.recordRoot])
      if ((statSync(directory).mode & 0o777) !== 0o700)
        chmodSync(directory, 0o700);
    return this.recordRoot;
  }

  #set(state, message, extra = {}) {
    this.status = { state, message, ...extra };
    this.onStatus(this.status);
  }

  registeredRuntime(branch) {
    try {
      const record = JSON.parse(
        readFileSync(path.join(this.root, "ready-runtime.json"), "utf8"),
      );
      if (
        record.branch !== branch ||
        !validRevision(record.revision) ||
        record.worktree !== this.worktreeFor(branch)
      )
        return null;
      const lock = readFileSync(
        path.join(record.worktree, "package-lock.json"),
      );
      if (
        createHash("sha256").update(lock).digest("hex") !== record.lockHash ||
        !existsSync(path.join(record.worktree, "node_modules", "vite"))
      )
        return null;
      return record;
    } catch {
      return null;
    }
  }

  worktreeFor() {
    return path.join(this.root, "shared", "source");
  }

  legacyRuntimeWorktree() {
    try {
      const record = JSON.parse(
        readFileSync(path.join(this.root, "ready-runtime.json"), "utf8"),
      );
      const candidate = path.resolve(String(record.worktree ?? ""));
      const relative = path.relative(path.resolve(this.root), candidate);
      if (
        !validRevision(record.revision) ||
        !relative ||
        relative.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relative) ||
        path.basename(candidate) !== "source" ||
        candidate === this.worktreeFor() ||
        !existsSync(candidate)
      )
        return null;
      return candidate;
    } catch {
      return null;
    }
  }

  /**
   * Move the one older branch-named Art Desk checkout into the shared slot.
   * `git worktree move` updates Git's own registration while preserving the
   * installed dependencies and private staged inputs in place. Tracked edits
   * always stop the migration so another writer's work cannot be overwritten.
   */
  async adoptSharedRuntime(repositoryPath) {
    const shared = this.worktreeFor();
    if (existsSync(shared)) return null;
    const legacy = this.legacyRuntimeWorktree();
    if (!legacy) return null;
    const trackedChanges = await runQuiet(
      "/usr/bin/git",
      ["status", "--porcelain", "--untracked-files=no"],
      { cwd: legacy, env: this.env, label: "git status" },
    );
    if (trackedChanges)
      throw new Error(
        "The existing Art Desk workspace has tracked edits, so it was preserved in its current location. Commit or hand off those edits before moving it to the shared art-team workspace.",
      );

    const oldParent = path.dirname(legacy);
    const sharedParent = path.dirname(shared);
    mkdirSync(sharedParent, { recursive: true });
    await runQuiet("/usr/bin/git", ["worktree", "move", legacy, shared], {
      cwd: repositoryPath,
      env: this.env,
      label: "git worktree move",
    });
    for (const marker of [".ocd-hub-artdesk", ".ocd-hub-lock-sha"]) {
      const oldMarker = path.join(oldParent, marker);
      const sharedMarker = path.join(sharedParent, marker);
      if (existsSync(oldMarker) && !existsSync(sharedMarker))
        renameSync(oldMarker, sharedMarker);
    }
    try {
      rmdirSync(oldParent);
    } catch {
      // Leave an old folder alone if it contains anything besides our markers.
    }
    return { from: legacy, to: shared };
  }

  /**
   * Prepare and start the bench for `branch` at the exact `revision` the hub
   * resolved. An existing authoring worktree at another revision is kept as
   * is and reported, never moved underneath local reviews.
   */
  start(options) {
    // One start at a time: a tab click during background startup joins it.
    if (this.child) return Promise.resolve(this.status);
    if (!this.starting)
      this.starting = this.#start(options).finally(() => {
        this.starting = null;
      });
    return this.starting;
  }

  async #start({
    repositoryPath,
    branch,
    revision,
    packPath,
    driveRoot = null,
    exchangeFolders = null,
    localSource = false,
  }) {
    if (!validBranchName(branch) || !validRevision(revision))
      throw new Error(
        "Art Desk source must be a valid branch at an exact SHA.",
      );
    const worktree = localSource ? repositoryPath : this.worktreeFor();
    try {
      if (!localSource && !existsSync(worktree)) {
        this.#set("preparing", "Moving Art Desk into the shared workspace…");
        await this.adoptSharedRuntime(repositoryPath);
      }
      const git = (args, label) =>
        runQuiet("/usr/bin/git", args, {
          cwd: worktree,
          env: this.env,
          label,
        });
      if (localSource) {
        const current = await git(["rev-parse", "HEAD"], "git rev-parse");
        const dirty = await git(
          ["status", "--porcelain", "--untracked-files=no"],
          "git status",
        );
        if (current !== revision || dirty)
          throw new Error(
            "Local Art Bench requires the selected committed branch to be checked out with no tracked edits. Existing work is preserved.",
          );
      }
      const creatingWorkspace = !existsSync(worktree);
      if (creatingWorkspace) {
        this.#set(
          "preparing",
          `Creating the Art Desk workspace at ${revision.slice(0, 12)}…`,
        );
        mkdirSync(path.dirname(worktree), { recursive: true });
        writeFileSync(
          path.join(path.dirname(worktree), ".ocd-hub-artdesk"),
          `${branch}\n`,
        );
        await runQuiet(
          "/usr/bin/git",
          ["worktree", "add", "--detach", worktree, revision],
          { cwd: repositoryPath, env: this.env, label: "git worktree add" },
        );
      }
      if (!localSource) {
        writeFileSync(
          path.join(path.dirname(worktree), ".ocd-hub-artdesk"),
          `${branch}\n`,
        );
      }
      const head = await git(["rev-parse", "HEAD"], "git rev-parse");
      const trackedChanges = await git(
        ["status", "--porcelain", "--untracked-files=no"],
        "git status",
      );
      let sourceNote = null;
      if (head !== revision) {
        if (trackedChanges) {
          sourceNote = `Newer source ${revision.slice(0, 12)} is available; this workspace stays at ${head.slice(0, 12)} because it holds unsaved Art Desk records.`;
        } else {
          this.#set(
            "preparing",
            `Moving the Art Desk workspace to ${revision.slice(0, 12)}…`,
          );
          await git(["checkout", "--detach", revision], "git checkout");
        }
      }
      const activeHead = await git(["rev-parse", "HEAD"], "git rev-parse");
      if (!localSource && creatingWorkspace) {
        this.#set("preparing", "Staging private art inputs for the Art Desk…");
        await runQuiet(
          "/bin/sh",
          [path.join(packPath, "stage-into-worktree.sh"), worktree],
          {
            env: this.env,
            label: "private pack installer",
          },
        );
      }
      // Reinstall when the source's lockfile differs from the installed one.
      const lockFile = path.join(worktree, "package-lock.json");
      const lockHash = existsSync(lockFile)
        ? createHash("sha256").update(readFileSync(lockFile)).digest("hex")
        : "none";
      const lockMarker = path.join(path.dirname(worktree), ".ocd-hub-lock-sha");
      const installedLock = existsSync(lockMarker)
        ? readFileSync(lockMarker, "utf8").trim()
        : null;
      if (
        !existsSync(path.join(worktree, "node_modules", "vite")) ||
        (!localSource && installedLock !== lockHash)
      ) {
        this.#set(
          "preparing",
          "Installing the Art Desk's pinned dependencies…",
        );
        await runQuiet(
          "/usr/bin/env",
          ["npm", "ci", "--no-audit", "--no-fund"],
          {
            cwd: worktree,
            env: this.env,
            label: "npm ci",
          },
        );
        writeFileSync(lockMarker, `${lockHash}\n`);
      }
      this.ensureRecordRoot();
      this.token = randomBytes(32).toString("base64url");
      const port = await freePort();
      this.#set("starting", "Starting the identified Art Desk server…");
      const child = spawn(
        "/usr/bin/env",
        [
          "node",
          "scripts/dev-identified.mjs",
          "--host",
          "127.0.0.1",
          "--port",
          String(port),
        ],
        {
          cwd: worktree,
          env: {
            ...this.env,
            PG_PRIVATE_ART_PACK: packPath,
            PG_ART_DESK_RECORD_ROOT: this.recordRoot,
            PG_ART_DESK_TOKEN: this.token,
            ...(driveRoot ? { PG_ARTBENCH_DRIVE_ROOT: driveRoot } : {}),
            ...(exchangeFolders
              ? {
                  PG_ARTBENCH_EXCHANGE_INBOX: exchangeFolders.inbox,
                  PG_ARTBENCH_EXCHANGE_CATALOG: exchangeFolders.catalog,
                  PG_ARTBENCH_EXCHANGE_EVENTS: exchangeFolders.events,
                }
              : {}),
            BROWSER: "none",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      this.child = child;
      let tail = "";
      const keep = (chunk) => {
        tail = (tail + chunk).slice(-3000);
      };
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", keep);
      child.stderr.on("data", keep);
      child.on("exit", (code, signal) => {
        this.child = null;
        this.url = null;
        this.#set(
          "stopped",
          `Art Desk server stopped (${signal ?? `exit ${code}`}).`,
          { tail: tail.slice(-600) },
        );
      });
      const base = `http://127.0.0.1:${port}`;
      const identity = await this.#waitReady(base, 120000);
      mkdirSync(this.root, { recursive: true, mode: 0o700 });
      writeFileSync(
        path.join(this.root, "ready-runtime.json"),
        JSON.stringify({ branch, revision: activeHead, worktree, lockHash }) +
          "\n",
        { mode: 0o600 },
      );
      this.url = `${base}/art-desk.html`;
      this.#set("ready", "Art Desk ready.", {
        url: this.url,
        branch,
        revision: activeHead,
        requestedRevision: revision,
        sourceNote,
        identity,
        worktree,
        packPath,
        recordRoot: this.recordRoot,
      });
      return this.status;
    } catch (error) {
      this.stop();
      this.#set(
        "failed",
        error instanceof Error ? error.message : String(error),
      );
      return this.status;
    }
  }

  async #waitReady(base, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!this.child)
        throw new Error("The Art Desk server exited during startup.");
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(new URL("/__dev/identity", base), {
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (response.ok) return await response.json().catch(() => ({}));
      } catch {
        /* not up yet */
      }
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
    throw new Error("The Art Desk server did not become ready.");
  }

  /** Receipt of private inputs as the bench itself reports them. */
  async inputs() {
    if (!this.url) return null;
    try {
      const response = await fetch(new URL("/__dev/art-desk/inputs", this.url));
      return response.ok ? await response.json() : { status: response.status };
    } catch (error) {
      return { error: String(error) };
    }
  }

  stop() {
    if (this.child) this.child.kill("SIGTERM");
  }
}
